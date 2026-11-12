import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { LeadService } from '@services/lead-service.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_documento: z
    .string()
    .min(1)
    .describe('Documento del prospecto (igualdad exacta en GET /leads). Ejemplo: 1234567890'),
  estado: z
    .string()
    .min(1)
    .optional()
    .describe('Filtro opcional de estado, igualdad exacta. El index del CRM ya lo acepta.'),
  nombre: z
    .string()
    .min(1)
    .optional()
    .describe('Filtro opcional de nombre (LIKE en el CRM). No lista prospectos sin documento.'),
}

const outputSchema = {
  leads: z.array(z.unknown()),
  total: z.number(),
}

export function registerGetLead(server: McpServer): void {
  server.registerTool(
    'get_lead',
    {
      title: 'Consultar prospecto',
      description:
        'Consulta leads existentes por numero_documento (GET /leads). También acepta estado y nombre, que el index ya filtra. ' +
        'Devuelve el estado del prospecto. No crea, no actualiza y no sube archivos. ' +
        'Si no hay lead, NOT_FOUND: verifica si ya es cliente con get_costumer_by_identification antes de create_lead.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_documento, estado, nombre }) => {
      const documento = numero_documento.trim()
      if (!documento) {
        return fail('VALIDATION_ERROR', 'numero_documento es requerido', 'No listes todos los leads.')
      }

      const service = new LeadService()
      const result = await service.getLeads({
        numero_documento: documento,
        estado: estado?.trim(),
        nombre: nombre?.trim(),
      })
      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudieron consultar los leads')
      }

      const leads = result.data.leads ?? []
      if (leads.length === 0) {
        return fail(
          'NOT_FOUND',
          `No hay un lead con documento ${documento}.`,
          'Verifica si ya es cliente con get_costumer_by_identification. Si no existe, usa create_lead. No hagas PUT ni cargues archivos.',
        )
      }

      const lines = leads.slice(0, 5).map((lead) => `#${lead.id} ${lead.nombre} — estado: ${lead.estado}`)
      const summary = `Leads para ${documento}: ${leads.length}\n${lines.join('\n')}`
      return ok({ leads, total: leads.length }, summary)
    },
  )
}
