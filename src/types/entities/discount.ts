import { Category } from './category'

export interface Discount {
  id: number
  nombre: string
  tipo_beneficio: 'PORCENTAJE' | 'VALOR_FIJO'
  porcentaje: number | null
  valor_fijo: null | number
  descripcion: string
  condiciones: string | string[]
  activo: boolean
  allied_commerce_id: number
  aplicable?: boolean
  created_at: string
  updated_at: string
  categories?: Category[]
}

export interface DiscountWithPivot {
  id: number
  nombre: string
  tipo_beneficio: 'PORCENTAJE' | 'VALOR_FIJO'
  porcentaje: number | null
  valor_fijo: number | null
  descripcion: string
  condiciones: string
  activo: boolean
  allied_commerce_id: number
  created_at: string
  updated_at: string
  pivot: {
    category_id: number
    discount_id: number
  }
  allied_commerce: AlliedCommerceSimple
}

export interface AlliedCommerceSimple {
  id: number
  razon_social: string
  telefono: string
  descripcion: string
}

export interface MembershipDiscountsResponse {
  discounts: DiscountWithPivot[]
}
