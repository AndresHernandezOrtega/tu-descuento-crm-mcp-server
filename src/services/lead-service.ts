import { BaseService } from '@services/base-service.js'
import type { ApiResponse, CreateLeadDto, CreateLeadResponse } from '@/types/index.js'

/**
 * Servicio para gestionar leads del CRM
 *
 * Endpoint disponible:
 * - POST /api/leads - Crear un nuevo lead
 */
export class LeadService extends BaseService {
  /**
   * Crear un nuevo lead desde el bot de soporte
   * Endpoint: POST /api/leads
   *
   * Campos requeridos: nombre, telefono, origen
   * Campos opcionales: numero_documento, email
   *
   * Nota: Los campos opcionales vacíos no se envían (undefined/null/string vacío)
   */
  async createLead(data: CreateLeadDto): Promise<ApiResponse<CreateLeadResponse>> {
    // Limpiar campos opcionales vacíos
    const payload: any = {
      nombre: data.nombre,
      telefono: data.telefono,
      origen: data.origen,
    }

    // Solo agregar campos opcionales si tienen valor
    if (data.numero_documento && data.numero_documento.trim() !== '') {
      payload.numero_documento = data.numero_documento
    }
    if (data.email && data.email.trim() !== '') {
      payload.email = data.email
    }

    return this.post<CreateLeadResponse>('/leads', payload)
  }
}
