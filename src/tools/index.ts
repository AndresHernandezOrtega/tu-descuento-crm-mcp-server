import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerGetCostumerByIdentification } from '@tools/costumers/costumer-information.js'
import { registerForgotPassword } from '@tools/costumers/forgot-password.js'
import { registerGetCategories } from '@tools/sales/categories.js'
import { registerGetPublicMemberships, registerGetMembershipDiscounts } from '@tools/sales/memberships.js'
import {
  registerGetAlliedCommerce,
  registerGetAlliedCommercesByCategory,
} from '@tools/sales/allied-commerces.js'
import { registerCreateLead } from '@tools/sales/leads.js'
import { registerGetSupportLogs, registerCreateSupportLog } from '@tools/documentation/support-bot-log.js'

type ToolRegistrar = (server: McpServer) => void

/**
 * Lista de registradores de tools.
 * Cada función llama a server.registerTool(...) con Zod, annotations y outputSchema.
 */
const toolRegistrars: ToolRegistrar[] = [
  registerGetCostumerByIdentification,
  registerForgotPassword,
  registerGetCategories,
  registerGetPublicMemberships,
  registerGetMembershipDiscounts,
  registerGetAlliedCommerce,
  registerGetAlliedCommercesByCategory,
  registerGetSupportLogs,
  registerCreateSupportLog,
  registerCreateLead,
]

/**
 * Registra todas las tools MCP en la instancia de McpServer.
 */
export function registerAllTools(server: McpServer): void {
  for (const register of toolRegistrars) {
    register(server)
  }
}
