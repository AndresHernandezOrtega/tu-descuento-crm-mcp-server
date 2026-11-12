import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AlliedCommerceService } from '@services/allied-commerce-service.js'
import type { AlliedCommerceBranch } from '@/types/index.js'
import { asId } from '@tools/costumers/client-record.js'
import { fail, mapApiError, ok } from '@tools/tool-result.js'

const inputSchema = {
  allied_commerce_id: z
    .number()
    .int()
    .positive()
    .describe('ID del comercio. Obtenlo con search_allied_commerces o get_allied_commerce. Ejemplo: 12'),
  municipalitie_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Filtro opcional aplicado en el MCP, no en el CRM. El id sale del resource tudescuento://forms/client-creation. No existe ?city=.',
    ),
}

const branchSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  municipalitie_id: z.number().nullable(),
  municipio: z.string().nullable(),
  is_virtual: z.boolean().nullable(),
  maps_url: z.string().nullable(),
})

const outputSchema = {
  allied_commerce_id: z.number(),
  municipalitie_id: z.number().nullable(),
  total: z.number(),
  branches: z.array(branchSchema),
}

function municipalityOf(branch: AlliedCommerceBranch): { id: number | null; name: string | null } {
  const record = branch as unknown as Record<string, unknown>
  const nested = record.municipalitie
  const nestedId =
    nested && typeof nested === 'object' && !Array.isArray(nested) ? asId((nested as Record<string, unknown>).id) : null
  const nestedName =
    nested && typeof nested === 'object' && !Array.isArray(nested) && typeof (nested as Record<string, unknown>).name === 'string'
      ? ((nested as Record<string, unknown>).name as string)
      : null
  return {
    id: asId(record.municipalitie_id) ?? nestedId,
    name: nestedName,
  }
}

function slimBranch(branch: AlliedCommerceBranch) {
  const record = branch as unknown as Record<string, unknown>
  const municipality = municipalityOf(branch)
  return {
    id: branch.id,
    name: typeof branch.name === 'string' ? branch.name : null,
    address: typeof record.address === 'string' ? record.address : null,
    municipalitie_id: municipality.id,
    municipio: municipality.name,
    is_virtual: typeof record.is_virtual === 'boolean' ? record.is_virtual : null,
    maps_url: typeof record.maps_url === 'string' ? record.maps_url : null,
  }
}

export function registerGetCommerceBranches(server: McpServer): void {
  server.registerTool(
    'get_commerce_branches',
    {
      title: 'Sucursales de un comercio',
      description:
        'Lista sucursales de un comercio aliado (GET /allied_commerces/{id}/branches). ' +
        'municipalitie_id es opcional y se filtra en el MCP; el CRM no ofrece ?city=. ' +
        'El id de municipio sale del resource tudescuento://forms/client-creation. ' +
        'Para saber si hay sucursal en un municipio: resource, search_allied_commerces y este tool. No pases city a get_memberships.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ allied_commerce_id, municipalitie_id }) => {
      if (!allied_commerce_id) {
        return fail('VALIDATION_ERROR', 'allied_commerce_id es requerido y debe ser un número positivo')
      }

      const service = new AlliedCommerceService()
      const result = await service.getBranches(allied_commerce_id)
      if (!result.success || !result.data) {
        return mapApiError(result.error, `No se pudieron obtener las sucursales del comercio ${allied_commerce_id}`)
      }

      const slim = result.data.branches.map(slimBranch)
      const filtered =
        municipalitie_id == null ? slim : slim.filter((branch) => branch.municipalitie_id === municipalitie_id)

      const lines = filtered.slice(0, 8).map((branch) => {
        const place = branch.municipio ?? (branch.municipalitie_id != null ? `municipio #${branch.municipalitie_id}` : 'sin municipio')
        return `- ${branch.name ?? `Sucursal #${branch.id}`}${branch.is_virtual ? ' (virtual)' : ''} — ${place}`
      })
      const scope = municipalitie_id == null ? 'todas' : `municipio ${municipalitie_id}`
      const summary =
        `Sucursales del comercio ${allied_commerce_id} (${scope}): ${filtered.length}\n` +
        (lines.length ? lines.join('\n') : 'Ninguna sucursal coincide con el filtro.') +
        (filtered.length > 8 ? `\n… y ${filtered.length - 8} más en structuredContent` : '')

      return ok(
        {
          allied_commerce_id,
          municipalitie_id: municipalitie_id ?? null,
          total: filtered.length,
          branches: filtered,
        },
        summary,
      )
    },
  )
}
