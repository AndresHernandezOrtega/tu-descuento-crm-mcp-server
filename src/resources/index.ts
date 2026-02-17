import type { Resource, ReadResourceRequest } from '@modelcontextprotocol/sdk/types.js'

/**
 * RESOURCES DEL SERVIDOR MCP
 *
 * Los resources son recursos de solo lectura que el agente de IA puede consultar
 * para obtener información contextual o datos estáticos.
 *
 * Ejemplos de resources:
 * - Listas de categorías
 * - Información de la empresa
 * - Documentación
 * - Configuraciones
 *
 * Estructura de un resource:
 * {
 *   uri: 'tudescuento://tipo/nombre',
 *   name: 'Nombre del Resource',
 *   description: 'Descripción de qué contiene',
 *   mimeType: 'application/json' | 'text/plain' | etc,
 * }
 */

// Array de resources disponibles
export const resources: Resource[] = [
  // Aquí se agregarán los resources del CRM de TuDescuento
  // Ejemplo:
  // {
  //   uri: 'tudescuento://info/company',
  //   name: 'Información de TuDescuento',
  //   description: 'Información general sobre la empresa TuDescuento',
  //   mimeType: 'text/plain',
  // },
]

/**
 * Handler para leer el contenido de un resource
 * Devuelve el contenido del resource solicitado
 */
export async function handleReadResource(request: ReadResourceRequest) {
  const { uri } = request.params

  switch (uri) {
    // Aquí se agregarán los casos para cada resource
    // Ejemplo:
    // case 'tudescuento://info/company': {
    //   const companyInfo = `
    //     TuDescuento - Plataforma de Descuentos y Beneficios
    //
    //     Tu Descuento es la plataforma líder en Colombia para descuentos
    //     y beneficios exclusivos...
    //   `.trim()
    //
    //   return {
    //     contents: [
    //       {
    //         uri,
    //         mimeType: 'text/plain',
    //         text: companyInfo,
    //       },
    //     ],
    //   }
    // }

    default:
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain' as const,
            text: `Resource desconocido: ${uri}`,
          },
        ],
      }
  }
}
