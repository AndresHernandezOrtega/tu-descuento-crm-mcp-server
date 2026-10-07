import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AlliedCommerceService } from '@services/allied-commerce-service.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
  allied_commerce_id: z
    .number()
    .int()
    .positive()
    .describe(
      'ID del comercio aliado. Obtenerlo de get_membership_discounts (allied_commerce) o get_allied_commerces_by_category. Ejemplo: 12',
    ),
}

const outputSchema = {
  id: z.number(),
  code: z.string().optional(),
  razon_social: z.string().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  direccion_domicilio_principal: z.string().nullable().optional(),
  descripcion: z.string().nullable().optional(),
  profile_img: z.string().nullable().optional(),
  discounts: z.array(z.unknown()).optional(),
  branches: z.array(z.unknown()).optional(),
}

export function registerGetAlliedCommerce(server: McpServer): void {
  server.registerTool(
    'get_allied_commerce',
    {
      title: 'Detalle de comercio aliado',
      description:
        'Obtiene información detallada de un comercio aliado (marca/empresa) que ofrece descuentos: ' +
        'razón social, contacto, dirección, descripción, descuentos y sucursales. ' +
        'Los descuentos anidados pueden ser resumen (id, nombre, activo) o detalle según el CRM. ' +
        'Para saber qué planes/membresías cubren un descuento, revisa memberships en search_discounts ' +
        'o usa get_membership_discounts por plan. ' +
        'Para obtener el allied_commerce_id usa get_membership_discounts o get_allied_commerces_by_category.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ allied_commerce_id }) => {
      if (!allied_commerce_id) {
        return fail('VALIDATION_ERROR', 'allied_commerce_id es requerido y debe ser un número positivo')
      }

      const service = new AlliedCommerceService()
      const result = await service.getAlliedCommerceById(allied_commerce_id)

      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudo obtener el comercio aliado ${allied_commerce_id}`)
      }

      const commerce = result.data.alliedCommerce
      if (!commerce) {
        return fail('NOT_FOUND', `El comercio aliado ${allied_commerce_id} no existe`)
      }

      // No exponer api_token al agente
      const filtered = {
        id: commerce.id,
        code: commerce.code,
        razon_social: commerce.razon_social,
        telefono: commerce.telefono ?? null,
        email: commerce.email ?? null,
        direccion_domicilio_principal: commerce.direccion_domicilio_principal ?? null,
        descripcion: commerce.descripcion ?? null,
        profile_img: commerce.profile_img ?? null,
        discounts: commerce.discounts ?? [],
        branches: commerce.branches ?? [],
      }

      const discountCount = filtered.discounts.length
      const branchCount = filtered.branches.length
      const label = commerce.razon_social ?? `Comercio #${commerce.id}`
      const codePart = commerce.code ? ` (${commerce.code})` : ''
      const summary =
        `${label}${codePart}\n` +
        `Tel: ${filtered.telefono ?? 'N/A'} | Email: ${filtered.email ?? 'N/A'}\n` +
        `Dirección: ${filtered.direccion_domicilio_principal ?? 'N/A'}\n` +
        `Descuentos: ${discountCount} | Sucursales: ${branchCount}`

      return ok(filtered, summary)
    },
  )
}
