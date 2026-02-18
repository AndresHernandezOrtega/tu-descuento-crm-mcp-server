import { BaseService } from '@services/base-service.js'
import type { ApiResponse, AlliedCommerceResponse } from '@/types/index.js'

/**
 * Servicio para gestionar comercios aliados del CRM
 *
 * Endpoints disponibles:
 * - GET /allied_commerces/{allied_commerce_id} - Obtener información detallada de un comercio aliado
 */
export class AlliedCommerceService extends BaseService {
  /**
   * Obtener información detallada de un comercio aliado específico
   *
   * @param alliedCommerceId - ID del comercio aliado
   * @returns Información completa del comercio incluyendo contacto, descripción, ubicación y descuentos ofrecidos
   */
  async getAlliedCommerceById(alliedCommerceId: number): Promise<ApiResponse<AlliedCommerceResponse>> {
    return this.get<AlliedCommerceResponse>(`/allied_commerces/${alliedCommerceId}`)
  }
}
