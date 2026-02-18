import { Category } from './category'

export interface Membership {
  id: number
  nombre: string
  descripcion: string
  meses_duracion: number
  numero_beneficiarios: number
  color: string
  is_venta_publico: boolean
  created_at: string
  updated_at: string
  precio_membresia: number
  categories?: CategoryWithPivot[]
}

export interface CategoryWithPivot extends Category {
  pivot: {
    membership_id: number
    category_id: number
  }
}

export interface PublicMembershipsResponse {
  memberships: Membership[]
}
