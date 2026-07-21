import { BaseService } from '@services/base-service.js'
import type { ApiResponse, ForgotPasswordRequest, ForgotPasswordResponse } from '@/types/index.js'

/**
 * Servicio para endpoints de autenticación de clientes finales
 * - POST /client/auth/forgot-password
 */
export class AuthService extends BaseService {
  /**
   * Solicita el envío de un código OTP para restaurar contraseña
   * @param email Email del cliente
   */
  async forgotPassword(email: string): Promise<ApiResponse<ForgotPasswordResponse>> {
    return this.post<ForgotPasswordResponse>('/client/auth/forgot-password', { email })
  }
}
