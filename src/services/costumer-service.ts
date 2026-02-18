import { BaseService } from '@services/base-service.js'
import type { ApiResponse, Costumer, GenericEntityResponse } from '@/types/index.js'

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
}
