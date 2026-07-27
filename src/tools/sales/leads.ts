import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { LeadService } from '@services/lead-service.js'
import type { CreateLeadDto } from '@/types/index.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const ORIGEN_PREFIX = 'Contacto Directo Por Whatsapp'

const inputSchema = {
  nombre: z.string().min(1).describe('Nombre completo del prospecto (requerido)'),
  telefono: z.string().min(1).describe('Teléfono o WhatsApp del prospecto (requerido). Ejemplo: 3001234567'),
  origen: z
    .string()
    .min(1)
    .describe(
      `DEBE incluir "${ORIGEN_PREFIX}" y la razón de interés entre paréntesis. ` +
        `Ejemplo: "${ORIGEN_PREFIX} (Interés en membresía oro para restaurantes)"`,
    ),
  numero_documento: z
    .string()
    .optional()
    .describe('Número de documento (opcional; solo si el usuario lo proporciona)'),
  email: z.string().email().optional().describe('Correo electrónico (opcional; solo si el usuario lo proporciona)'),
}

const outputSchema = {
  message: z.string(),
  lead: z.unknown(),
}

export function registerCreateLead(server: McpServer): void {
  server.registerTool(
    'create_lead',
    {
      title: 'Registrar lead / prospecto',
      description:
        'Registra un lead (prospecto) en el CRM cuando un usuario muestra interés en adquirir membresías. ' +
        'Úsalo cuando pregunte cómo comprar, pida precios para contratar, o solicite contacto. ' +
        `El campo origen DEBE tener el formato: "${ORIGEN_PREFIX} (descripción del interés)". ` +
        'Campos opcionales (numero_documento, email) solo si el usuario los da voluntariamente.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      if (!args.origen.includes(ORIGEN_PREFIX)) {
        return fail(
          'VALIDATION_ERROR',
          `El campo "origen" debe incluir "${ORIGEN_PREFIX}"`,
          `Ejemplo: "${ORIGEN_PREFIX} (Interés en membresía oro)"`,
        )
      }

      const leadData: CreateLeadDto = {
        nombre: args.nombre.trim(),
        telefono: args.telefono.trim(),
        origen: args.origen.trim(),
      }

      if (args.numero_documento?.trim()) {
        leadData.numero_documento = args.numero_documento.trim()
      }
      if (args.email?.trim()) {
        leadData.email = args.email.trim()
      }

      const service = new LeadService()
      const result = await service.createLead(leadData)

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'Error al registrar el lead')
      }

      const { message, lead } = result.data
      const summary =
        `${message}\n` +
        `Lead #${lead.id}: ${lead.nombre} | Tel: ${lead.telefono} | Estado: ${lead.estado}\n` +
        `El equipo de ventas contactará al prospecto para completar la afiliación.`

      return ok({ message, lead }, summary)
    },
  )
}
