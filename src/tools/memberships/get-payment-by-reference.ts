import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MembershipPurchaseService } from '@services/membership-purchase-service.js'
import type { PaymentByReferenceData } from '@/types/index.js'
import { asId, loadClient } from '@tools/costumers/client-record.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Documento del cliente ya identificable. La referencia solo se informa si la compra es de esta persona.'),
  reference: z
    .string()
    .min(1)
    .describe('Referencia de la transacción Wompi (GET /membership_purchases/reference/{reference}).'),
}

const outputSchema = {
  numero_identificacion: z.string(),
  reference: z.string(),
  wompi_status: z.string(),
}

const KNOWN_STATUSES = 'APPROVED, DECLINED, PENDING, VOIDED o ERROR'

function ownershipUnproven(): ReturnType<typeof fail> {
  return fail(
    'VALIDATION_ERROR',
    'No se puede confirmar que la referencia pertenezca a este cliente.',
    'No se devuelve el estado del pago. Verifica documento y referencia. No inicies un cobro ni consultes la referencia con otro documento.',
  )
}

function proveOwnership(data: PaymentByReferenceData, clientId: number | null, clientDni: string): boolean {
  const checks: boolean[] = []
  const pushId = (value: unknown) => {
    const id = asId(value)
    if (id == null) return
    checks.push(clientId != null && id === clientId)
  }

  pushId(data.client_id)
  pushId(data.purchase?.client_id)
  pushId(data.client?.id)

  const paymentDni = data.client?.numero_identificacion
  if (typeof paymentDni === 'string' && paymentDni.trim()) {
    checks.push(paymentDni.trim() === clientDni)
  }

  return checks.length > 0 && checks.every(Boolean)
}

export function registerGetPaymentByReference(server: McpServer): void {
  server.registerTool(
    'get_payment_by_reference',
    {
      title: 'Estado Wompi por referencia',
      description:
        'Devuelve solo el estado Wompi de una referencia si la compra pertenece al cliente del documento. ' +
        `Estados esperados: ${KNOWN_STATUSES}. ` +
        'Exige numero_identificacion. Si no se puede probar la pertenencia (no hay client_id ni documento cruzable, o no coincide), ' +
        'responde VALIDATION_ERROR y no devuelve la transacción. No crea compras ni abre el widget.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion, reference }) => {
      const loaded = await loadClient(numero_identificacion)
      if (!loaded.ok) return loaded.error

      const clientId = asId(loaded.client.id)
      const clientDni =
        typeof loaded.client.numero_identificacion === 'string' ? loaded.client.numero_identificacion.trim() : ''
      if (clientId == null && !clientDni) {
        return fail(
          'VALIDATION_ERROR',
          'El cliente resuelto no trae id ni documento. No se consulta el pago.',
          'Vuelve a identificar con get_costumer_by_identification.',
        )
      }

      const referenceTrimmed = reference.trim()
      const service = new MembershipPurchaseService()
      const result = await service.getByReference(referenceTrimmed)
      if (!result.success || !result.data) {
        if (result.error?.statusCode === 404) {
          return fail('NOT_FOUND', 'Transacción no encontrada.', 'Verifica la referencia. No inicies un pago.')
        }
        return mapApiError(result.error, 'No se pudo consultar la referencia de pago')
      }

      const data = result.data
      const referenceMatches = typeof data.reference !== 'string' || data.reference === referenceTrimmed
      const proven = referenceMatches && proveOwnership(data, clientId, clientDni)
      if (!proven) return ownershipUnproven()

      const wompiStatus = typeof data.wompi_status === 'string' ? data.wompi_status.trim() : ''
      if (!wompiStatus) {
        return fail(
          'VALIDATION_ERROR',
          'La compra corresponde al cliente, pero el CRM no envió wompi_status.',
          'No se devuelven otros datos de la transacción. No inicies un pago.',
        )
      }

      return ok(
        {
          numero_identificacion: clientDni || numero_identificacion.trim(),
          reference: referenceTrimmed,
          wompi_status: wompiStatus,
        },
        `Pago ${referenceTrimmed}: ${wompiStatus}`,
      )
    },
  )
}
