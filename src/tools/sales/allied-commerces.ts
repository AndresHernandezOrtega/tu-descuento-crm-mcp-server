import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AlliedCommerceService } from '@services/allied-commerce-service.js'
import { CategoriesService } from '@services/categories-service.js'
import { ok, fail, mapApiError, applyLimit } from '@tools/tool-result.js'

const commerceInputSchema = {
  allied_commerce_id: z
    .number()
    .int()
    .positive()
    .describe(
      'ID del comercio aliado. Obtenerlo de get_membership_discounts (allied_commerce) o get_allied_commerces_by_category. Ejemplo: 12',
    ),
}

const commerceOutputSchema = {
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
      inputSchema: commerceInputSchema,
      outputSchema: commerceOutputSchema,
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

const byCategoryInputSchema = {
  category_id: z
    .number()
    .int()
    .positive()
    .describe('ID de la categoría (obtenerlo con get_categories). Ejemplo: 3'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de comercios a devolver (opcional).'),
}

const byCategoryOutputSchema = {
  category: z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    descripcion: z.string().optional(),
  }),
  allied_commerces: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

export function registerGetAlliedCommercesByCategory(server: McpServer): void {
  server.registerTool(
    'get_allied_commerces_by_category',
    {
      title: 'Comercios aliados por categoría',
      description:
        'Obtiene los comercios aliados que ofrecen descuentos en una categoría específica. ' +
        'Útil cuando el cliente busca descuentos en un rubro (restaurantes, salud, etc.). ' +
        'Primero obtén el category_id con get_categories. Para detalle de un comercio usa get_allied_commerce.',
      inputSchema: byCategoryInputSchema,
      outputSchema: byCategoryOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ category_id, limit }) => {
      if (!category_id) {
        return fail('VALIDATION_ERROR', 'category_id es requerido y debe ser un número positivo')
      }

      const service = new CategoriesService()
      const result = await service.getAlliedCommercesByCategory(category_id)

      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener comercios de la categoría ${category_id}`)
      }

      const category = result.data.category
      const { items, total, truncated } = applyLimit(category.allied_commerces, limit)

      const lines = items.slice(0, 12).map((c, i) => {
        return `${i + 1}. ${c.razon_social} (ID: ${c.id}) — ${c.discounts?.length ?? 0} descuento(s)`
      })

      const summary =
        `Categoría: ${category.name}\n` +
        `Comercios: ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` +
        lines.join('\n') +
        (total > 12 ? `\n… y ${total - 12} más en structuredContent` : '')

      return ok(
        {
          category: { id: category.id, name: category.name, descripcion: category.descripcion },
          allied_commerces: items,
          total,
          truncated,
        },
        summary,
      )
    },
  )
}
