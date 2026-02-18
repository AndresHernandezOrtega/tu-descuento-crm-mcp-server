import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { config } from '@config/config.js'
import type { ApiResponse, ApiErrorResponse } from '@/types/index.js'

/**
 * Cliente HTTP base para interactuar con la API del CRM de TuDescuento
 * Proporciona manejo robusto de errores y métodos auxiliares para peticiones HTTP
 */
export class ApiClient {
  protected client: AxiosInstance

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || config.tuDescuentoApiUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000, // 30 segundos
    })

    // Interceptor de request para agregar token de autenticación
    this.client.interceptors.request.use(
      (config) => {
        const apiKey = process.env.TUDESCUENTO_API_KEY || ''
        if (apiKey) {
          config.headers.Authorization = `Bearer ${apiKey}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // Interceptor de response para logging (opcional)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Aquí se puede agregar logging de errores si se necesita
        return Promise.reject(error)
      },
    )
  }

  /**
   * Método GET genérico
   */
  protected async get<T>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(endpoint, {
        params,
        ...config,
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return this.handleError<T>(error)
    }
  }

  /**
   * Método POST genérico
   */
  protected async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(endpoint, data, config)

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return this.handleError<T>(error)
    }
  }

  /**
   * Método PUT genérico
   */
  protected async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<T>(endpoint, data, config)

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return this.handleError<T>(error)
    }
  }

  /**
   * Método PATCH genérico
   */
  protected async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<T>(endpoint, data, config)

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return this.handleError<T>(error)
    }
  }

  /**
   * Método DELETE genérico
   */
  protected async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(endpoint, config)

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return this.handleError<T>(error)
    }
  }

  /**
   * Manejo centralizado de errores HTTP
   * Convierte excepciones de Axios en respuestas ApiResponse consistentes
   */
  protected handleError<T>(error: unknown): ApiResponse<T> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>

      // Error de respuesta del servidor (4xx, 5xx)
      if (axiosError.response) {
        const status = axiosError.response.status
        const data = axiosError.response.data

        // Construir mensaje de error estructurado
        const apiError: ApiErrorResponse = {
          error: data?.error || this.getErrorNameByStatus(status),
          message: data?.message || axiosError.message,
          details: data?.details,
        }

        return {
          success: false,
          error: apiError,
        }
      }

      // Error de request (sin respuesta del servidor)
      if (axiosError.request) {
        return {
          success: false,
          error: {
            error: 'NetworkError',
            message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
          },
        }
      }

      // Error en la configuración del request
      return {
        success: false,
        error: {
          error: 'RequestConfigError',
          message: axiosError.message,
        },
      }
    }

    // Error desconocido (no Axios)
    return {
      success: false,
      error: {
        error: 'UnknownError',
        message: error instanceof Error ? error.message : 'Ha ocurrido un error inesperado',
      },
    }
  }

  /**
   * Obtener nombre de error según código de estado HTTP
   */
  private getErrorNameByStatus(status: number): string {
    const errorMap: { [key: number]: string } = {
      400: 'BadRequest',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'NotFound',
      409: 'Conflict',
      422: 'ValidationError',
      429: 'TooManyRequests',
      500: 'InternalServerError',
      502: 'BadGateway',
      503: 'ServiceUnavailable',
      504: 'GatewayTimeout',
    }

    return errorMap[status] || `HttpError${status}`
  }
}

/**
 * Instancia singleton del cliente API
 * Exportada para uso en servicios específicos
 */
export const apiClient = new ApiClient()
