export interface Municipalitie {
  id: number
  department_id: number
  name: string
  code: string
  created_at: Date
  updated_at: Date
  department: TypeDocumentIdentification
}

export interface TypeDocumentIdentification {
  id: number
  country_id?: number
  name: string
  code: string
  created_at: Date
  updated_at: Date
}
