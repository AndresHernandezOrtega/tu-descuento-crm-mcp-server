// Tipos para endpoints de autenticación cliente final (forgot-password, login, etc)

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  status: boolean
  message: string
  data: {
    email: string
    otp_expires_in_minutes: number
    otp_mail_sent: boolean
  } | null
  error: any
}
