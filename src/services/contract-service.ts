import { BaseService } from '@services/base-service.js'
import type { ApiResponse, ContractBeneficiariesData, ContractBeneficiariesEnvelope } from '@/types/index.js'

/**
 * Consulta de beneficiarios del contrato vigente.
 * Solo GET /contracts/{contract_id}/beneficiaries. Sin alta.
 */
export class ContractService extends BaseService {
  async getBeneficiaries(contractId: number): Promise<ApiResponse<ContractBeneficiariesData>> {
    const result = await this.get<ContractBeneficiariesEnvelope>(`/contracts/${contractId}/beneficiaries`)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UnknownError',
          message: `No se pudieron obtener los beneficiarios del contrato ${contractId}`,
        },
      }
    }

    const envelope = result.data
    if (!envelope.status || !envelope.data) {
      return {
        success: false,
        error: {
          error: envelope.error || 'NotFound',
          message: envelope.message || `No se encontraron beneficiarios del contrato ${contractId}`,
          statusCode: 404,
        },
      }
    }

    return { success: true, data: envelope.data }
  }
}
