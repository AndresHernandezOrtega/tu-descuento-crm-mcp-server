import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import { ok, mapApiError, applyLimit } from '@tools/tool-result.js'

const inputSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de membresías a devolver (opcional). Si se omite, se devuelven todas.'),
}

const outputSchema = {
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
      inputSchema,
      outputSchema,
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
