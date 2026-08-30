import { BaseService } from '@services/base-service.js'
import type { ApiResponse, CreateLeadDto, CreateLeadResponse, LeadsListResponse } from '@/types/index.js'

/**
 * Servicio para gestionar leads del CRM
 *
 * Endpoints disponibles:
 * - GET /api/leads - Listar leads (filtros opcionales)
 * - POST /api/leads - Crear un nuevo lead
 */
export class LeadService extends BaseService {
  /**
   * Buscar leads por número de documento (igualdad exacta)
   * Endpoint: GET /api/leads?numero_documento=
   */
  async getLeadsByDocumento(numeroDocumento: string): Promise<ApiResponse<LeadsListResponse>> {
    const params = this.buildQueryParams({ numero_documento: numeroDocumento })
    return this.get<LeadsListResponse>('/leads', params)
  }

  /**
   * Crear un nuevo lead desde el bot de soporte
   * Endpoint: POST /api/leads
   *
   * Campos requeridos: nombre, telefono, origen, numero_documento
   * Campos opcionales: email
   *
   * Nota: Los campos opcionales vacíos no se envían (undefined/null/string vacío)
   */
  async createLead(data: CreateLeadDto): Promise<ApiResponse<CreateLeadResponse>> {
    const payload: Record<string, string> = {
      nombre: data.nombre,
      telefono: data.telefono,
      origen: data.origen,
      numero_documento: data.numero_documento,
    }

    if (data.email && data.email.trim() !== '') {
      payload.email = data.email
    }

    return this.post<CreateLeadResponse>('/leads', payload)
  }
}
