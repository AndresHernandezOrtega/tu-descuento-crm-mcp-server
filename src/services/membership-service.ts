import { BaseService } from '@services/base-service.js'
import type { ApiResponse, PublicMembershipsResponse, MembershipDiscountsResponse } from '@/types/index.js'

/**
 * Servicio para gestionar membresías del CRM
 *
 * Endpoints disponibles:
 * - GET /memberships/public - Obtener membresías públicas disponibles para venta
 * - GET /memberships/{membership_id}/discounts - Obtener descuentos de una membresía específica
 */
export class MembershipService extends BaseService {
  /**
   * Obtener todas las membresías públicas disponibles para venta
   *
   * @returns Lista de membresías disponibles para el público con sus categorías incluidas
   */
  async getPublicMemberships(): Promise<ApiResponse<PublicMembershipsResponse>> {
    return this.get<PublicMembershipsResponse>('/memberships/public')
  }

  /**
   * Obtener los descuentos incluidos en una membresía específica
   *
   * @param membershipId - ID de la membresía
   * @returns Lista de descuentos con información del comercio aliado que los ofrece
   */
  async getMembershipDiscounts(membershipId: number): Promise<ApiResponse<MembershipDiscountsResponse>> {
    return this.get<MembershipDiscountsResponse>(`/memberships/${membershipId}/discounts`)
  }
}
