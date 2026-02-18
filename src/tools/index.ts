import type { Tool, CallToolRequest } from '@modelcontextprotocol/sdk/types.js'
import { getCostumerByIdentificationTool, handleGetCostumerByIdentification } from '@tools/costumers/costumer-information.js'
import { getCategorieseTool, handleGetCategories } from '@tools/sales/categories.js'
import { getPublicMembershipsTool, handleGetPublicMemberships, getMembershipDiscountsTool, handleGetMembershipDiscounts } from '@tools/sales/memberships.js'
import { getAlliedCommerceTool, handleGetAlliedCommerce, getAlliedCommercesByCategoryTool, handleGetAlliedCommercesByCategory } from '@tools/sales/allied-commerces.js'

/**
 * TOOLS DEL SERVIDOR MCP
 *
 * Aquí se definen todos los tools (herramientas) disponibles para el agente de IA.
 * Cada tool representa una función específica que el agente puede ejecutar.
 *
 * Estructura de un tool:
 * {
 *   name: 'nombre_del_tool',
 *   description: 'Descripción de lo que hace el tool',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       parametro1: {
 *         type: 'string',
 *         description: 'Descripción del parámetro',
 *       },
 *     },
 *     required: ['parametro1'],
 *   },
 * }
 *
 * Para crear nuevos tools:
 * 1. Crea un archivo en src/services/ para la lógica del servicio
 * 2. Extiende BaseService para tener acceso a los métodos HTTP
 * 3. Define el tool en el array 'tools' abajo
 * 4. Implementa el handler en la función 'handleToolCall'
 */

// Array de tools disponibles
export const tools: Tool[] = [
  getCostumerByIdentificationTool,
  getCategorieseTool,
  getPublicMembershipsTool,
  getMembershipDiscountsTool,
  getAlliedCommerceTool,
  getAlliedCommercesByCategoryTool,
  // Aquí se agregarán los tools del CRM de TuDescuento
  // Ejemplo:
  // {
  //   name: 'get_ai_agents',
  //   description: 'Obtiene la lista de agentes de IA disponibles',
  //   inputSchema: {
  //     type: 'object',
  //     properties: {
  //       page: {
  //         type: 'number',
  //         description: 'Número de página',
  //         default: 1,
  //       },
  //     },
  //   },
  // },
]

/**
 * Handler principal para ejecutar tools
 * Recibe una petición de ejecución y delega al handler correspondiente
 */
export async function handleToolCall(request: CallToolRequest) {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'get_costumer_by_identification': {
      const { numero_identificacion } = args as { numero_identificacion: string }
      return await handleGetCostumerByIdentification(numero_identificacion)
    }

    case 'get_categories': {
      return await handleGetCategories()
    }

    case 'get_public_memberships': {
      return await handleGetPublicMemberships()
    }

    case 'get_membership_discounts': {
      return await handleGetMembershipDiscounts(args)
    }

    case 'get_allied_commerce': {
      return await handleGetAlliedCommerce(args)
    }

    case 'get_allied_commerces_by_category': {
      return await handleGetAlliedCommercesByCategory(args)
    }

    // Aquí se agregarán los casos para cada tool
    // Ejemplo:
    // case 'get_ai_agents': {
    //   const { page = 1 } = args as any
    //   const result = await aiAgentService.getAgents(page)
    //
    //   if (!result.success) {
    //     return {
    //       content: [
    //         {
    //           type: 'text' as const,
    //           text: `Error: ${result.error?.message}`,
    //         },
    //       ],
    //       isError: true,
    //     }
    //   }
    //
    //   return {
    //     content: [
    //       {
    //         type: 'text' as const,
    //         text: JSON.stringify(result.data, null, 2),
    //       },
    //     ],
    //   }
    // }

    default:
      return {
        content: [
          {
            type: 'text' as const,
            text: `Tool desconocido: ${name}`,
          },
        ],
        isError: true,
      }
  }
}
