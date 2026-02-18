import { Discount } from './discount'

export interface AlliedCommerce {
  id: number
  code: string
  razon_social: string
  tipo_persona: string
  numero_identificacion: string
  digito_verificacion?: number | null
  telefono: string
  email: string
  direccion_domicilio_principal: string
  api_token?: string
  descripcion: string
  created_at?: string
  updated_at?: string
  representante_legal?: RepresentanteLegal | number
  users?: UserAlliedCommerce[]
  discounts?: Discount[]
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

export interface AlliedCommerceResponse {
  alliedCommerce: AlliedCommerce
}
