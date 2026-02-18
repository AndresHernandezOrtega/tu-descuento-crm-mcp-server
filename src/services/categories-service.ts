import { BaseService } from '@services/base-service.js'
import type { ApiResponse, Category } from '@/types/index.js'

/**
 * Servicio para gestionar categorías de descuentos del CRM
 *
 * Endpoints disponibles:
 * - GET /categories - Obtener todas las categorías disponibles
 */
export class CategoriesService extends BaseService {
  /**
   * Obtener todas las categorías de descuentos disponibles
   *
   * @returns Lista de todas las categorías registradas en el sistema
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.get<Category[]>('/categories')
  }
}
