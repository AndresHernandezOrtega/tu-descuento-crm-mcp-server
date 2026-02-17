/**
 * Agente de IA del CRM
 *
 * Representa la configuración de un agente de soporte inteligente
 */
export interface AiAgent {
  id: number
  name: string
  description: string
  writing_tone: string
  personality_traits: string
  response_style: string
  knowledge_areas: string[]
  status: string
  metadata: AiAgentMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Metadata del Agente de IA
 */
export interface AiAgentMetadata {
  version: string
  languages: string[]
  department: string
  max_tokens: number
  temperature: number
  specialization?: string
  [key: string]: any
}

/**
 * DTO para crear un Agente de IA
 */
export interface CreateAiAgentDto {
  name: string
  description: string
  writing_tone: string
  personality_traits: string
  response_style: string
  knowledge_areas: string[]
  status?: string
  metadata?: Partial<AiAgentMetadata>
}

/**
 * DTO para actualizar un Agente de IA
 */
export interface UpdateAiAgentDto {
  name?: string
  description?: string
  writing_tone?: string
  personality_traits?: string
  response_style?: string
  knowledge_areas?: string[]
  status?: string
  metadata?: Partial<AiAgentMetadata>
}
