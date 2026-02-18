import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CostumerService } from '@services/costumer-service.js'

/**
 * Tool para obtener información de un cliente por su número de identificación
 */
export const getCostumerByIdentificationTool: Tool = {
  name: 'get_costumer_by_identification',
  description: 'Busca y obtiene la información completa de un cliente registrado en la plataforma usando su número de identificación (cédula, NIT, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      numero_identificacion: {
        type: 'string',
        description: 'Número de documento de identificación del cliente (ej: cédula, NIT, pasaporte) totalmente limpio sin puntos, guiones o espacios. Ejemplo: 1234567890',
      },
    },
    required: ['numero_identificacion'],
  },
}

/**
 * Handler para ejecutar la búsqueda del cliente
 */
export async function handleGetCostumerByIdentification(numeroIdentificacion: string) {
  const costumerService = new CostumerService()
  const result = await costumerService.getCostumerByIdentification(numeroIdentificacion)

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || 'No se pudo obtener la información del cliente',
        },
      ],
      isError: true,
    }
  }

  // Devolver la información del cliente en formato legible
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  }
}
