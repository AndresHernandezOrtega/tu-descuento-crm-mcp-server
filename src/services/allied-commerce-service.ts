import { BaseService } from '@services/base-service.js'
import type {
  ApiResponse,
  AlliedCommerceCrmEnvelope,
  AlliedCommerceResponse,
  AlliedCommerceSearchCrmEnvelope,
  AlliedCommerceSearchResponse,
} from '@/types/index.js'

const SEARCH_PER_PAGE = 15

/**
 * Servicio para gestionar comercios aliados del CRM
 *
 * Endpoints disponibles:
 * - GET /allied_commerces/{allied_commerce_id} - Detalle de un comercio aliado
 * - GET /allied_commerces/search - Búsqueda por keywords
 */
export class AlliedCommerceService extends BaseService {
  /**
   * Obtener información detallada de un comercio aliado específico.
   * Desenvuelve el sobre CRM `{ status, message, data: { alliedCommerce } }`.
   */
  async getAlliedCommerceById(alliedCommerceId: number): Promise<ApiResponse<AlliedCommerceResponse>> {
    const result = await this.get<AlliedCommerceCrmEnvelope>(`/allied_commerces/${alliedCommerceId}`)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UnknownError',
          message: `No se pudo obtener el comercio aliado ${alliedCommerceId}`,
        },
      }
    }

    const envelope = result.data
    const alliedCommerce = envelope.data?.alliedCommerce

    if (!envelope.status || !alliedCommerce) {
      return {
        success: false,
        error: {
          error: envelope.error || 'NotFound',
          message: envelope.message || `El comercio aliado ${alliedCommerceId} no existe`,
          statusCode: 404,
        },
      }
    }

    return {
      success: true,
      data: { alliedCommerce },
    }
  }

  /**
   * Buscar comercios aliados por keywords (OR; LIKE en razon_social OR descripcion).
   * Siempre página 1 con per_page=15.
   */
  async searchByKeywords(keywords: string[]): Promise<ApiResponse<AlliedCommerceSearchResponse>> {
    const query = this.serializeLaravelArrayParams({ keywords, per_page: SEARCH_PER_PAGE })
    const result = await this.get<AlliedCommerceSearchCrmEnvelope>(`/allied_commerces/search?${query}`)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UnknownError',
          message: 'No se pudieron buscar comercios aliados',
        },
      }
    }

    const envelope = result.data
    const alliedCommerces = envelope.data?.alliedCommerces

    if (!envelope.status || !alliedCommerces) {
      return {
        success: false,
        error: {
          error: envelope.error || 'BadRequest',
          message: envelope.message || 'Error en la búsqueda de comercios aliados',
          statusCode: 400,
        },
      }
    }

    return {
      success: true,
      data: { alliedCommerces },
    }
  }
}
