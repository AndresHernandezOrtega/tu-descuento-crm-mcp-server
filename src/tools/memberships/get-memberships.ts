import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import { ok, mapApiError, applyLimit, rejectUnknownArgs } from '@tools/tool-result.js'

const COVERAGE_HINT =
  'Este tool no filtra por texto ni por ciudad. Los municipios están en el resource tudescuento://forms/client-creation. ' +
  'Para sucursales usa search_allied_commerces y get_commerce_branches.'

const inputSchema = {
  scope: z
    .enum(['public', 'all'])
    .optional()
    .describe(
      'Alcance del listado. "public" (default): solo membresías abiertas a venta al público ' +
        '(GET /memberships/public). "all": todas las membresías incluyendo planes internos ' +
        'con is_venta_publico=false (GET /memberships). ' +
        'Para el inventario de descuentos de un plan concreto usa get_membership_discounts (M2M directo); ' +
        'no confíes en categories[].discounts anidados en scope="all" (puede estar vacío o desactualizado).',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de membresías a devolver (opcional). Si se omite, se devuelven todas.'),
  query: z
    .unknown()
    .optional()
    .describe('NO ENVIAR. Este tool no busca por texto. Si se envía, responde UNKNOWN_TOOL_ARGS.'),
  city: z
    .unknown()
    .optional()
    .describe(
      'NO ENVIAR. No existe filtro city. Si se envía, responde UNKNOWN_TOOL_ARGS. ' +
        'Municipios: resource tudescuento://forms/client-creation. Sucursales: get_commerce_branches.',
    ),
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
        'El catálogo de descuentos por plan se obtiene con get_membership_discounts, no desde categorías anidadas. ' +
        'No filtra por query ni por city: esos argumentos se rechazan con UNKNOWN_TOOL_ARGS. ' +
        'La cobertura por municipio usa el resource tudescuento://forms/client-creation y get_commerce_branches.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ scope, limit, query, city }) => {
      const rejected = rejectUnknownArgs({ query, city }, COVERAGE_HINT)
      if (rejected) return rejected

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
        `Membresías (${scopeLabel}): ${items.length} de ${total}${truncated ? ' (truncado)' : ''}. Sin filtro por ciudad.\n` +
        lines.join('\n')

      return ok({ memberships: items, total, truncated, scope: resolvedScope }, summary)
    },
  )
}
