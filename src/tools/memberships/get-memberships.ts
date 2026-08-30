import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import { ok, mapApiError, applyLimit } from '@tools/tool-result.js'

const inputSchema = {
  scope: z
    .enum(['public', 'all'])
    .optional()
    .describe(
      'Alcance del listado. "public" (default): solo membresías abiertas a venta al público ' +
        '(GET /memberships/public). "all": todas las membresías incluyendo planes internos ' +
        'con is_venta_publico=false (GET /memberships; respuesta más pesada con discounts anidados).',
    ),
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
  scope: z.enum(['public', 'all']),
}

export function registerGetMemberships(server: McpServer): void {
  server.registerTool(
    'get_memberships',
    {
      title: 'Listar membresías',
      description:
        'Lista membresías de Tu Descuento Colombia (precios, impuestos, duración, beneficiarios, categorías). ' +
        'Por defecto scope="public": solo planes en venta al público. ' +
        'Usa scope="all" cuando necesites también membresías internas (is_venta_publico=false) o el catálogo completo. ' +
        'Con scope="all" el CRM anida discounts en categorías; para descuentos detallados de un plan concreto ' +
        'prefiere get_membership_discounts con el membership_id.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ scope, limit }) => {
      const resolvedScope = scope ?? 'public'
      const service = new MembershipService()
      const result =
        resolvedScope === 'all' ? await service.getMemberships() : await service.getPublicMemberships()

      if (!result.success || !result.data) {
        const label =
          resolvedScope === 'all' ? 'todas las membresías' : 'las membresías públicas'
        return mapApiError(result.error, `No se pudieron obtener ${label}`)
      }

      const all = result.data.memberships
      const { items, total, truncated } = applyLimit(all, limit)

      const lines = items.map((m, i) => {
        const publicFlag =
          resolvedScope === 'all' ? ` / venta_publico=${m.is_venta_publico ? 'sí' : 'no'}` : ''
        return (
          `${i + 1}. ${m.nombre} (ID: ${m.id}) — $${m.precio_membresia.toLocaleString('es-CO')} / ` +
          `${m.meses_duracion} meses / ${m.numero_beneficiarios} beneficiario(s)${publicFlag}`
        )
      })

      const scopeLabel = resolvedScope === 'all' ? 'todas' : 'públicas'
      const summary =
        `Membresías (${scopeLabel}): ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` +
        lines.join('\n')

      return ok({ memberships: items, total, truncated, scope: resolvedScope }, summary)
    },
  )
}
