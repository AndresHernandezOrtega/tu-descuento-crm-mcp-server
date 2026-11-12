import { Membership } from './membership'

export interface ContractBeneficiaryClient {
  id?: number
  primer_nombre?: string | null
  otros_nombres?: string | null
  primer_apellido?: string | null
  segundo_apellido?: string | null
  numero_identificacion?: string | null
}

export interface ContractBeneficiary {
  id: number
  client_id: number | null
  contract_id: number
  estado: string | null
  created_at?: string
  updated_at?: string
  client?: ContractBeneficiaryClient | null
}

/** data de GET /contracts/{contract_id}/beneficiaries */
export interface ContractBeneficiariesData {
  contract: {
    id: number
    estado: string | null
    fecha_inicio_vigencia: string | null
    fecha_fin_vigencia: string | null
    membership?: Membership | null
    titular?: unknown
  }
  total_beneficiarios: number
  beneficiarios_vinculados: number
  beneficiaries: ContractBeneficiary[]
}

export interface ContractBeneficiariesEnvelope {
  status: boolean
  message: string
  data: ContractBeneficiariesData | null
  error: string | null
}

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
