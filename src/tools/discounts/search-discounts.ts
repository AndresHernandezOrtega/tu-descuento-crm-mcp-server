import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DiscountService } from '@services/discount-service.js'
import type { Discount } from '@/types/index.js'
import { ok, fail, mapApiError, rejectUnknownArgs } from '@tools/tool-result.js'
import { formatDiscountBenefit, truncateRedemption } from '@tools/discounts/discount-format.js'

const SINGLE_WORD = /^\S+$/

const CITY_HINT =
  'No envíes city ni frases con espacios. Parte la frase en keywords de una sola palabra. ' +
  'La cobertura por municipio usa el resource tudescuento://forms/client-creation y get_commerce_branches. ' +
  'Este tool siempre devuelve la página 1 (hasta 15).'

const inputSchema = {
  keywords: z
    .array(z.string())
    .min(1)
    .describe(
      'Array de keywords (mín. 1). Cada ítem debe ser UNA sola palabra sin espacios. ' +
        'OR entre keywords; busca solo en nombre y descripcion del descuento. Ejemplo: ["almuerzo","spa"]',
    ),
  city: z
    .unknown()
    .optional()
    .describe('NO ENVIAR. No existe filtro city. Si se envía, responde UNKNOWN_TOOL_ARGS.'),
}

const outputSchema = {
  discounts: z.array(z.unknown()),
  total: z.number(),
  current_page: z.number(),
  last_page: z.number(),
  per_page: z.number(),
  keywords: z.array(z.string()),
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

function formatDiscountLine(d: Discount, index: number): string {
  const commerce = d.allied_commerce?.razon_social ?? `comercio #${d.allied_commerce_id}`
  const benefit = formatDiscountBenefit(d)
  const redemption = truncateRedemption(d.descripcion_redencion)
  const plans =
    d.memberships && d.memberships.length > 0
      ? ` | planes: ${d.memberships.map((m) => m.nombre).slice(0, 2).join(', ')}${d.memberships.length > 2 ? '…' : ''}`
      : ''
  const redemptionPart = redemption ? ` — ${redemption}` : ''
  return `${index + 1}. ${d.nombre} — ${commerce} (${benefit})${redemptionPart}${plans}`
}

export function registerSearchDiscounts(server: McpServer): void {
  server.registerTool(
    'search_discounts',
    {
      title: 'Buscar descuentos por keywords',
      description:
        'Busca descuentos por keywords (OR entre ellas; LIKE case-insensitive solo en nombre OR descripcion del descuento). ' +
        'No busca en razón social del comercio ni en categorías. Siempre devuelve la página 1 con per_page=15. ' +
        'El endpoint del CRM acepta page y per_page, pero este tool no los expone. ' +
        'Rechaza frases con espacios y el argumento city. Incluye allied_commerce, memberships (planes que cubren el descuento vía M2M), ' +
        'descripcion_redencion (cómo redimir) y categories (rubro/taxonomía, no aplicabilidad por plan). ' +
        'tipo_beneficio: PORCENTAJE usa porcentaje; PORCENTAJE_VALOR_FIJO usa porcentaje y valor_fijo. ' +
        'Para detalle del comercio usa get_allied_commerce; para descuentos de un plan concreto usa get_membership_discounts.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ keywords: rawKeywords, city }) => {
      const rejected = rejectUnknownArgs({ city }, CITY_HINT)
      if (rejected) return rejected

      const normalized = normalizeKeywords(rawKeywords ?? [])
      if (!normalized.ok) {
        return fail('VALIDATION_ERROR', normalized.message, CITY_HINT)
      }
      const { keywords } = normalized

      const service = new DiscountService()
      const result = await service.searchByKeywords(keywords)

      if (!result.success || !result.data) {
        return mapApiError(result.error, 'No se pudieron buscar descuentos')
      }

      const paginator = result.data.discounts
      const items = paginator.data ?? []
      const lines = items.slice(0, 12).map((d, i) => formatDiscountLine(d, i))

      const summary =
        `Descuentos (página ${paginator.current_page}/${paginator.last_page}): ` +
        `${items.length} de ${paginator.total} — keywords: ${keywords.join(', ')}\n` +
        lines.join('\n') +
        (items.length > 12 ? `\n… y ${items.length - 12} más en structuredContent` : '')

      return ok(
        {
          discounts: items,
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
