import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerCostumerLookup } from '@tools/costumers/get-costumer-by-identification.js'

/** Misma función que get_costumer_by_identification. No renombra el tool histórico. */
export function registerGetCustomerByIdentification(server: McpServer): void {
  registerCostumerLookup(server, 'get_customer_by_identification')
}
