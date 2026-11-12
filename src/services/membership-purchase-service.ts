import { BaseService } from '@services/base-service.js'
import type { ApiResponse, PaymentByReferenceData, PaymentByReferenceEnvelope } from '@/types/index.js'

/**
 * Consulta de estado Wompi por referencia.
 * Solo GET /membership_purchases/reference/{reference}. Sin cobro ni widget.
 */
export class MembershipPurchaseService extends BaseService {
  async getByReference(reference: string): Promise<ApiResponse<PaymentByReferenceData>> {
    const result = await this.get<PaymentByReferenceEnvelope>(
      `/membership_purchases/reference/${encodeURIComponent(reference)}`,
    )

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UnknownError',
          message: 'No se pudo consultar la referencia de pago',
        },
      }
    }

    const envelope = result.data
    if (!envelope.status || !envelope.data) {
      return {
        success: false,
        error: {
          error: envelope.error || 'NotFound',
          message: envelope.message || 'Transacción no encontrada',
          statusCode: envelope.error === 'not_found' ? 404 : 422,
        },
      }
    }

    return { success: true, data: envelope.data }
  }
}
