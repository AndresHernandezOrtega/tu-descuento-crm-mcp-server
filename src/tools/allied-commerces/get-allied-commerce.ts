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
  code: z.string().optional(),
  razon_social: z.string().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  direccion_domicilio_principal: z.string().nullable().optional(),
  descripcion: z.string().nullable().optional(),
  discounts: z.array(z.unknown()).optional(),
}

export function registerGetAlliedCommerce(server: McpServer): void {
  server.registerTool(
    'get_allied_commerce',
    {
      title: 'Detalle de comercio aliado',
      description:
        'Obtiene información detallada de un comercio aliado (marca/empresa) que ofrece descuentos: ' +
        'código, razón social, teléfono, email, dirección, descripción y descuentos. ' +
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
      const filtered = {
        code: commerce.code,
        razon_social: commerce.razon_social,
        telefono: commerce.telefono,
        email: commerce.email,
        direccion_domicilio_principal: commerce.direccion_domicilio_principal,
        descripcion: commerce.descripcion,
        discounts: commerce.discounts,
      }

      const discountCount = commerce.discounts?.length ?? 0
      const summary =
        `${commerce.razon_social} (${commerce.code})\n` +
        `Tel: ${commerce.telefono ?? 'N/A'} | Email: ${commerce.email ?? 'N/A'}\n` +
        `Dirección: ${commerce.direccion_domicilio_principal ?? 'N/A'}\n` +
        `Descuentos: ${discountCount}`

      return ok(filtered, summary)
    },
  )
}
