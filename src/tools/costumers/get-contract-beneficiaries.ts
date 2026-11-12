import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ContractService } from '@services/contract-service.js'
import type { ContractBeneficiary } from '@/types/index.js'
import {
  asId,
  dateLabel,
  displayName,
  loadClient,
  noActiveMembership,
  readCurrentContract,
  readMembership,
} from '@tools/costumers/client-record.js'
import { mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Documento del titular. El tool usa solo su contrato vigente. Ejemplo: 1234567890'),
}

const beneficiarySchema = z.object({
  id: z.number(),
  client_id: z.number().nullable(),
  estado: z.string().nullable(),
  nombre: z.string(),
  numero_identificacion: z.string().nullable(),
})

const outputSchema = {
  numero_identificacion: z.string(),
  contract_id: z.number(),
  estado: z.string().nullable(),
  fecha_inicio_vigencia: z.string().nullable(),
  fecha_fin_vigencia: z.string().nullable(),
  membership: z.object({
    id: z.number().nullable(),
    nombre: z.string().nullable(),
  }),
  total_beneficiarios: z.number(),
  beneficiarios_vinculados: z.number(),
  beneficiaries: z.array(beneficiarySchema),
}

function slimBeneficiary(beneficiary: ContractBeneficiary) {
  const client = beneficiary.client
  const record = client && typeof client === 'object' ? (client as unknown as Record<string, unknown>) : null
  return {
    id: beneficiary.id,
    client_id: typeof beneficiary.client_id === 'number' ? beneficiary.client_id : null,
    estado: beneficiary.estado ?? null,
    nombre: record ? displayName(record) : 'Beneficiario',
    numero_identificacion:
      record && typeof record.numero_identificacion === 'string' ? record.numero_identificacion : null,
  }
}

export function registerGetContractBeneficiaries(server: McpServer): void {
  server.registerTool(
    'get_contract_beneficiaries',
    {
      title: 'Beneficiarios del contrato vigente',
      description:
        'Lista los beneficiarios del contrato vigente del titular (documento obligatorio). ' +
        'Resuelve el contrato con GET /clients/by_identification/{dni} y llama solo GET /contracts/{contract_id}/beneficiaries. ' +
        'No acepta otro contract_id y no da de alta beneficiarios. Sin contrato vigente: NO_ACTIVE_MEMBERSHIP.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion }) => {
      const loaded = await loadClient(numero_identificacion)
      if (!loaded.ok) return loaded.error

      const contract = readCurrentContract(loaded.client)
      const contractId = contract ? asId(contract.id) : null
      if (!contract || contractId == null) return noActiveMembership()

      const service = new ContractService()
      const result = await service.getBeneficiaries(contractId)
      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener los beneficiarios del contrato ${contractId}`)
      }

      const data = result.data
      const membership = data.contract?.membership
      const membershipRef =
        membership && typeof membership === 'object'
          ? readMembership({ membership, membership_id: membership.id })
          : readMembership(contract)
      const beneficiaries = (data.beneficiaries ?? []).map(slimBeneficiary)
      const dni =
        typeof loaded.client.numero_identificacion === 'string'
          ? loaded.client.numero_identificacion
          : numero_identificacion.trim()

      const structured = {
        numero_identificacion: dni,
        contract_id: contractId,
        estado: data.contract?.estado ?? (typeof contract.estado === 'string' ? contract.estado : null),
        fecha_inicio_vigencia: dateLabel(data.contract?.fecha_inicio_vigencia ?? contract.fecha_inicio_vigencia),
        fecha_fin_vigencia: dateLabel(data.contract?.fecha_fin_vigencia ?? contract.fecha_fin_vigencia),
        membership: membershipRef,
        total_beneficiarios: data.total_beneficiarios ?? beneficiaries.length,
        beneficiarios_vinculados: data.beneficiarios_vinculados ?? beneficiaries.filter((item) => item.estado === 'vinculado').length,
        beneficiaries,
      }

      const lines = beneficiaries.slice(0, 10).map((item, index) => {
        return `${index + 1}. ${item.nombre} (${item.numero_identificacion ?? 'sin documento'}) — ${item.estado ?? 'sin estado'}`
      })
      const summary =
        `Contrato vigente #${contractId}: ${structured.beneficiarios_vinculados} vinculado(s) de ${structured.total_beneficiarios}\n` +
        (lines.length ? lines.join('\n') : 'Sin beneficiarios.') +
        (beneficiaries.length > 10 ? `\n… y ${beneficiaries.length - 10} más en structuredContent` : '')

      return ok(structured, summary)
    },
  )
}
