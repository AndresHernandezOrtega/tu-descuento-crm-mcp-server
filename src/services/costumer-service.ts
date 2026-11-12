import { BaseService } from '@services/base-service.js'
import type { ApiResponse, Costumer, GenericEntityResponse, LaravelPaginatedResponse } from '@/types/index.js'

export interface FindClientsByContactParams {
  email?: string
  celular?: string
}

/**
 * Servicio para gestionar clientes del CRM
 *
 * Endpoints disponibles:
 * - GET /clients/by_identification/:numero_identificacion - Obtener cliente por número de identificación
 */
export class CostumerService extends BaseService {
  /**
   * Obtener un cliente por su número de identificación
   *
   * @param numeroIdentificacion - Número de documento de identidad del cliente
   * @returns Información completa del cliente si existe
   */
  async getCostumerByIdentification(numeroIdentificacion: string): Promise<ApiResponse<GenericEntityResponse<Costumer>>> {
    return this.get<GenericEntityResponse<Costumer>>(`/clients/by_identification/${numeroIdentificacion}`)
  }

  /**
   * GET /clients con email y/o celular exactos.
   * El filtro lo aplica el CRM; el tool vuelve a exigir match exacto y no devuelve contratos.
   */
  async findByContact(
    params: FindClientsByContactParams,
  ): Promise<ApiResponse<LaravelPaginatedResponse<Costumer>>> {
    const query = this.buildQueryParams({
      email: params.email,
      celular: params.celular,
      per_page: 15,
    })
    return this.get<LaravelPaginatedResponse<Costumer>>('/clients', query)
  }
}
