import type { AlliedCommerce } from './allied-commerce'

export interface Category {
  id: number
  name: string
  descripcion: string
  created_at: string
  updated_at: string
}

export interface CategoryWithAlliedCommerces extends Category {
  allied_commerces: AlliedCommerce[]
}

export interface CategoryWithAlliedCommercesResponse {
  category: CategoryWithAlliedCommerces
}
