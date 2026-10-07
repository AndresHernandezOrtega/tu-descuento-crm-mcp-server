import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import type { MembershipDiscount } from '@/types/index.js'
import { ok, fail, mapApiError, applyLimit } from '@tools/tool-result.js'
import { formatDiscountBenefit, truncateRedemption } from '@tools/discounts/discount-format.js'

const inputSchema = {
  membership_id: z
    .number()
    .int()
    .positive()
    .describe('ID de la membresía (obtenerlo antes con get_memberships). Ejemplo: 1'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de descuentos a devolver (opcional).'),
}

const outputSchema = {
  membership_id: z.number(),
  discounts: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

function formatMembershipDiscountLine(d: MembershipDiscount, index: number): string {
  const benefit = formatDiscountBenefit(d)
  const redemption = truncateRedemption(d.descripcion_redencion)
  const commerce = d.allied_commerce?.razon_social ?? 'comercio'
  const redemptionPart = redemption ? ` — ${redemption}` : ''
  return `${index + 1}. ${d.nombre} — ${commerce} (${benefit})${redemptionPart}`
}

export function registerGetMembershipDiscounts(server: McpServer): void {
  server.registerTool(
    'get_membership_discounts',
    {
      title: 'Descuentos de una membresía',
      description:
        'Obtiene los descuentos incluidos en una membresía vía relación directa M2M (discounts_memberships). ' +
        'Ya no deriva descuentos por categorías. ' +
        'IMPORTANTE — tipo_beneficio: "PORCENTAJE" usa porcentaje; "PORCENTAJE_VALOR_FIJO" usa porcentaje y valor_fijo. ' +
        'Incluye descripcion_redencion (instrucciones para redimir en el comercio). ' +
        'Primero obtén membership_id con get_memberships. ' +
        'Para detalle del comercio usa get_allied_commerce con allied_commerce.id del descuento.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ membership_id, limit }) => {
      if (!membership_id) {
        return fail('VALIDATION_ERROR', 'membership_id es requerido y debe ser un número positivo')
      }

      const service = new MembershipService()
      const result = await service.getMembershipDiscounts(membership_id)

      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener los descuentos de la membresía ${membership_id}`)
      }

      const all = result.data.discounts
      const { items, total, truncated } = applyLimit(all, limit)

      const lines = items.slice(0, 15).map((d, i) => formatMembershipDiscountLine(d, i))

      const summary =
        `Descuentos membresía ${membership_id} (M2M directo): ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` +
        lines.join('\n') +
        (total > 15 ? `\n… y ${total - 15} más en structuredContent` : '')

      return ok({ membership_id, discounts: items, total, truncated }, summary)
    },
  )
}
