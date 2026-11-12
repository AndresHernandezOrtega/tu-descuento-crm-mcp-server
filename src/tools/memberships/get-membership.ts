import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipService } from '@services/membership-service.js'
import type { Membership } from '@/types/index.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  membership_id: z
    .number()
    .int()
    .positive()
    .describe('ID del plan. Obtenlo con get_memberships o get_client_membership_status. Ejemplo: 2'),
}

const outputSchema = {
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  meses_duracion: z.number().nullable(),
  numero_beneficiarios: z.number().nullable(),
  precio_membresia: z.number().nullable(),
  porcentaje_impuesto: z.number().nullable(),
  valor_impuesto: z.number().nullable(),
  valor_final: z.number().nullable(),
  is_venta_publico: z.boolean().nullable(),
  categorias: z.array(z.string()),
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function slimMembership(membership: Membership) {
  const categorias = Array.isArray(membership.categories)
    ? membership.categories
        .map((category) => category.name)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    : []

  return {
    id: membership.id,
    nombre: membership.nombre,
    descripcion: membership.descripcion ?? null,
    meses_duracion: asNumber(membership.meses_duracion),
    numero_beneficiarios: asNumber(membership.numero_beneficiarios),
    precio_membresia: asNumber(membership.precio_membresia),
    porcentaje_impuesto: asNumber(membership.porcentaje_impuesto),
    valor_impuesto: asNumber(membership.valor_impuesto),
    valor_final: asNumber(membership.valor_final),
    is_venta_publico: typeof membership.is_venta_publico === 'boolean' ? membership.is_venta_publico : null,
    categorias,
  }
}

export function registerGetMembership(server: McpServer): void {
  server.registerTool(
    'get_membership',
    {
      title: 'Detalle de un plan',
      description:
        'Detalle de una membresía por id (GET /memberships/{membership_id}): precio, duración, beneficiarios e impuesto. ' +
        'No incluye el catálogo de descuentos; para eso usa get_membership_discounts. ' +
        'Solo lectura: no crea, actualiza ni elimina planes, ni inicia un pago.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ membership_id }) => {
      if (!membership_id) {
        return fail('VALIDATION_ERROR', 'membership_id es requerido y debe ser un número positivo')
      }

      const service = new MembershipService()
      const result = await service.getMembership(membership_id)
      if (!result.success || !result.data?.membership) {
        return mapApiError(result.error, `No se encontró la membresía ${membership_id}`)
      }

      const membership = slimMembership(result.data.membership)
      const price = membership.valor_final ?? membership.precio_membresia
      const summary =
        `${membership.nombre} (ID ${membership.id})\n` +
        `Precio final: ${price != null ? `$${price.toLocaleString('es-CO')}` : 'N/A'} ` +
        `(base ${membership.precio_membresia ?? 'N/A'}, impuesto ${membership.valor_impuesto ?? 'N/A'} / ${membership.porcentaje_impuesto ?? 'N/A'}%)\n` +
        `Duración: ${membership.meses_duracion ?? '?'} meses | Beneficiarios: ${membership.numero_beneficiarios ?? '?'}`

      return ok(membership, summary)
    },
  )
}
