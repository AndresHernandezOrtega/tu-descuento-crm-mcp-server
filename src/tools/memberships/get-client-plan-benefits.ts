import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import type { MembershipDiscount } from '@/types/index.js'
import { loadClient, noActiveMembership, readCurrentContract, readMembership } from '@tools/costumers/client-record.js'
import { formatDiscountBenefit, truncateRedemption } from '@tools/discounts/discount-format.js'
import { applyLimit, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento del cliente, sin puntos ni espacios. Ejemplo: 1234567890'),
  limit: z.number().int().positive().optional().describe('Máximo de descuentos a devolver (opcional).'),
}

const outputSchema = {
  numero_identificacion: z.string(),
  membership_id: z.number(),
  membership_nombre: z.string().nullable(),
  discounts: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

function withoutAplicable(discount: MembershipDiscount): Record<string, unknown> {
  const copy = { ...(discount as unknown as Record<string, unknown>) }
  delete copy.descuento_aplicable
  return copy
}

export function registerGetClientPlanBenefits(server: McpServer): void {
  server.registerTool(
    'get_client_plan_benefits',
    {
      title: 'Beneficios del plan vigente',
      description:
        'Descuentos del plan vigente del cliente. Resuelve el documento con GET /clients/by_identification/{dni} ' +
        'y luego GET /memberships/{id}/discounts (relación M2M). No uses descuento_aplicable. ' +
        'Sin contrato vigente: NO_ACTIVE_MEMBERSHIP. Un descuento concreto sigue en search_discounts o get_membership_discounts. ' +
        'No crea contratos ni cobra.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion, limit }) => {
      const loaded = await loadClient(numero_identificacion)
      if (!loaded.ok) return loaded.error

      const contract = readCurrentContract(loaded.client)
      if (!contract) return noActiveMembership()
      const membership = readMembership(contract)
      if (membership.id == null) return noActiveMembership()

      const service = new MembershipService()
      const result = await service.getMembershipDiscounts(membership.id)
      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener los beneficios del plan ${membership.id}`)
      }

      const all = (result.data.discounts ?? []).map(withoutAplicable)
      const { items, total, truncated } = applyLimit(all, limit)
      const dni =
        typeof loaded.client.numero_identificacion === 'string'
          ? loaded.client.numero_identificacion
          : numero_identificacion.trim()

      const lines = items.slice(0, 12).map((discount, index) => {
        const typed = discount as unknown as MembershipDiscount
        const commerce = typed.allied_commerce?.razon_social ?? 'comercio'
        const redemption = truncateRedemption(typed.descripcion_redencion)
        return `${index + 1}. ${typed.nombre} — ${commerce} (${formatDiscountBenefit(typed)})${redemption ? ` — ${redemption}` : ''}`
      })

      const summary =
        `Beneficios de ${membership.nombre ?? 'plan'} (ID ${membership.id}) para ${dni}: ${items.length} de ${total}` +
        `${truncated ? ' (truncado)' : ''}\n` +
        (lines.length ? lines.join('\n') : 'El plan no tiene descuentos M2M.') +
        (total > 12 ? `\n… y ${total - 12} más en structuredContent` : '')

      return ok(
        {
          numero_identificacion: dni,
          membership_id: membership.id,
          membership_nombre: membership.nombre,
          discounts: items,
          total,
          truncated,
        },
        summary,
      )
    },
  )
}
