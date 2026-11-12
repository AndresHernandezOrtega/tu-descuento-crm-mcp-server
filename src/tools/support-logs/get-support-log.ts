import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupportLogsService } from '@services/support-logs-service.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  id: z.number().int().positive().describe('ID del caso (GET /support_history_logs/{id}). Ejemplo: 42'),
}

const outputSchema = {
  log: z.unknown(),
}

function slimLog(log: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...log }
  if (copy.user && typeof copy.user === 'object' && !Array.isArray(copy.user)) {
    const { password: _password, remember_token: _token, tokens: _tokens, ...user } = copy.user as Record<string, unknown>
    copy.user = user
  }
  if (copy.client && typeof copy.client === 'object' && !Array.isArray(copy.client)) {
    const client = { ...(copy.client as Record<string, unknown>) }
    delete client.contracts
    delete client.current_contract
    delete client.currentContract
    copy.client = client
  }
  return copy
}

export function registerGetSupportLog(server: McpServer): void {
  server.registerTool(
    'get_support_log',
    {
      title: 'Detalle de un caso de soporte',
      description:
        'Obtiene un caso de soporte por id (GET /support_history_logs/{id}). ' +
        'Para el historial paginado usa get_support_logs. No actualiza ni elimina el caso.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      if (!id) return fail('VALIDATION_ERROR', 'id es requerido y debe ser un número positivo')

      const service = new SupportLogsService()
      const result = await service.getSupportLogById(id)
      if (!result.success || !result.data) {
        if (result.error?.statusCode === 404) {
          return fail('NOT_FOUND', 'Caso de soporte no encontrado.', 'Revisa el id con get_support_logs.')
        }
        return mapApiError(result.error, `No se pudo obtener el caso ${id}`)
      }

      const log = slimLog(result.data as unknown as Record<string, unknown>)
      const necesidad = typeof log.necesidad === 'string' ? log.necesidad : ''
      const summary =
        `Caso #${log.id ?? id} — ${typeof log.nombre === 'string' ? log.nombre : 'sin nombre'}\n` +
        `Documento: ${typeof log.numero_identificacion === 'string' ? log.numero_identificacion : 'N/A'} | ` +
        `Transferido: ${log.handovered ? 'sí' : 'no'}\n` +
        (necesidad ? `Necesidad: ${necesidad.slice(0, 140)}` : 'Sin necesidad registrada.')

      return ok({ log }, summary)
    },
  )
}
