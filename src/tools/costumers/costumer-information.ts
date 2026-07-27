import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CostumerService } from '@services/costumer-service.js'
import { ok, mapApiError } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe(
      'Número de documento de identificación del cliente (cédula, NIT, pasaporte) sin puntos, guiones ni espacios. Ejemplo: 1234567890',
    ),
}

const outputSchema = {
  costumer: z.unknown().describe('Objeto completo del cliente tal como lo devuelve el CRM'),
}

export function registerGetCostumerByIdentification(server: McpServer): void {
  server.registerTool(
    'get_costumer_by_identification',
    {
      title: 'Buscar cliente por identificación',
      description:
        'Busca y obtiene la información completa de un cliente registrado en Tu Descuento Colombia usando su número de identificación (cédula, NIT, etc.). ' +
        'Úsalo cuando necesites datos del cliente, contratos o estado de afiliación.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ numero_identificacion }) => {
      const service = new CostumerService()
      const result = await service.getCostumerByIdentification(numero_identificacion)

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudo obtener la información del cliente')
      }

      const payload = result.data as Record<string, unknown>
      const c = (payload.costumer ?? payload.client ?? payload) as Record<string, unknown>
      const name = [c.primer_nombre, c.primer_apellido].filter(Boolean).join(' ') || 'Cliente'
      const summary =
        `Cliente encontrado: ${name}\n` +
        `Identificación: ${c.numero_identificacion ?? numero_identificacion}\n` +
        `Email: ${c.email ?? 'N/A'} | Celular: ${c.celular ?? 'N/A'}`

      return ok({ costumer: result.data }, summary)
    },
  )
}
