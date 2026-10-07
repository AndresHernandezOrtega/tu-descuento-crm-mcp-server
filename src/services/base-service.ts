import { ApiClient } from '@services/api-client.js'
import type { ApiResponse } from '@/types/index.js'

/**
 * Clase base para todos los servicios del CRM
 * Proporciona acceso al cliente HTTP y métodos auxiliares comunes
 *
 * Uso:
 * ```typescript
 * export class LeadService extends BaseService {
 *   async getLeads() {
 *     return this.get<Lead[]>('/leads')
 *   }
 *
 *   async getLeadById(id: number) {
 *     return this.get<Lead>(`/leads/${id}`)
 *   }
 *
 *   async createLead(data: CreateLeadDto) {
 *     return this.post<Lead>('/leads', data)
 *   }
 * }
 * ```
 */
export abstract class BaseService extends ApiClient {
  /**
   * Validar que una respuesta fue exitosa
   * Lanza un error si la respuesta contiene un error
   */
  protected validateResponse<T>(response: ApiResponse<T>): T {
    if (!response.success || !response.data) {
      const errorMessage = response.error?.message || 'Error desconocido'
      throw new Error(errorMessage)
    }
    return response.data
  }

  /**
   * Extraer mensaje de error de una respuesta
   */
  protected getErrorMessage(response: ApiResponse<any>): string {
    return response.error?.message || 'Ha ocurrido un error inesperado'
  }

  /**
   * Construir query params para peticiones
   * Filtra valores undefined o null
   */
  protected buildQueryParams(params: Record<string, any>): Record<string, any> {
    const cleanParams: Record<string, any> = {}

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleanParams[key] = value
      }
    }

    return cleanParams
  }

  /**
   * Serializa query params estilo Laravel: keywords[]=a&keywords[]=b&per_page=15
   * (Axios por defecto usaría keywords[][0]=a).
   */
  protected serializeLaravelArrayParams(params: {
    keywords: string[]
    per_page?: number
  }): string {
    const search = new URLSearchParams()
    for (const kw of params.keywords) {
      search.append('keywords[]', kw)
    }
    if (params.per_page !== undefined) {
      search.append('per_page', String(params.per_page))
    }
    return search.toString()
  }
}
