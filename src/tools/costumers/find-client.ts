import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CostumerService } from '@services/costumer-service.js'
import { displayName, lastDigits, municipalityName } from '@tools/costumers/client-record.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  email: z
    .string()
    .email()
    .optional()
    .describe('Email exacto. Al menos uno de email o celular. Ejemplo: ana@correo.com'),
  celular: z
    .string()
    .min(1)
    .optional()
    .describe('Celular exacto, tal como está en el CRM. Al menos uno de email o celular. Ejemplo: 3001234567'),
}

const candidateSchema = z.object({
  nombre: z.string(),
  municipio: z.string().nullable(),
  numero_identificacion: z.string().optional(),
  documento_ultimos_digitos: z.string().optional(),
})

const outputSchema = {
  total: z.number(),
  needs_disambiguation: z.boolean(),
  candidates: z.array(candidateSchema),
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function exactMatch(client: Record<string, unknown>, email?: string, celular?: string): boolean {
  if (email) {
    const current = typeof client.email === 'string' ? normalizeEmail(client.email) : ''
    if (current !== normalizeEmail(email)) return false
  }
  if (celular) {
    const current = typeof client.celular === 'string' ? client.celular.trim() : ''
    if (current !== celular.trim()) return false
  }
  return Boolean(email || celular)
}

function readRows(payload: unknown): { rows: Record<string, unknown>[]; total: number; complete: boolean } {
  if (Array.isArray(payload)) {
    return { rows: payload.filter((row) => row && typeof row === 'object') as Record<string, unknown>[], total: payload.length, complete: true }
  }
  if (!payload || typeof payload !== 'object') return { rows: [], total: 0, complete: true }
  const record = payload as Record<string, unknown>
  const data = record.data
  if (!Array.isArray(data)) return { rows: [], total: 0, complete: true }
  const rows = data.filter((row) => row && typeof row === 'object') as Record<string, unknown>[]
  const total = typeof record.total === 'number' ? record.total : rows.length
  return { rows, total, complete: total <= rows.length }
}

export function registerFindClient(server: McpServer): void {
  server.registerTool(
    'find_client',
    {
      title: 'Buscar cliente por email o celular',
      description:
        'Busca un cliente por email y/o celular exactos (GET /clients). Exige al menos uno. ' +
        'Si hay un único resultado y la página está completa, devuelve el documento para seguir con get_costumer_by_identification. ' +
        'Si hay varios, devuelve solo nombre, municipio y los últimos dígitos del documento, y pide desambiguación. ' +
        'No vuelca contratos ni lista la base. Si ya tienes el documento, usa get_costumer_by_identification.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ email, celular }) => {
      const emailTrimmed = email?.trim()
      const celularTrimmed = celular?.trim()
      if (!emailTrimmed && !celularTrimmed) {
        return fail(
          'VALIDATION_ERROR',
          'Indica email, celular o ambos.',
          'Con número de identificación usa get_costumer_by_identification. No listes la base de clientes.',
        )
      }

      const service = new CostumerService()
      const result = await service.findByContact({
        email: emailTrimmed,
        celular: celularTrimmed,
      })
      if (!result.success || result.data == null) {
        return mapApiError(result.error, 'No se pudo buscar el cliente por email o celular')
      }

      const { rows, total, complete } = readRows(result.data)
      const matches = rows.filter((row) => exactMatch(row, emailTrimmed, celularTrimmed))

      if (matches.length === 0 && !complete) {
        return fail(
          'VALIDATION_ERROR',
          'No se puede confirmar un match exacto sin recorrer la base de clientes.',
          'No se devuelven candidatos. Usa el documento con get_costumer_by_identification.',
        )
      }

      if (matches.length === 0) {
        return fail(
          'NOT_FOUND',
          'No hay un cliente con ese email o celular exactos.',
          'No listes la base. Si tienes el documento, usa get_costumer_by_identification. Si es un prospecto, usa get_lead o create_lead.',
        )
      }

      const pageWasExact = rows.length === 0 || matches.length === rows.length
      const uniqueAndComplete = matches.length === 1 && complete
      const candidates = matches.map((client) => {
        const nombre = displayName(client)
        const municipio = municipalityName(client)
        if (uniqueAndComplete && typeof client.numero_identificacion === 'string') {
          return { nombre, municipio, numero_identificacion: client.numero_identificacion }
        }
        return {
          nombre,
          municipio,
          documento_ultimos_digitos: lastDigits(client.numero_identificacion),
        }
      })

      const needsDisambiguation = !uniqueAndComplete
      const summary = needsDisambiguation
        ? `Hay ${matches.length} cliente(s) con esos datos${complete ? '' : ' en esta página'}. Pide el número de identificación para desambiguar.\n` +
          candidates
            .slice(0, 5)
            .map((candidate, index) => `${index + 1}. ${candidate.nombre} — ${candidate.municipio ?? 'sin municipio'} — doc …${candidate.documento_ultimos_digitos ?? ''}`)
            .join('\n')
        : `Un cliente coincide: ${candidates[0]?.nombre ?? 'Cliente'} (${candidates[0]?.municipio ?? 'sin municipio'}). Sigue con get_costumer_by_identification.`

      return ok(
        {
          total: pageWasExact ? total : matches.length,
          needs_disambiguation: needsDisambiguation,
          candidates,
        },
        summary,
      )
    },
  )
}
