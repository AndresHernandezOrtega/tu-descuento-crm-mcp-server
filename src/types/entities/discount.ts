import type { LaravelPaginatedResponse } from '../api.js'



/** Valores documentados en POST; ejemplos GET solo muestran PORCENTAJE. */

export type DiscountBenefitType = 'PORCENTAJE' | 'PORCENTAJE_VALOR_FIJO'



/** Categoría anidada en listados de descuento (rubro/taxonomía, no aplicabilidad por membresía). */

export interface DiscountCategoryRef {

  id: number

  name: string

  descripcion?: string

}



/** Membresía anidada en descuento (relación M2M discounts_memberships). */

export interface DiscountMembershipRef {

  id: number

  nombre: string

}



/** Comercio anidado en GET /discounts/search, index, show, random. */

export interface DiscountAlliedCommerceRef {

  id: number

  razon_social: string

  email?: string

  descripcion?: string

  telefono?: string

}



/** Comercio anidado en GET /memberships/{id}/discounts. */

export interface MembershipDiscountAlliedCommerce {

  id: number

  razon_social: string

  telefono: string

  descripcion: string

}



/** Descuento resumido anidado en GET /allied_commerces/search. */

export interface AlliedCommerceDiscountSummary {

  id: number

  nombre: string

  activo: boolean

}



/**

 * Descuento completo (search, index, show, random).

 * Aplicabilidad por membresía vía `memberships` (M2M), no por categorías.

 */

export interface Discount {

  id: number

  nombre: string

  tipo_beneficio: DiscountBenefitType

  porcentaje: number | null

  valor_fijo: number | null

  descripcion: string

  descripcion_redencion: string

  condiciones: string | string[]

  activo: boolean

  allied_commerce_id: number

  categories?: DiscountCategoryRef[]

  memberships?: DiscountMembershipRef[]

  allied_commerce?: DiscountAlliedCommerceRef

}



/** Ítem de GET /memberships/{membership_id}/discounts (sin pivot ni envelope). */

export interface MembershipDiscount {

  id: number

  nombre: string

  tipo_beneficio: DiscountBenefitType

  porcentaje: number | null

  valor_fijo?: number | null

  descripcion: string

  descripcion_redencion: string

  condiciones?: string | string[]

  activo?: boolean

  allied_commerce_id?: number

  allied_commerce: MembershipDiscountAlliedCommerce

}



export interface MembershipDiscountsResponse {

  discounts: MembershipDiscount[]

}



/** Payload estable tras unwrap de GET /discounts/search */

export interface DiscountSearchResponse {

  discounts: LaravelPaginatedResponse<Discount>

}



/** Respuesta cruda CRM de GET /discounts/search */

export interface DiscountSearchCrmEnvelope {

  status: boolean

  message: string

  data: { discounts: LaravelPaginatedResponse<Discount> } | null

  error: string | null

}


