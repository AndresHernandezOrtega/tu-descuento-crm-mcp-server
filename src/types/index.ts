/**
 * TIPOS DEL SERVIDOR MCP - TUDESCUENTO CRM
 *
 * Este archivo centraliza la exportación de todos los tipos del proyecto.
 * Los tipos están organizados por módulos:
 *
 * - api.ts: Tipos relacionados con el cliente HTTP y respuestas de API
 * - entities/: Tipos de entidades del CRM (cada entidad en su propio archivo)
 */

// ============================================
// TIPOS DEL CLIENTE HTTP/API
// ============================================
export type { LaravelPaginatedResponse, PaginationLink, GenericEntityResponse, ApiErrorResponse, ApiResponse } from './api.js'

// ============================================
// ENTIDADES DEL CRM
// ============================================

// Agentes de IA
export type { AiAgent, AiAgentMetadata, CreateAiAgentDto, UpdateAiAgentDto } from './entities/ai-agent.js'

// Leads
export type { Lead, CreateLeadDto, UpdateLeadDto, CreateLeadResponse } from './entities/lead.js'

// Clientes
export type { Costumer } from './entities/costumer.js'
export type { Contract } from './entities/contract.js'
export type { Municipalitie, TypeDocumentIdentification } from './entities/generic-entities.js'
export type { Membership, CategoryWithPivot, PublicMembershipsResponse } from './entities/membership.js'

// Categorías
export type { Category, CategoryWithAlliedCommerces, CategoryWithAlliedCommercesResponse } from './entities/category.js'

// Descuentos
export type { Discount, DiscountWithPivot, AlliedCommerceSimple, MembershipDiscountsResponse } from './entities/discount.js'

// Comercios Aliados
export type { AlliedCommerce, RepresentanteLegal, TypeUser, UserAlliedCommerce, AlliedCommerceResponse } from './entities/allied-commerce.js'

// Soporte y Documentación
export type { SupportLog, User, SupportLogsResponse, CreateOrUpdateSupportLogDto, CreateSupportLogResponse } from './entities/support-logs.js'
