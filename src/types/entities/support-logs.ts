import type { Costumer } from './costumer'

/**
 * Usuario del sistema
 */
export interface User {
  id: number
  type_user_id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Log de historial de soporte/ventas
 * Registra las interacciones con clientes para documentación y seguimiento
 */
export interface SupportLog {
  id: number
  nombre: string
  numero_identificacion: string
  email: string
  telefono: string
  client_id: number | null
  user_id: number
  handovered: boolean
  necesidad: string
  solucion: string
  consideraciones: string
  created_at: string
  updated_at: string
  client: Costumer | null
  user: User
}

/**
 * Respuesta paginada de logs de soporte
 */
export interface SupportLogsResponse {
  current_page: number
  data: SupportLog[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

/**
 * DTO para crear o actualizar un log de soporte
 */
export interface CreateOrUpdateSupportLogDto {
  nombre?: string
  numero_identificacion: string
  email?: string
  telefono?: string
  handovered: boolean
  necesidad: string
  solucion: string
  consideraciones: string
}

/**
 * Respuesta de creación o actualización de log de soporte
 */
export interface CreateSupportLogResponse {
  message: string
  data: SupportLog
  action: 'created' | 'updated'
}
