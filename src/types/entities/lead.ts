/**
 * Lead del CRM
 *
 * Representa un prospecto o cliente potencial en el sistema
 */
export interface Lead {
  id: number
  nombre: string
  numero_documento: string
  email: string
  telefono: string
  origen: string
  estado: string
  created_at: string
  updated_at: string
}

/**
 * DTO para crear un Lead
 */
export interface CreateLeadDto {
  nombre: string
  numero_documento: string
  email: string
  telefono: string
  origen: string
  estado?: string
}

/**
 * DTO para actualizar un Lead
 */
export interface UpdateLeadDto {
  nombre?: string
  numero_documento?: string
  email?: string
  telefono?: string
  origen?: string
  estado?: string
}
