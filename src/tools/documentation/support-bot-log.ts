import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupportLogsService } from '@services/support-logs-service.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const getInputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento del cliente sin puntos, guiones ni espacios. Ejemplo: 1234567890'),
  created_at_start: z
    .string()
    .optional()
    .describe('Fecha inicio del rango (Y-m-d). Ejemplo: 2026-01-01'),
  created_at_end: z
    .string()
    .optional()
    .describe('Fecha fin del rango (Y-m-d). Ejemplo: 2026-01-31'),
  page: z.number().int().positive().optional().describe('Número de página (default: 1)'),
}

const getOutputSchema = {
  numero_identificacion: z.string(),
  pagination: z.object({
    current_page: z.number(),
    last_page: z.number(),
    per_page: z.number(),
    total: z.number(),
  }),
  logs: z.array(z.unknown()),
}

export function registerGetSupportLogs(server: McpServer): void {
  server.registerTool(
    'get_support_logs',
    {
      title: 'Historial de casos de soporte',
      description:
        'Obtiene el historial de casos de soporte/ventas de un cliente por número de identificación. ' +
        'Útil para revisar interacciones previas, necesidades, soluciones y consideraciones. ' +
        'Soporta filtro por rango de fechas y paginación.',
      inputSchema: getInputSchema,
      outputSchema: getOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion, created_at_start, created_at_end, page }) => {
      const service = new SupportLogsService()
      const result = await service.getSupportLogs({
        numero_identificacion,
        created_at_start,
        created_at_end,
        page: page || 1,
      })

      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener logs para ${numero_identificacion}`)
      }

      const pagination = {
        current_page: result.data.current_page,
        last_page: result.data.last_page,
        per_page: result.data.per_page,
        total: result.data.total,
      }
      const logs = result.data.data

      const lines = logs.slice(0, 8).map((log) => {
        const date = new Date(log.created_at).toLocaleDateString('es-CO')
        return `#${log.id} (${date}) — ${log.necesidad.slice(0, 80)}${log.necesidad.length > 80 ? '…' : ''}`
      })

      const summary =
        `Soporte cliente ${numero_identificacion}: ${pagination.total} caso(s) ` +
        `(pág. ${pagination.current_page}/${pagination.last_page})\n` +
        (lines.length ? lines.join('\n') : 'Sin registros.') +
        (logs.length > 8 ? `\n… y ${logs.length - 8} más en structuredContent` : '')

      return ok({ numero_identificacion, pagination, logs }, summary)
    },
  )
}

const createInputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento del cliente (requerido, sin puntos ni guiones)'),
  nombre: z.string().optional().describe('Nombre completo del cliente (opcional)'),
  email: z.string().email().optional().describe('Correo del cliente (opcional)'),
  telefono: z.string().optional().describe('Teléfono del cliente (opcional)'),
  handovered: z
    .boolean()
    .describe('true si el caso se transfirió a un agente humano; false si lo resolvió el bot'),
  necesidad: z.string().min(1).describe('Qué solicitó o necesitó el cliente'),
  solucion: z.string().min(1).describe('Solución brindada al cliente'),
  consideraciones: z.string().min(1).describe('Notas de seguimiento o estado del caso'),
}

const createOutputSchema = {
  action: z.string(),
  message: z.string().optional(),
  log: z.unknown(),
}

export function registerCreateSupportLog(server: McpServer): void {
  server.registerTool(
    'create_support_log',
    {
      title: 'Registrar / actualizar caso de soporte',
      description:
        'Registra o actualiza un caso de soporte/ventas. Si ya existe un caso del día para el mismo ' +
        'número de identificación, actualiza ese caso; si no, crea uno nuevo. ' +
        'IMPORTANTE: úsalo al finalizar cada interacción significativa con el cliente.',
      inputSchema: createInputSchema,
      outputSchema: createOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      if (typeof args.handovered !== 'boolean') {
        return fail('VALIDATION_ERROR', 'handovered es requerido y debe ser boolean (true/false)')
      }

      const service = new SupportLogsService()
      const result = await service.createOrUpdateSupportLog({
        numero_identificacion: args.numero_identificacion,
        nombre: args.nombre,
        email: args.email,
        telefono: args.telefono,
        handovered: args.handovered,
        necesidad: args.necesidad,
        solucion: args.solucion,
        consideraciones: args.consideraciones,
      })

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudo registrar el caso de soporte')
      }

      const response = result.data
      const log = response.data
      const action = response.action
      const summary =
        `Caso ${action === 'created' ? 'CREADO' : 'ACTUALIZADO'} #${log.id}\n` +
        `Cliente: ${log.nombre} (${log.numero_identificacion})\n` +
        `Transferido: ${log.handovered ? 'Sí' : 'No'}`

      return ok({ action, message: response.message, log }, summary)
    },
  )
}
