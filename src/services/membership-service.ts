import { BaseService } from '@services/base-service.js'
import type { ApiResponse, MembershipsResponse, MembershipDiscountsResponse } from '@/types/index.js'

/**
 * Servicio para gestionar membresías del CRM
 *
 * Endpoints disponibles:
 * - GET /memberships/public - Membresías con is_venta_publico = true
 * - GET /memberships - Todas las membresías (públicas e internas)
 * - GET /memberships/{membership_id}/discounts - Descuentos M2M de una membresía (no por categorías)
 */
export class MembershipService extends BaseService {
  /**
   * Obtener membresías públicas disponibles para venta
   */
  async getPublicMemberships(): Promise<ApiResponse<MembershipsResponse>> {
    return this.get<MembershipsResponse>('/memberships/public')
  }

  /**
   * Obtener todas las membresías (públicas e internas), con categorías y descuentos anidados
   */
  async getMemberships(): Promise<ApiResponse<MembershipsResponse>> {
    return this.get<MembershipsResponse>('/memberships')
  }

  /**
   * Obtener los descuentos incluidos en una membresía específica.
   * Relación directa M2M (discounts_memberships); ya no deriva de categorías.
   *
   * @param membershipId - ID de la membresía
   */
  async getMembershipDiscounts(membershipId: number): Promise<ApiResponse<MembershipDiscountsResponse>> {
    return this.get<MembershipDiscountsResponse>(`/memberships/${membershipId}/discounts`)
  }
}
