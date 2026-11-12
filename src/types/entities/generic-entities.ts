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

export interface Department {
  id: number
  name: string
  country_id?: number
  code?: string
  created_at?: string
  updated_at?: string
}

/**
 * GET /clients/creation.
 * El CRM escribe el typo `type_document_identifiactions`.
 */
export interface ClientCreationCatalog {
  type_document_identifiactions?: TypeDocumentIdentification[]
  type_document_identifications?: TypeDocumentIdentification[]
  municipalities: Municipalitie[]
  departments: Department[]
}
