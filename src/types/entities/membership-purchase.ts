/**
 * data de GET /membership_purchases/reference/{reference}.
 * Solo los campos que sirven para probar pertenencia y leer el estado Wompi.
 * Importes, método de pago y datos de contacto no se modelan para no devolverlos.
 */
export interface PaymentByReferenceData {
  reference?: string
  wompi_status?: string
  client_id?: number
  purchase?: {
    client_id?: number
    estado?: string
  } | null
  client?: {
    id?: number
    numero_identificacion?: string | null
  } | null
}

export interface PaymentByReferenceEnvelope {
  status: boolean
  message: string
  data: PaymentByReferenceData | null
  error: string | null
}
