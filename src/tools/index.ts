import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerGetCostumerByIdentification } from '@tools/costumers/get-costumer-by-identification.js'
import { registerForgotPassword } from '@tools/auth/forgot-password.js'
import { registerGetCategories } from '@tools/categories/get-categories.js'
import { registerGetMemberships } from '@tools/memberships/get-memberships.js'
import { registerGetMembershipDiscounts } from '@tools/memberships/get-membership-discounts.js'
import { registerGetAlliedCommerce } from '@tools/allied-commerces/get-allied-commerce.js'
import { registerGetAlliedCommercesByCategory } from '@tools/allied-commerces/get-allied-commerces-by-category.js'
import { registerCreateLead } from '@tools/leads/create-lead.js'
import { registerGetSupportLogs } from '@tools/support-logs/get-support-logs.js'
import { registerCreateSupportLog } from '@tools/support-logs/create-support-log.js'

type ToolRegistrar = (server: McpServer) => void

/**
 * Lista de registradores de tools.
 * Cada función llama a server.registerTool(...) con Zod, annotations y outputSchema.
 */
const toolRegistrars: ToolRegistrar[] = [
  registerGetCostumerByIdentification,
  registerForgotPassword,
  registerGetCategories,
  registerGetMemberships,
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
