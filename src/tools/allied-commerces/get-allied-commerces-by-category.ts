import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CategoriesService } from '@services/categories-service.js'
import { ok, fail, mapApiError, applyLimit } from '@tools/tool-result.js'

const inputSchema = {
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

const outputSchema = {
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
        'Obtiene los comercios aliados que ofrecen descuentos en una categoría (rubro: restaurantes, salud, etc.). ' +
        'La categoría clasifica comercios/descuentos; no indica qué membresía cubre un beneficio — ' +
        'para eso usa get_membership_discounts con el membership_id del cliente. ' +
        'Primero obtén el category_id con get_categories. Para detalle de un comercio usa get_allied_commerce.',
      inputSchema,
      outputSchema,
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
