import { BaseService } from './base-service.js'
import type { ApiResponse, AiAgent, LaravelPaginatedResponse } from '../types/index.js'

/**
 * Servicio para gestionar agentes de IA del CRM
 *
 * Endpoints disponibles:
 * - GET /api/ai-support-agents - Listar agentes (paginado)
 * - GET /api/ai-support-agents/:id - Obtener agente por ID
 * - POST /api/ai-support-agents - Crear agente
 * - PUT /api/ai-support-agents/:id - Actualizar agente
 * - DELETE /api/ai-support-agents/:id - Eliminar agente
 */
export class AiAgentService extends BaseService {
  private readonly basePath = '/api/ai-support-agents'

  /**
   * Obtener lista paginada de agentes de IA
   */
  async getAgents(page: number = 1, perPage: number = 15): Promise<ApiResponse<LaravelPaginatedResponse<AiAgent>>> {
    return this.get<LaravelPaginatedResponse<AiAgent>>(this.basePath, {
      page,
      per_page: perPage,
    })
  }

  /**
   * Obtener un agente específico por ID
   */
  async getAgentById(id: number): Promise<ApiResponse<AiAgent>> {
    return this.get<AiAgent>(`${this.basePath}/${id}`)
  }

  /**
   * Buscar agentes por filtros
   */
  async searchAgents(filters: { status?: string; department?: string; name?: string }): Promise<ApiResponse<LaravelPaginatedResponse<AiAgent>>> {
    const params = this.buildQueryParams(filters)
    return this.get<LaravelPaginatedResponse<AiAgent>>(this.basePath, params)
  }

  /**
   * Crear un nuevo agente de IA
   */
  async createAgent(data: Partial<AiAgent>): Promise<ApiResponse<AiAgent>> {
    return this.post<AiAgent>(this.basePath, data)
  }

  /**
   * Actualizar un agente existente
   */
  async updateAgent(id: number, data: Partial<AiAgent>): Promise<ApiResponse<AiAgent>> {
    return this.put<AiAgent>(`${this.basePath}/${id}`, data)
  }

  /**
   * Eliminar un agente
   */
  async deleteAgent(id: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`${this.basePath}/${id}`)
  }
}

// Instancia singleton del servicio
export const aiAgentService = new AiAgentService()
