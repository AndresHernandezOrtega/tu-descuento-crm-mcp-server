import { Contract } from './contract'
import { Municipalitie, TypeDocumentIdentification } from './generic-entities'

export interface Costumer {
  id: number
  code_prefix: number
  code: string
  codigo_referido: null
  primer_nombre: string
  otros_nombres: null
  primer_apellido: string
  segundo_apellido: string
  type_document_identifications_id: number
  fecha_nacimiento: Date
  edad: number
  municipalitie_id: number
  direccion_barrio: string
  direccion_tipo_calle: string
  direccion_calle: string
  direccion_numero: string
  direccion_observacion: null
  direccion_tipo: string
  telefono_fijo: null
  celular: string
  celular_secundario: null
  email: string
  profesion: null
  ocupacion_actual: null
  estado_civil: string
  created_at: Date
  updated_at: Date
  numero_identificacion: string
  genero: string
  mascotas: any[]
  numero_hijos: number
  nombre_preferencia: string
  hobby: string
  municipalitie: Municipalitie
  type_document_identification: TypeDocumentIdentification
  contracts: Contract[]
  current_contract: null
}
