import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { CostumerService } from '@services/costumer-service.js'
import { fail, mapApiError } from '@tools/tool-result.js'

export function asId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value)
  return null
}

export function dateLabel(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 10)
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  return null
}

export function unwrapClient(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>
  const nested = record.client ?? record.costumer
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  if ('numero_identificacion' in record || 'primer_nombre' in record) return record
  return null
}

export function displayName(client: Record<string, unknown>): string {
  const parts = ['primer_nombre', 'otros_nombres', 'primer_apellido', 'segundo_apellido']
    .map((key) => client[key])
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
  if (parts.length > 0) return parts.join(' ')
  if (typeof client.nombre === 'string' && client.nombre.trim()) return client.nombre.trim()
  if (typeof client.nombre_preferencia === 'string' && client.nombre_preferencia.trim()) {
    return client.nombre_preferencia.trim()
  }
  return 'Cliente'
}

export function municipalityName(client: Record<string, unknown>): string | null {
  const muni = client.municipalitie ?? client.municipality
  if (!muni || typeof muni !== 'object' || Array.isArray(muni)) return null
  const name = (muni as Record<string, unknown>).name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export function readCurrentContract(client: Record<string, unknown>): Record<string, unknown> | null {
  const value = client.current_contract ?? client.currentContract
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const contract = value as Record<string, unknown>
  if (asId(contract.id) == null && !contract.estado && !contract.membership && !contract.membership_id) {
    return null
  }
  return contract
}

export function readMembership(contract: Record<string, unknown>): { id: number | null; nombre: string | null } {
  const membership = contract.membership
  const idFromContract = asId(contract.membership_id)
  if (membership && typeof membership === 'object' && !Array.isArray(membership)) {
    const record = membership as Record<string, unknown>
    return {
      id: asId(record.id) ?? idFromContract,
      nombre: typeof record.nombre === 'string' && record.nombre.trim() ? record.nombre.trim() : null,
    }
  }
  return { id: idFromContract, nombre: null }
}

export function lastDigits(value: unknown, count = 4): string {
  const raw = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
  if (!raw) return ''
  return raw.length <= count ? raw : raw.slice(-count)
}

export function summarizeClient(client: Record<string, unknown>): string {
  const contract = readCurrentContract(client)
  const lines = [
    `Cliente: ${displayName(client)}`,
    `Identificación: ${typeof client.numero_identificacion === 'string' ? client.numero_identificacion : 'N/A'}`,
    `Email: ${typeof client.email === 'string' ? client.email : 'N/A'} | Celular: ${typeof client.celular === 'string' ? client.celular : 'N/A'}`,
    `Municipio: ${municipalityName(client) ?? 'N/A'}`,
  ]
  if (!contract) {
    lines.push('Contrato vigente: no')
    return lines.join('\n')
  }
  const membership = readMembership(contract)
  const inicio = dateLabel(contract.fecha_inicio_vigencia) ?? '?'
  const fin = dateLabel(contract.fecha_fin_vigencia) ?? '?'
  const plan = membership.nombre ?? 'sin nombre'
  const planId = membership.id != null ? ` (ID ${membership.id})` : ''
  lines.push(`Contrato: ${typeof contract.estado === 'string' ? contract.estado : 'sin estado'} (${inicio} → ${fin})`)
  lines.push(`Plan: ${plan}${planId}`)
  return lines.join('\n')
}

export function noActiveMembership(): CallToolResult {
  return fail(
    'NO_ACTIVE_MEMBERSHIP',
    'El cliente no tiene un contrato vigente.',
    'Lista planes públicos con get_memberships (scope public) o registra interés con create_lead. No crees un contrato ni inicies un pago.',
  )
}

export async function loadClient(numeroIdentificacion: string): Promise<
  | { ok: true; client: Record<string, unknown>; envelope: unknown }
  | { ok: false; error: CallToolResult }
> {
  const trimmed = numeroIdentificacion.trim()
  if (!trimmed) {
    return { ok: false, error: fail('VALIDATION_ERROR', 'numero_identificacion es requerido') }
  }

  const service = new CostumerService()
  const result = await service.getCostumerByIdentification(trimmed)
  if (!result.success || !result.data) {
    if (result.error?.statusCode === 404) {
      return {
        ok: false,
        error: fail(
          'NOT_FOUND',
          result.error.message || 'Cliente no encontrado',
          'Si la persona quiere afiliarse, usa create_lead. No listes la base de clientes.',
        ),
      }
    }
    return { ok: false, error: mapApiError(result.error, 'No se pudo obtener la información del cliente') }
  }

  const client = unwrapClient(result.data)
  if (!client) {
    return { ok: false, error: fail('UPSTREAM_ERROR', 'El CRM respondió sin el objeto client.') }
  }
  return { ok: true, client, envelope: result.data }
}
