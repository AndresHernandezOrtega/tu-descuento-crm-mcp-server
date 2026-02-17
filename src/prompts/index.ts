import type { Prompt, GetPromptRequest } from '@modelcontextprotocol/sdk/types.js'

/**
 * PROMPTS DEL SERVIDOR MCP
 *
 * Los prompts son plantillas predefinidas que el agente de IA puede usar
 * para generar respuestas específicas según el contexto.
 *
 * Estructura de un prompt:
 * {
 *   name: 'nombre_del_prompt',
 *   description: 'Descripción de cuándo usar este prompt',
 *   arguments: [
 *     {
 *       name: 'parametro1',
 *       description: 'Descripción del parámetro',
 *       required: true,
 *     },
 *   ],
 * }
 *
 * Los prompts se usan para proporcionar contexto e instrucciones
 * específicas al modelo de lenguaje.
 */

// Array de prompts disponibles
export const prompts: Prompt[] = [
  // Aquí se agregarán los prompts del CRM de TuDescuento
  // Ejemplo:
  // {
  //   name: 'customer_support_greeting',
  //   description: 'Saludo inicial para soporte al cliente',
  //   arguments: [
  //     {
  //       name: 'customer_name',
  //       description: 'Nombre del cliente',
  //       required: false,
  //     },
  //   ],
  // },
]

/**
 * Handler para obtener el contenido de un prompt
 * Genera el contenido del prompt con los argumentos proporcionados
 */
export async function handleGetPrompt(request: GetPromptRequest) {
  const { name, arguments: args } = request.params

  switch (name) {
    // Aquí se agregarán los casos para cada prompt
    // Ejemplo:
    // case 'customer_support_greeting': {
    //   const customerName = args?.customer_name as string | undefined
    //
    //   return {
    //     messages: [
    //       {
    //         role: 'user' as const,
    //         content: {
    //           type: 'text' as const,
    //           text: customerName
    //             ? `Saluda al cliente ${customerName} de manera amigable y profesional.`
    //             : 'Saluda al cliente de manera amigable y profesional.',
    //         },
    //       },
    //     ],
    //   }
    // }

    default:
      return {
        description: 'Error',
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Prompt desconocido: ${name}`,
            },
          },
        ],
      }
  }
}
