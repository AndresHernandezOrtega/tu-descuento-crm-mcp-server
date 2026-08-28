import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CategoriesService } from '@services/categories-service.js'
import { ok, mapApiError, applyLimit } from '@tools/tool-result.js'

const inputSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Máximo de categorías a devolver (opcional). Si se omite, se devuelven todas.'),
}

const outputSchema = {
  categories: z.array(z.unknown()),
  total: z.number(),
  truncated: z.boolean(),
}

export function registerGetCategories(server: McpServer): void {
  server.registerTool(
    'get_categories',
    {
      title: 'Listar categorías de descuentos',
      description:
        'Obtiene las categorías de descuentos disponibles en Tu Descuento Colombia. ' +
        'Usa los IDs retornados con get_allied_commerces_by_category para explorar comercios por categoría.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ limit }) => {
      const service = new CategoriesService()
      const result = await service.getCategories()

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudieron obtener las categorías')
      }

      const raw = Array.isArray(result.data)
        ? result.data
        : ((result.data as { categories?: unknown[] }).categories ?? [result.data])

      const { items, total, truncated } = applyLimit(raw as unknown[], limit)
      const preview = items
        .slice(0, 10)
        .map((c, i) => {
          const cat = c as { id?: number; name?: string }
          return `${i + 1}. ${cat.name ?? 'N/A'} (ID: ${cat.id ?? '?'})`
        })
        .join('\n')

      const summary =
        `Categorías: ${items.length} de ${total}${truncated ? ' (truncado)' : ''}\n` +
        (preview || '(sin resultados)') +
        (total > 10 ? `\n… y ${total - 10} más en structuredContent` : '')

      return ok({ categories: items, total, truncated }, summary)
    },
  )
}
