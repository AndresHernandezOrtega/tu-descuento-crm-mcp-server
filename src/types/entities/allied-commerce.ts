import { Discount } from './discount'

interface Commerce {
  id: number
  code: string
  razon_social: string
  tipo_persona: string
  numero_identificacion: string
  digito_verificacion?: string | null
  telefono: string
  email: string
  direccion_domicilio_principal: string
  api_token?: string
  descripcion: string
  created_at?: string
  updated_at?: string
  representante_legal: Partial<RepresentanteLegal>
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
