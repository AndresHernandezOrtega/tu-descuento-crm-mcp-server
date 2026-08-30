import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { ApiErrorResponse } from '@/types/api.js'

export type ToolErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UPSTREAM_ERROR' | 'RATE_LIMITED' | 'UNKNOWN_ERROR'

/**
 * Respuesta exitosa: resumen + JSON completo en `content` (lo que el LLM/cliente
 * MCP suele inyectar al contexto) y los mismos datos tipados en `structuredContent`
 * (para hosts programáticos / validación con outputSchema).
 *
 * La spec MCP indica que si hay structuredContent también SHOULD ir el JSON
 * serializado en un TextContent — muchos clientes (p. ej. Cursor) solo exponen `content`.
 */
export function ok(structured: Record<string, unknown>, summary: string): CallToolResult {
  return {
    content: [
      { type: 'text', text: summary },
      { type: 'text', text: JSON.stringify(structured, null, 2) },
    ],
    structuredContent: structured,
  }
}

/**
 * Respuesta de error estandarizada. Sin structuredContent para no chocar con outputSchema.
 */
export function fail(code: ToolErrorCode, message: string, hint?: string): CallToolResult {
  const lines = [`[${code}] ${message}`]
  if (hint) {
    lines.push(`Hint: ${hint}`)
  }
  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    isError: true,
  }
}

/**
 * Mapea un error de la API CRM a un código estable para el agente.
 */
export function mapApiError(error?: ApiErrorResponse, fallbackMessage?: string): CallToolResult {
  const status = error?.statusCode
  const message = error?.message || fallbackMessage || 'Error en la API upstream'

  if (status === 404) {
    return fail('NOT_FOUND', message, 'Verifica el identificador o que el recurso exista en el CRM.')
  }
  if (status === 429) {
    return fail('RATE_LIMITED', message, 'Espera unos segundos y reintenta.')
  }
  if (status === 400 || status === 422) {
    return fail('VALIDATION_ERROR', message, error?.details ? JSON.stringify(error.details) : undefined)
  }
  if (status && status >= 500) {
    return fail('UPSTREAM_ERROR', message, 'El CRM no respondió correctamente. Puedes reintentar.')
  }

  return fail('UPSTREAM_ERROR', message)
}

/**
 * Aplica un límite local a un array (cuando el CRM no pagina).
 */
export function applyLimit<T>(items: T[], limit?: number): { items: T[]; total: number; truncated: boolean } {
  const total = items.length
  if (limit === undefined || limit <= 0 || limit >= total) {
    return { items, total, truncated: false }
  }
  return { items: items.slice(0, limit), total, truncated: true }
}
