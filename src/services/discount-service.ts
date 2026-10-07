import { BaseService } from '@services/base-service.js'
import type { ApiResponse, DiscountSearchCrmEnvelope, DiscountSearchResponse } from '@/types/index.js'

const SEARCH_PER_PAGE = 15

/**
 * Servicio para descuentos del CRM
 *
 * Endpoints disponibles:
 * - GET /discounts/search - Búsqueda por keywords (nombre OR descripcion)
 *
 * Modelo de datos (2026-09): aplicabilidad por membresía vía M2M discounts_memberships;
 * categorías son rubro/taxonomía, no determinan qué cubre un plan.
 */
export class DiscountService extends BaseService {
  /**
   * Buscar descuentos por keywords (OR; LIKE en nombre OR descripcion).
   * Siempre página 1 con per_page=15.
   */
  async searchByKeywords(keywords: string[]): Promise<ApiResponse<DiscountSearchResponse>> {
    const query = this.serializeLaravelArrayParams({ keywords, per_page: SEARCH_PER_PAGE })
    const result = await this.get<DiscountSearchCrmEnvelope>(`/discounts/search?${query}`)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UnknownError',
          message: 'No se pudieron buscar descuentos',
        },
      }
    }

    const envelope = result.data
    const discounts = envelope.data?.discounts

    if (!envelope.status || !discounts) {
      return {
        success: false,
        error: {
          error: envelope.error || 'BadRequest',
          message: envelope.message || 'Error en la búsqueda de descuentos',
          statusCode: 400,
        },
      }
    }

    return {
      success: true,
      data: { discounts },
    }
  }
}
