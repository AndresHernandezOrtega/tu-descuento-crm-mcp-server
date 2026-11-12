import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { asId, dateLabel, displayName, loadClient, municipalityName, noActiveMembership, readCurrentContract, readMembership } from '@tools/costumers/client-record.js'
import { ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento del cliente, sin puntos ni espacios. Ejemplo: 1234567890'),
}

const outputSchema = {
  numero_identificacion: z.string(),
  nombre: z.string(),
  municipio: z.string().nullable(),
  contrato: z.object({
    id: z.number(),
    estado: z.string().nullable(),
    numero_contrato: z.string().nullable(),
    fecha_inicio_vigencia: z.string().nullable(),
    fecha_fin_vigencia: z.string().nullable(),
  }),
  membership: z.object({
    id: z.number().nullable(),
    nombre: z.string().nullable(),
  }),
}

export function registerGetClientMembershipStatus(server: McpServer): void {
  server.registerTool(
    'get_client_membership_status',
    {
      title: 'Estado de membresía del cliente',
      description:
        'Resume el contrato vigente de un cliente por número de identificación: estado, fechas y plan (membership.nombre e id). ' +
        'Usa GET /clients/by_identification/{dni}. No devuelve el JSON crudo del cliente. ' +
        'Si no hay contrato vigente responde NO_ACTIVE_MEMBERSHIP: sigue con get_memberships (scope public) o create_lead. ' +
        'No crea contratos ni inicia pagos.',
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
      const id = contract ? asId(contract.id) : null
      if (!contract || id == null) return noActiveMembership()

      const membership = readMembership(contract)
      const structured = {
        numero_identificacion:
          typeof loaded.client.numero_identificacion === 'string'
            ? loaded.client.numero_identificacion
            : numero_identificacion.trim(),
        nombre: displayName(loaded.client),
        municipio: municipalityName(loaded.client),
        contrato: {
          id,
          estado: typeof contract.estado === 'string' ? contract.estado : null,
          numero_contrato: typeof contract.numero_contrato === 'string' ? contract.numero_contrato : null,
          fecha_inicio_vigencia: dateLabel(contract.fecha_inicio_vigencia),
          fecha_fin_vigencia: dateLabel(contract.fecha_fin_vigencia),
        },
        membership,
      }

      const summary =
        `${structured.nombre} — contrato ${structured.contrato.estado ?? 'sin estado'} #${structured.contrato.id}\n` +
        `Vigencia: ${structured.contrato.fecha_inicio_vigencia ?? '?'} → ${structured.contrato.fecha_fin_vigencia ?? '?'}\n` +
        `Plan: ${structured.membership.nombre ?? 'sin nombre'}${structured.membership.id != null ? ` (ID ${structured.membership.id})` : ''}\n` +
        `Municipio: ${structured.municipio ?? 'N/A'}`

      return ok(structured, summary)
    },
  )
}
