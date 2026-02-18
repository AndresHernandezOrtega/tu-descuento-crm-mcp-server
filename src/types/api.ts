// ============================================
// TIPOS DE RESPUESTAS DEL CLIENTE HTTP/API
// ============================================

/**
 * Respuesta paginada de Laravel
 */
export interface LaravelPaginatedResponse<T> {
  current_page: number
  data: T[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

/**
 * Links de paginación
 */
export interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

/**
 * Respuesta genérica con objeto conteniendo array de entidades
 * Ejemplo: { leads: Lead[] } o { clientes: Cliente[] }
 */
export interface GenericEntityResponse<T> {
  [key: string]: T
}

/**
 * Respuesta de error de la API
 */
export interface ApiErrorResponse {
  error?: string
  message: string
  details?: any
}

/**
 * Respuesta wrapper interna para manejar éxito y error
 * Usado internamente por el cliente HTTP para encapsular respuestas
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiErrorResponse
}
