import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { LeadService } from '@services/lead-service.js'
import type { CreateLeadDto } from '@/types/index.js'

/**
 * Tool: create_lead
 *
 * Registra un nuevo lead (prospecto) en el sistema CRM cuando un usuario muestra interés
 * en adquirir una membresía o servicio de Tu Descuento Colombia.
 *
 * Casos de uso:
 * - Usuario pregunta por precios o cómo adquirir membresías
 * - Usuario solicita información para contratar
 * - Usuario muestra intención de compra explícita
 * - Usuario pide que lo contacten para más información
 *
 * Campos requeridos:
 * - nombre: Nombre completo del prospecto
 * - telefono: Número de contacto (WhatsApp preferiblemente)
 * - origen: DEBE seguir el formato "Contacto Directo Por Whatsapp (razón específica de interés)"
 *   Ejemplo: "Contacto Directo Por Whatsapp (Interés en membresía oro para descuentos en restaurantes)"
 *
 * Campos opcionales (omitir si no están disponibles):
 * - numero_documento: Cédula u otro documento de identificación
 * - email: Correo electrónico del prospecto
 */
export const createLeadTool: Tool = {
  name: 'create_lead',
  description: `Registra un lead (prospecto) en el CRM cuando un usuario muestra interés en adquirir membresías. 
  
  Usa este tool cuando:
  - El usuario pregunta cómo comprar o adquirir una membresía
  - El usuario solicita información de contacto o precios para contratar
  - El usuario manifiesta interés explícito en un producto/servicio
  - El usuario pide que lo contacten
  
  El campo 'origen' DEBE tener el formato: "Contacto Directo Por Whatsapp (descripción del interés específico)".
  Ejemplo: "Contacto Directo Por Whatsapp (Consultó por membresía oro, interesado en descuentos de restaurantes)"
  
  Campos opcionales (numero_documento, email) solo deben incluirse si el usuario los proporciona voluntariamente.`,

  inputSchema: {
    type: 'object',
    properties: {
      nombre: {
        type: 'string',
        description: 'Nombre completo del prospecto (requerido)',
      },
      telefono: {
        type: 'string',
        description: 'Número de teléfono o WhatsApp del prospecto (requerido)',
      },
      origen: {
        type: 'string',
        description:
          'DEBE seguir formato: "Contacto Directo Por Whatsapp (razón de interés)". Describe la razón específica por la que el usuario está interesado (ej: qué membresía le interesa, qué descuentos consultó)',
      },
      numero_documento: {
        type: 'string',
        description: 'Número de documento de identidad (opcional - solo si el usuario lo proporciona)',
      },
      email: {
        type: 'string',
        description: 'Correo electrónico (opcional - solo si el usuario lo proporciona)',
      },
    },
    required: ['nombre', 'telefono', 'origen'],
  },
}

/**
 * Handler para create_lead tool
 */
export async function handleCreateLead(args: any) {
  // Validar campos requeridos
  if (!args.nombre || typeof args.nombre !== 'string' || args.nombre.trim() === '') {
    return {
      content: [
        {
          type: 'text' as const,
          text: '❌ Error: El campo "nombre" es requerido y debe ser un texto válido.',
        },
      ],
      isError: true,
    }
  }

  if (!args.telefono || typeof args.telefono !== 'string' || args.telefono.trim() === '') {
    return {
      content: [
        {
          type: 'text' as const,
          text: '❌ Error: El campo "telefono" es requerido y debe ser un texto válido.',
        },
      ],
      isError: true,
    }
  }

  if (!args.origen || typeof args.origen !== 'string' || args.origen.trim() === '') {
    return {
      content: [
        {
          type: 'text' as const,
          text: '❌ Error: El campo "origen" es requerido y debe ser un texto válido.',
        },
      ],
      isError: true,
    }
  }

  // Validar formato de origen
  if (!args.origen.includes('Contacto Directo Por Whatsapp')) {
    return {
      content: [
        {
          type: 'text' as const,
          text: '❌ Error: El campo "origen" debe seguir el formato: "Contacto Directo Por Whatsapp (razón de interés)".\n\nEjemplo válido: "Contacto Directo Por Whatsapp (Interés en membresía oro para descuentos)"',
        },
      ],
      isError: true,
    }
  }

  // Construir DTO
  const leadData: CreateLeadDto = {
    nombre: args.nombre.trim(),
    telefono: args.telefono.trim(),
    origen: args.origen.trim(),
  }

  // Agregar campos opcionales solo si tienen valor
  if (args.numero_documento && typeof args.numero_documento === 'string' && args.numero_documento.trim() !== '') {
    leadData.numero_documento = args.numero_documento.trim()
  }

  if (args.email && typeof args.email === 'string' && args.email.trim() !== '') {
    leadData.email = args.email.trim()
  }

  // Llamar al servicio
  const service = new LeadService()
  const result = await service.createLead(leadData)

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ Error al registrar el lead:\n${result.error?.message || 'Error desconocido'}\n\nDetalles: ${result.error?.details || 'No hay detalles adicionales'}`,
        },
      ],
      isError: true,
    }
  }

  // Formatear respuesta exitosa
  const { message, lead } = result.data

  let responseText = `✅ ${message}\n\n`
  responseText += `📋 **Información del Lead Registrado:**\n`
  responseText += `• ID: ${lead.id}\n`
  responseText += `• Nombre: ${lead.nombre}\n`
  responseText += `• Teléfono: ${lead.telefono}\n`

  if (lead.numero_documento) {
    responseText += `• Documento: ${lead.numero_documento}\n`
  }

  if (lead.email) {
    responseText += `• Email: ${lead.email}\n`
  }

  responseText += `• Origen: ${lead.origen}\n`
  responseText += `• Estado: ${lead.estado}\n`
  responseText += `• Fecha de registro: ${lead.created_at}\n\n`
  responseText += `🎯 **Próximos Pasos:**\n`
  responseText += `El equipo de ventas de Tu Descuento Colombia se pondrá en contacto con el prospecto para completar el proceso de afiliación.`

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText,
      },
    ],
  }
}
