import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupportLogsService } from '@services/support-logs-service.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
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

const outputSchema = {
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
