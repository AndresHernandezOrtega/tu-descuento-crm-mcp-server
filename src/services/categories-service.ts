import { BaseService } from '@services/base-service.js'
import type { ApiResponse, Category, CategoryWithAlliedCommercesResponse } from '@/types/index.js'

/**
 * Servicio para gestionar categorías de descuentos del CRM
 *
 * Endpoints disponibles:
 * - GET /categories - Obtener todas las categorías disponibles
 * - GET /categories/{category_id}/allied_commerces - Obtener comercios aliados por categoría
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

  /**
   * Obtener los comercios aliados que tienen descuentos en una categoría específica
   *
   * @param categoryId - ID de la categoría
   * @returns Información de la categoría con los comercios aliados y sus descuentos
   */
  async getAlliedCommercesByCategory(categoryId: number): Promise<ApiResponse<CategoryWithAlliedCommercesResponse>> {
    return this.get<CategoryWithAlliedCommercesResponse>(`/categories/${categoryId}/allied_commerces`)
  }
}
