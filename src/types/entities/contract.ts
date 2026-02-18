import { Membership } from './membership'

export interface Contract {
  id: number
  convenio_corporativo_id: number
  numero_contrato: string
  fecha_inicio_vigencia: Date
  fecha_fin_vigencia: Date
  estado: string
  client_id: number
  membership_id: number
  created_at: Date
  updated_at: Date
  precio_aplicado: number
  membership: Membership
  beneficiaries: any[]
}
