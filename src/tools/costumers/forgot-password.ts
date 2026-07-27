import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AuthService } from '@services/auth-service.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
  email: z
    .string()
    .email()
    .describe('Correo electrónico del cliente que solicita restaurar su contraseña. Ejemplo: cliente@email.com'),
}

const outputSchema = {
  message: z.string(),
  email: z.string().optional(),
  otp_expires_in_minutes: z.number().optional(),
  otp_mail_sent: z.boolean().optional(),
}

export function registerForgotPassword(server: McpServer): void {
  server.registerTool(
    'forgot_password',
    {
      title: 'Solicitar OTP de restauración de contraseña',
      description:
        'Solicita el envío de un código OTP de restauración de contraseña al email del cliente final. ' +
        'ADVERTENCIA: Esta acción envía un correo real al cliente. Úsala solo cuando el usuario pida explícitamente restaurar su contraseña de acceso a Tu Descuento.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ email }) => {
      const service = new AuthService()
      const result = await service.forgotPassword(email)

      if (!result.success || !result.data) {
        if (result.error?.statusCode === 404 && result.error?.error) {
          const errorText =
            typeof result.error.error === 'string' ? result.error.error : JSON.stringify(result.error.error)
          return fail('NOT_FOUND', errorText, 'Verifica que el email esté registrado en la plataforma.')
        }
        return mapApiError(result.error, 'No se pudo solicitar el reinicio de contraseña.')
      }

      if (!result.data.status) {
        return fail(
          'VALIDATION_ERROR',
          result.data.message,
          result.data.error ? JSON.stringify(result.data.error) : undefined,
        )
      }

      const resp = result.data.data
      const summary =
        `${result.data.message}\n` +
        `OTP enviado a: ${resp?.email ?? email}\n` +
        `Expira en: ${resp?.otp_expires_in_minutes ?? '?'} minutos.\n` +
        `Indica al usuario que revise su correo para completar la restauración.`

      return ok(
        {
          message: result.data.message,
          email: resp?.email,
          otp_expires_in_minutes: resp?.otp_expires_in_minutes,
          otp_mail_sent: resp?.otp_mail_sent,
        },
        summary,
      )
    },
  )
}
