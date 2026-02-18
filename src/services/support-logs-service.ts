import { BaseService } from '@services/base-service.js'
import type { ApiResponse, LaravelPaginatedResponse, SupportLog, CreateOrUpdateSupportLogDto, CreateSupportLogResponse } from '@/types/index.js'

/**
 * Parámetros de búsqueda para logs de soporte
 */
export interface GetSupportLogsParams {
  numero_identificacion: string
  created_at_start?: string // Formato Y-m-d (ej: 2026-01-01)
  created_at_end?: string // Formato Y-m-d (ej: 2026-01-31)
  page?: number
}

/**
 * Servicio para gestionar logs de historial de soporte/ventas del CRM
 *
 * Endpoints disponibles:
 * - GET /support_history_logs - Obtener logs de soporte por número de identificación con filtros de fecha opcionales
 * - POST /support_history_logs/from_bot - Crear o actualizar un log de soporte desde el bot
 */
export class SupportLogsService extends BaseService {
  /**
   * Obtener logs de historial de soporte filtrados por número de identificación
   * y opcionalmente por rango de fechas
   *
   * @param params - Parámetros de búsqueda incluyendo número de identificación requerido y fechas opcionales
   * @returns Lista paginada de logs de soporte con información del usuario que atendió y del cliente
   */
  async getSupportLogs(params: GetSupportLogsParams): Promise<ApiResponse<LaravelPaginatedResponse<SupportLog>>> {
    const queryParams = this.buildQueryParams({
      numero_identificacion: params.numero_identificacion,
      created_at_start: params.created_at_start,
      created_at_end: params.created_at_end,
      page: params.page,
    })

    return this.get<LaravelPaginatedResponse<SupportLog>>('/support_history_logs', queryParams)
  }

  /**
   * Crear o actualizar un log de soporte desde el bot de IA
   * Si existe un caso del día para el mismo número de identificación, se actualiza
   * Si no existe, se crea uno nuevo
   *
   * @param data - Datos del caso de soporte a registrar
   * @returns Respuesta con el log creado/actualizado y la acción realizada (created/updated)
   */
  async createOrUpdateSupportLog(data: CreateOrUpdateSupportLogDto): Promise<ApiResponse<CreateSupportLogResponse>> {
    return this.post<CreateSupportLogResponse>('/support_history_logs/from_bot', data)
  }
}
