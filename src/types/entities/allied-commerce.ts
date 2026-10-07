import type { AlliedCommerceDiscountSummary, Discount } from './discount.js'
import type { LaravelPaginatedResponse } from '../api.js'

export interface AlliedCommerceBranch {
  id: number
  name: string
  [key: string]: unknown
}

export interface AlliedCommerce {
  id: number
  code?: string
  razon_social: string
  tipo_persona?: string
  numero_identificacion?: string
  digito_verificacion?: number | null
  telefono?: string | null
  email?: string | null
  direccion_domicilio_principal?: string | null
  api_token?: string
  descripcion?: string | null
  profile_img?: string | null
  created_at?: string
  updated_at?: string
  representante_legal?: RepresentanteLegal | number
  users?: UserAlliedCommerce[]
  discounts?: Array<Discount | AlliedCommerceDiscountSummary>
  branches?: AlliedCommerceBranch[]
}

export interface RepresentanteLegal {
  id: number
  nombre: string
  type_document_id: number
  numero_identificacion: string
  email: string
  telefono: string
  cargo: string
  allied_commerce_id: number
  created_at?: string
  updated_at?: string
}

export interface TypeUser {
  id: number
  name: string
  description: string
  created_at: string | null
  updated_at: string | null
}

export interface UserAlliedCommerce {
  id: number
  type_user_id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
  pivot: {
    allied_commerce_id: number
    user_id: number
  }
  type_user: TypeUser
  tokens: any[]
}

/** Payload estable tras desenvolver el sobre del CRM. */
export interface AlliedCommerceResponse {
  alliedCommerce: AlliedCommerce
}

/**
 * Respuesta cruda de GET /allied_commerces/{id}
 * (status / message / data / error).
 */
export interface AlliedCommerceCrmEnvelope {
  status: boolean
  message: string
  data: { alliedCommerce: AlliedCommerce } | null
  error: string | null
}

/** Payload estable tras unwrap de GET /allied_commerces/search */
export interface AlliedCommerceSearchResponse {
  alliedCommerces: LaravelPaginatedResponse<AlliedCommerce>
}

/** Respuesta cruda CRM de GET /allied_commerces/search */
export interface AlliedCommerceSearchCrmEnvelope {
  status: boolean
  message: string
  data: { alliedCommerces: LaravelPaginatedResponse<AlliedCommerce> } | null
  error: string | null
}
