import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupportLogsService } from '@services/support-logs-service.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento del cliente (requerido, sin puntos ni guiones)'),
  nombre: z.string().min(1).describe('Nombre completo del cliente (obligatorio)'),
  email: z.string().email().describe('Correo del cliente (obligatorio)'),
  telefono: z.string().min(1).describe('Teléfono del cliente (obligatorio). Ejemplo: 3001234567'),
  handovered: z
    .boolean()
    .describe('true solo si hubo una transferencia real a un agente humano. false si el bot resolvió el caso'),
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
        'Registra o actualiza un caso de soporte/ventas. nombre, email y telefono son obligatorios, ' +
        'igual que el alta del CRM. handovered=true solo si hubo una transferencia real a un humano; ' +
        'si el bot resolvió el caso, envía false. Si ya existe un caso del día para el mismo documento, ' +
        'el CRM actualiza ese caso. Úsalo al cerrar la interacción, no para simular una transferencia.',
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

      const nombre = args.nombre.trim()
      const email = args.email.trim()
      const telefono = args.telefono.trim()
      if (!nombre || !email || !telefono) {
        return fail(
          'VALIDATION_ERROR',
          'nombre, email y telefono son obligatorios.',
          'Pídelos antes de cerrar el caso. handovered=true solo si hubo transferencia real.',
        )
      }

      const service = new SupportLogsService()
      const result = await service.createOrUpdateSupportLog({
        numero_identificacion: args.numero_identificacion,
        nombre,
        email,
        telefono,
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
