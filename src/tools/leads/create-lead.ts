import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { LeadService } from '@services/lead-service.js'
import { CostumerService } from '@services/costumer-service.js'
import type { CreateLeadDto } from '@/types/index.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const ORIGEN_EXAMPLE =
  'WhatsApp — Preguntó por restaurantes / membresía oro. Estado: muy interesado.'

const inputSchema = {
  nombre: z.string().min(1).describe('Nombre completo del prospecto (requerido)'),
  telefono: z.string().min(1).describe('Teléfono o WhatsApp del prospecto (requerido). Ejemplo: 3001234567'),
  origen: z
    .string()
    .min(1)
    .describe(
      'Descripción detallada del contacto: canal de comunicación, intención/origen de interés ' +
        '(pregunta inicial: restaurantes, gimnasios, marca, etc.) y estado para recontacto humano ' +
        `(muy interesado, interés leve, objeción fuerte, etc.). Ejemplo: "${ORIGEN_EXAMPLE}"`,
    ),
  numero_documento: z
    .string()
    .min(1)
    .describe('Número de documento del prospecto (requerido, sin puntos ni guiones)'),
  email: z.string().email().optional().describe('Correo electrónico (opcional; solo si el usuario lo proporciona)'),
}

const outputSchema = {
  status: z.enum(['created', 'already_client', 'already_lead']),
  message: z.string(),
  lead: z.unknown().optional(),
  costumer: z.unknown().optional(),
}

export function registerCreateLead(server: McpServer): void {
  server.registerTool(
    'create_lead',
    {
      title: 'Registrar lead / prospecto',
      description:
        'Registra un lead (prospecto) en el CRM cuando un usuario muestra interés en adquirir membresías. ' +
        'Antes de crear: (1) verifica si ya es cliente registrado; (2) verifica si ya existe un lead con el mismo documento. ' +
        'El campo origen DEBE describir canal de comunicación, intención/origen de interés (pregunta inicial) ' +
        'y estado para recontacto humano (muy interesado, interés leve, objeción fuerte, etc.). ' +
        'Requiere nombre, telefono, origen y numero_documento. email es opcional.',
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
      const numeroDocumento = args.numero_documento.trim()

      // 1) ¿Ya es cliente registrado?
      const costumerService = new CostumerService()
      const costumerResult = await costumerService.getCostumerByIdentification(numeroDocumento)

      if (costumerResult.success && costumerResult.data) {
        const payload = costumerResult.data as Record<string, unknown>
        const c = (payload.costumer ?? payload.client ?? payload) as Record<string, unknown>
        const name =
          [c.primer_nombre, c.primer_apellido].filter(Boolean).join(' ') ||
          (typeof c.nombre === 'string' ? c.nombre : 'Cliente')
        const message =
          'Este documento ya está registrado como cliente en la plataforma. No se puede crear como lead.'
        const summary =
          `${message}\n` +
          `Cliente: ${name}\n` +
          `Identificación: ${c.numero_identificacion ?? numeroDocumento}\n` +
          `Email: ${c.email ?? 'N/A'} | Celular: ${c.celular ?? 'N/A'}`

        const structured = {
          status: 'already_client' as const,
          message,
          costumer: costumerResult.data,
        }
        return {
          ...ok(structured, summary),
          isError: true,
        }
      }

      if (costumerResult.error?.statusCode !== 404) {
        return mapApiError(costumerResult.error, 'Error al verificar si el documento pertenece a un cliente')
      }

      // 2) ¿Ya existe un lead con este documento?
      const leadService = new LeadService()
      const leadsResult = await leadService.getLeadsByDocumento(numeroDocumento)

      if (!leadsResult.success || !leadsResult.data) {
        return mapApiError(leadsResult.error, 'Error al verificar leads existentes')
      }

      const existingLead = leadsResult.data.leads?.[0]
      if (existingLead) {
        const message = 'Este lead ya ha sido registrado anteriormente.'
        const summary =
          `${message}\n` +
          `Lead #${existingLead.id}: ${existingLead.nombre} | Tel: ${existingLead.telefono} | Estado: ${existingLead.estado}`

        return ok({ status: 'already_lead', message, lead: existingLead }, summary)
      }

      // 3) Crear lead
      const leadData: CreateLeadDto = {
        nombre: args.nombre.trim(),
        telefono: args.telefono.trim(),
        origen: args.origen.trim(),
        numero_documento: numeroDocumento,
      }

      if (args.email?.trim()) {
        leadData.email = args.email.trim()
      }

      const result = await leadService.createLead(leadData)

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'Error al registrar el lead')
      }

      const lead = result.data.lead
      if (!lead || typeof lead.id !== 'number') {
        return fail(
          'UPSTREAM_ERROR',
          'El CRM registró el lead pero la respuesta no incluye el objeto lead esperado',
        )
      }

      const message = result.data.message?.trim() || 'Lead registrado correctamente'
      const summary =
        `${message}\n` +
        `Lead #${lead.id}: ${lead.nombre} | Tel: ${lead.telefono} | Estado: ${lead.estado}\n` +
        `El equipo de ventas contactará al prospecto para completar la afiliación.`

      return ok({ status: 'created', message, lead }, summary)
    },
  )
}
