import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { AuthService } from '@services/auth-service.js'

export const forgotPasswordTool: Tool = {
  name: 'forgot_password',
  description:
    'Solicita el envío de un código de restauración de contraseña (OTP) al email del cliente final. Úsalo cuando el usuario pida restaurar su contraseña de acceso a la plataforma de Tu Descuento.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Correo electrónico del cliente que solicita restaurar su contraseña',
      },
    },
    required: ['email'],
  },
}

export async function handleForgotPassword(args: any) {
  const { email } = args
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return {
      content: [{ type: 'text' as const, text: 'Error: Debes proporcionar un email válido.' }],
      isError: true,
    }
  }

  const service = new AuthService()
  const result = await service.forgotPassword(email)

  if (!result.success || !result.data) {
    // Si el backend responde 404, usar data.error en el texto del MCP
    if (result.error?.statusCode === 404 && result.error?.error) {
      const errorText = typeof result.error.error === 'string' ? result.error.error : JSON.stringify(result.error.error, null, 2)

      return {
        content: [{ type: 'text' as const, text: errorText }],
        isError: true,
      }
    }

    return {
      content: [{ type: 'text' as const, text: result.error?.message || 'No se pudo solicitar el reinicio de contraseña.' }],
      isError: true,
    }
  }

  if (!result.data.status) {
    // Errores lógicos del backend dentro de respuesta HTTP exitosa
    const backendError = result.data.error ? `\n${JSON.stringify(result.data.error, null, 2)}` : ''

    return {
      content: [{ type: 'text' as const, text: `${result.data.message}${backendError}` }],
      isError: true,
    }
  }

  // Éxito
  const { message, data: respData } = result.data
  let text = `✅ ${message}\n\nSe envió un código OTP al correo: ${respData?.email}\nEl código expira en ${respData?.otp_expires_in_minutes} minutos.`
  text += '\n\nIndícale al usuario que revise su correo y use el código OTP para completar el proceso de restauración de contraseña.'
  text += '\n\n--- Respuesta completa ---\n' + JSON.stringify(result.data, null, 2)
  return {
    content: [{ type: 'text' as const, text }],
  }
}
