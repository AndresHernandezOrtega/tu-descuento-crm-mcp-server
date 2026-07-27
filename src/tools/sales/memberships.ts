import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import { ok, fail, mapApiError, applyLimit } from '@tools/tool-result.js'

const publicInputSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de membresías a devolver (opcional). Si se omite, se devuelven todas.'),
}

const publicOutputSchema = {
  memberships: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

export function registerGetPublicMemberships(server: McpServer): void {
  server.registerTool(
    'get_public_memberships',
    {
      title: 'Listar membresías públicas',
      description:
        'Obtiene las membresías públicas disponibles para venta en Tu Descuento Colombia ' +
        '(precios, duración, beneficiarios, categorías). ' +
        'Usa el ID de cada membresía con get_membership_discounts para ver descuentos incluidos.',
      inputSchema: publicInputSchema,
      outputSchema: publicOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ limit }) => {
      const service = new MembershipService()
      const result = await service.getPublicMemberships()

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudieron obtener las membresías públicas')
      }

      const all = result.data.memberships
      const { items, total, truncated } = applyLimit(all, limit)

      const lines = items.map((m, i) => {
        return (
          `${i + 1}. ${m.nombre} (ID: ${m.id}) — $${m.precio_membresia.toLocaleString('es-CO')} / ` +
          `${m.meses_duracion} meses / ${m.numero_beneficiarios} beneficiario(s)`
        )
      })

      const summary =
        `Membresías públicas: ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` + lines.join('\n')

      return ok({ memberships: items, total, truncated }, summary)
    },
  )
}

const discountsInputSchema = {
  membership_id: z
    .number()
    .int()
    .positive()
    .describe('ID de la membresía (obtenerlo antes con get_public_memberships). Ejemplo: 1'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de descuentos a devolver (opcional).'),
}

const discountsOutputSchema = {
  membership_id: z.number(),
  discounts: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

export function registerGetMembershipDiscounts(server: McpServer): void {
  server.registerTool(
    'get_membership_discounts',
    {
      title: 'Descuentos de una membresía',
      description:
        'Obtiene los descuentos incluidos en una membresía específica. ' +
        'IMPORTANTE — tipos según "tipo_beneficio": ' +
        '"PORCENTAJE" usa el campo "porcentaje"; "VALOR_FIJO" usa el campo "valor_fijo" (precio fijo). ' +
        'Primero obtén el membership_id con get_public_memberships. ' +
        'Para detalle de un comercio, usa get_allied_commerce con el ID del comercio aliado del descuento.',
      inputSchema: discountsInputSchema,
      outputSchema: discountsOutputSchema,
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

      const lines = items.slice(0, 15).map((d, i) => {
        let benefit: string = d.tipo_beneficio
        if (d.tipo_beneficio === 'PORCENTAJE' && d.porcentaje != null) {
          benefit = `${d.porcentaje}%`
        } else if (d.tipo_beneficio === 'VALOR_FIJO' && d.valor_fijo != null) {
          benefit = `$${d.valor_fijo.toLocaleString('es-CO')}`
        }
        return `${i + 1}. ${d.nombre} — ${d.allied_commerce.razon_social} (${benefit})`
      })

      const summary =
        `Descuentos membresía ${membership_id}: ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` +
        lines.join('\n') +
        (total > 15 ? `\n… y ${total - 15} más en structuredContent` : '')

      return ok({ membership_id, discounts: items, total, truncated }, summary)
    },
  )
}
