import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupportLogsService } from '@services/support-logs-service.js'
import { ok, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
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
  per_page: z.number().int().positive().optional().describe('Tamaño de página que el index del CRM ya acepta (default del CRM: 15).'),
  email: z.string().email().optional().describe('Filtro de email que el index ya acepta (LIKE).'),
  handovered: z
    .boolean()
    .optional()
    .describe('true solo casos transferidos a un humano; false solo los que resolvió el bot. El index del CRM ya lo acepta.'),
}

const outputSchema = {
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
        'Soporta rango de fechas, page, per_page, email y handovered: el index del CRM ya acepta esos filtros. ' +
        'El detalle de un caso va en get_support_log.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion, created_at_start, created_at_end, page, per_page, email, handovered }) => {
      const service = new SupportLogsService()
      const result = await service.getSupportLogs({
        numero_identificacion,
        created_at_start,
        created_at_end,
        page: page || 1,
        per_page,
        email,
        handovered,
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
