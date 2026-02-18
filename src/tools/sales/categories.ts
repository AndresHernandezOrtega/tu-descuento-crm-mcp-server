import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CategoriesService } from '@services/categories-service.js'

/**
 * Tool para obtener las categorías de descuentos disponibles
 */
export const getCategorieseTool: Tool = {
  name: 'get_categories',
  description: 'Obtiene todas las categorías de descuentos disponibles en Tu Descuento Colombia',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

/**
 * Handler para ejecutar la obtención de categorías
 */
export async function handleGetCategories() {
  const categoriesService = new CategoriesService()
  const result = await categoriesService.getCategories()

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || 'No se pudieron obtener las categorías',
        },
      ],
      isError: true,
    }
  }

  // Devolver la lista de categorías en formato legible
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  }
}
