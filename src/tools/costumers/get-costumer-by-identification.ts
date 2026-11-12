import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { loadClient, summarizeClient } from '@tools/costumers/client-record.js'
import { ok } from '@tools/tool-result.js'

const inputSchema = {
  numero_identificacion: z
    .string()
    .min(1)
    .describe('Número de documento de identificación del cliente (cédula, NIT, pasaporte) sin puntos, guiones ni espacios. Ejemplo: 1234567890'),
}

const outputSchema = {
  costumer: z.unknown().describe('Cliente devuelto por el CRM, sin volcar el resumen otra vez en el texto'),
}

const BASE_DESCRIPTION =
  'Busca un cliente de Tu Descuento Colombia por número de identificación. ' +
  'El texto resume estado del contrato vigente, fechas, plan y municipio. El objeto va en structuredContent. ' +
  'Si no existe, NOT_FOUND: el siguiente paso es create_lead, no listar la base. ' +
  'Para email o celular sin documento usa find_client.'

export function registerCostumerLookup(
  server: McpServer,
  name: 'get_costumer_by_identification' | 'get_customer_by_identification',
): void {
  const alias = name === 'get_customer_by_identification'
  server.registerTool(
    name,
    {
      title: alias ? 'Buscar cliente por identificación (alias)' : 'Buscar cliente por identificación',
      description: alias
        ? `Alias de get_costumer_by_identification. Misma función; no reemplaza el nombre histórico. ${BASE_DESCRIPTION}`
        : `${BASE_DESCRIPTION} El alias get_customer_by_identification llama este mismo handler.`,
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
      return ok({ costumer: loaded.envelope }, summarizeClient(loaded.client))
    },
  )
}

export function registerGetCostumerByIdentification(server: McpServer): void {
  registerCostumerLookup(server, 'get_costumer_by_identification')
}
