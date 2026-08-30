import { Category } from './category'
import type { Discount } from './discount'

export interface Membership {
  id: number
  nombre: string
  descripcion: string
  meses_duracion: number
  numero_beneficiarios: number
  color: string
  is_venta_publico: boolean
  precio_membresia: number
  porcentaje_impuesto: number
  valor_impuesto: number
  valor_final: number
  created_at?: string
  updated_at?: string
  categories?: MembershipCategory[]
}

/** Categoría en listados de membresía: plana (público) o con discounts anidados (todas). */
export interface MembershipCategory {
  id: number
  name: string
  descripcion: string
  discounts?: Discount[]
  pivot?: {
    membership_id: number
    category_id: number
  }
}

/** @deprecated Prefer MembershipCategory; kept for callers that expect pivot. */
export interface CategoryWithPivot extends Category {
  pivot: {
    membership_id: number
    category_id: number
  }
}

export interface MembershipsResponse {
  memberships: Membership[]
}

/** Alias histórico; ambos endpoints usan el mismo wrapper. */
export type PublicMembershipsResponse = MembershipsResponse
