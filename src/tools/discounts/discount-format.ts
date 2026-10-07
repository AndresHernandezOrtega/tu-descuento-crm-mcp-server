/**
 * Formatea la etiqueta de beneficio según tipo_beneficio del CRM.
 * PORCENTAJE → porcentaje; PORCENTAJE_VALOR_FIJO → porcentaje + valor fijo si existe.
 */
export function formatDiscountBenefit(d: {
  tipo_beneficio: string
  porcentaje?: number | null
  valor_fijo?: number | null
}): string {
  if (d.tipo_beneficio === 'PORCENTAJE' && d.porcentaje != null) {
    return `${d.porcentaje}%`
  }
  if (d.tipo_beneficio === 'PORCENTAJE_VALOR_FIJO') {
    const pct = d.porcentaje != null ? `${d.porcentaje}%` : ''
    const fixed =
      d.valor_fijo != null ? `$${d.valor_fijo.toLocaleString('es-CO')}` : ''
    if (pct && fixed) return `${pct} + ${fixed}`
    return pct || fixed || d.tipo_beneficio
  }
  return d.tipo_beneficio
}

/**
 * Trunca descripcion_redencion para líneas de summary.
 */
export function truncateRedemption(text: string | undefined, maxLen = 60): string {
  if (!text?.trim()) return ''
  const t = text.trim()
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`
}
