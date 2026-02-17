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
export type { Lead, CreateLeadDto, UpdateLeadDto } from './entities/lead.js'
