import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AlliedCommerceService } from '@services/allied-commerce-service.js'
import type { AlliedCommerce } from '@/types/index.js'
import { ok, fail, mapApiError } from '@tools/tool-result.js'

const SINGLE_WORD = /^\S+$/

const inputSchema = {
  keywords: z
    .array(z.string())
    .min(1)
    .describe(
      'Array de keywords (mín. 1). Cada ítem debe ser UNA sola palabra sin espacios. ' +
        'OR entre keywords; busca en razon_social y descripcion. Ejemplo: ["spa","gimnasio"]',
    ),
}

const outputSchema = {
  allied_commerces: z.array(z.unknown()),
  total: z.number(),
  current_page: z.number(),
  last_page: z.number(),
  per_page: z.number(),
  keywords: z.array(z.string()),
}

function sanitizeCommerce(c: AlliedCommerce): Record<string, unknown> {
  const { api_token: _token, users, ...rest } = c
  const safeUsers = users?.map(({ tokens: _t, ...u }) => u)
  return {
    ...rest,
    ...(safeUsers ? { users: safeUsers } : {}),
  }
}

function normalizeKeywords(raw: string[]): { ok: true; keywords: string[] } | { ok: false; message: string } {
  const keywords = raw.map((k) => k.trim()).filter((k) => k.length > 0)
  if (keywords.length === 0) {
    return { ok: false, message: 'keywords debe contener al menos una palabra no vacía' }
  }
  const multi = keywords.find((k) => !SINGLE_WORD.test(k))
  if (multi) {
    return {
      ok: false,
      message:
        `Cada keyword debe ser una sola palabra (sin espacios). Recibido: "${multi}". ` +
        `Ejemplo: "buen sabor" → ["buen","sabor"]`,
    }
  }
  return { ok: true, keywords }
}

export function registerSearchAlliedCommerces(server: McpServer): void {
  server.registerTool(
    'search_allied_commerces',
    {
      title: 'Buscar comercios aliados por keywords',
      description:
        'Busca comercios aliados por keywords (OR entre ellas; LIKE case-insensitive en razon_social OR descripcion). ' +
        'Devuelve solo la primera página (hasta 15 resultados). ' +
        'Cada keyword debe ser una sola palabra. Los descuentos anidados suelen ser resumen { id, nombre, activo }. ' +
        'Para detalle del descuento (redención, planes) usa search_discounts o get_membership_discounts. ' +
        'Para detalle de un comercio usa get_allied_commerce con su id.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ keywords: rawKeywords }) => {
      const normalized = normalizeKeywords(rawKeywords ?? [])
      if (!normalized.ok) {
        return fail('VALIDATION_ERROR', normalized.message)
      }
      const { keywords } = normalized

      const service = new AlliedCommerceService()
      const result = await service.searchByKeywords(keywords)

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudieron buscar comercios aliados')
      }

      const paginator = result.data.alliedCommerces
      const items = (paginator.data ?? []).map(sanitizeCommerce)

      const lines = items.slice(0, 12).map((c, i) => {
        const discounts = Array.isArray(c.discounts) ? c.discounts : []
        const discountHint =
          discounts.length > 0
            ? ` — ${discounts
                .slice(0, 2)
                .map((d: { nombre?: string }) => d.nombre ?? 'descuento')
                .join(', ')}${discounts.length > 2 ? '…' : ''}`
            : ''
        return `${i + 1}. ${c.razon_social ?? 'Comercio'} (ID: ${c.id})${discountHint}`
      })

      const summary =
        `Comercios (página ${paginator.current_page}/${paginator.last_page}): ` +
        `${items.length} de ${paginator.total} — keywords: ${keywords.join(', ')}\n` +
        lines.join('\n') +
        (items.length > 12 ? `\n… y ${items.length - 12} más en structuredContent` : '')

      return ok(
        {
          allied_commerces: items,
          total: paginator.total,
          current_page: paginator.current_page,
          last_page: paginator.last_page,
          per_page: paginator.per_page,
          keywords,
        },
        summary,
      )
    },
  )
}
