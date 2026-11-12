import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerGetCostumerByIdentification } from '@tools/costumers/get-costumer-by-identification.js'
import { registerGetCustomerByIdentification } from '@tools/costumers/get-customer-by-identification.js'
import { registerFindClient } from '@tools/costumers/find-client.js'
import { registerGetContractBeneficiaries } from '@tools/costumers/get-contract-beneficiaries.js'
import { registerForgotPassword } from '@tools/auth/forgot-password.js'
import { registerGetCategories } from '@tools/categories/get-categories.js'
import { registerGetMemberships } from '@tools/memberships/get-memberships.js'
import { registerGetMembership } from '@tools/memberships/get-membership.js'
import { registerGetMembershipDiscounts } from '@tools/memberships/get-membership-discounts.js'
import { registerGetClientMembershipStatus } from '@tools/memberships/get-client-membership-status.js'
import { registerGetClientPlanBenefits } from '@tools/memberships/get-client-plan-benefits.js'
import { registerGetPaymentByReference } from '@tools/memberships/get-payment-by-reference.js'
import { registerGetAlliedCommerce } from '@tools/allied-commerces/get-allied-commerce.js'
import { registerGetAlliedCommercesByCategory } from '@tools/allied-commerces/get-allied-commerces-by-category.js'
import { registerSearchAlliedCommerces } from '@tools/allied-commerces/search-allied-commerces.js'
import { registerGetCommerceBranches } from '@tools/allied-commerces/get-commerce-branches.js'
import { registerSearchDiscounts } from '@tools/discounts/search-discounts.js'
import { registerCreateLead } from '@tools/leads/create-lead.js'
import { registerGetLead } from '@tools/leads/get-lead.js'
import { registerGetSupportLogs } from '@tools/support-logs/get-support-logs.js'
import { registerGetSupportLog } from '@tools/support-logs/get-support-log.js'
import { registerCreateSupportLog } from '@tools/support-logs/create-support-log.js'

type ToolRegistrar = (server: McpServer) => void

/**
 * Lista de registradores de tools.
 * Cada función llama a server.registerTool(...) con Zod, annotations y outputSchema.
 */
const toolRegistrars: ToolRegistrar[] = [
  registerGetCostumerByIdentification,
  registerGetCustomerByIdentification,
  registerFindClient,
  registerGetClientMembershipStatus,
  registerGetClientPlanBenefits,
  registerGetMembership,
  registerGetContractBeneficiaries,
  registerGetPaymentByReference,
  registerGetLead,
  registerGetSupportLog,
  registerGetCommerceBranches,
  registerForgotPassword,
  registerGetCategories,
  registerGetMemberships,
  registerGetMembershipDiscounts,
  registerGetAlliedCommerce,
  registerGetAlliedCommercesByCategory,
  registerSearchAlliedCommerces,
  registerSearchDiscounts,
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
