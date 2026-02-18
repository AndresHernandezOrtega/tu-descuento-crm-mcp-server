import { BaseService } from '@services/base-service.js'
import type { ApiResponse, Lead, GenericEntityResponse } from '@/types/index.js'

/**
 * Servicio para gestionar leads del CRM
 *
 * Endpoints disponibles:
 * - GET /api/leads - Listar leads
 * - GET /api/leads/:id - Obtener lead por ID
 * - POST /api/leads - Crear lead
 * - PUT /api/leads/:id - Actualizar lead
 * - DELETE /api/leads/:id - Eliminar lead
 */
export class LeadService extends BaseService {
  private readonly basePath = '/api/leads'

  /**
   * Obtener lista de leads
   * La respuesta tiene el formato: { leads: Lead[] }
   */
  async getLeads(filters?: { estado?: string; origen?: string }): Promise<ApiResponse<GenericEntityResponse<Lead>>> {
    const params = filters ? this.buildQueryParams(filters) : undefined
    return this.get<GenericEntityResponse<Lead>>(this.basePath, params)
  }

  /**
   * Obtener un lead específico por ID
   */
  async getLeadById(id: number): Promise<ApiResponse<Lead>> {
    return this.get<Lead>(`${this.basePath}/${id}`)
  }

  /**
   * Crear un nuevo lead
   */
  async createLead(data: { nombre: string; numero_documento: string; email: string; telefono: string; origen: string; estado?: string }): Promise<ApiResponse<Lead>> {
    return this.post<Lead>(this.basePath, data)
  }

  /**
   * Actualizar un lead existente
   */
  async updateLead(id: number, data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return this.put<Lead>(`${this.basePath}/${id}`, data)
  }

  /**
   * Eliminar un lead
   */
  async deleteLead(id: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`${this.basePath}/${id}`)
  }

  /**
   * Buscar leads por email
   */
  async findByEmail(email: string): Promise<ApiResponse<Lead>> {
    return this.get<Lead>(`${this.basePath}/search/email`, { email })
  }

  /**
   * Buscar leads por número de documento
   */
  async findByDocument(numero_documento: string): Promise<ApiResponse<Lead>> {
    return this.get<Lead>(`${this.basePath}/search/document`, { numero_documento })
  }
}

// Instancia singleton del servicio
export const leadService = new LeadService()
