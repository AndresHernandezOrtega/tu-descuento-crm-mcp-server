import { BaseService } from '@services/base-service.js'
import type { ApiResponse, AlliedCommerceCreationCatalog, ClientCreationCatalog } from '@/types/index.js'

const CATALOG_TIMEOUT_MS = 8000

const COMMERCE_LIST_KEYS = [
  'alliedCommerces',
  'allied_commerces',
  'alliedCommerce',
  'branches',
  'comercios',
  'new_commerce',
]

interface CrmEnvelope<T> {
  status?: boolean
  message?: string
  data?: T | null
  error?: string | null
}

function isClientCreationCatalog(payload: unknown): payload is ClientCreationCatalog {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const record = payload as Record<string, unknown>
  const documents = record.type_document_identifiactions ?? record.type_document_identifications
  return Array.isArray(documents) && Array.isArray(record.municipalities) && Array.isArray(record.departments)
}

function isAlliedCommerceFormCatalog(payload: unknown): payload is AlliedCommerceCreationCatalog {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const record = payload as Record<string, unknown>
  if (COMMERCE_LIST_KEYS.some((key) => key in record)) return false
  if (!Array.isArray(record.document_types)) return false
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && /commerce|comercio|sucursal|branch/i.test(key)) return false
  }
  return true
}

/**
 * Catálogos de formulario para resources MCP.
 * No consulta membresías ni descuentos.
 */
export class FormCatalogService extends BaseService {
  async getClientCreationCatalog(): Promise<ApiResponse<ClientCreationCatalog>> {
    const result = await this.get<ClientCreationCatalog>('/clients/creation', undefined, {
      timeout: CATALOG_TIMEOUT_MS,
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UpstreamError',
          message: 'El CRM no respondió en GET /clients/creation',
        },
      }
    }

    if (!isClientCreationCatalog(result.data)) {
      return {
        success: false,
        error: {
          error: 'InvalidCatalog',
          message: 'GET /clients/creation no devolvió municipios, departamentos y tipos de documento',
        },
      }
    }

    return { success: true, data: result.data }
  }

  async getAlliedCommerceCreationCatalog(): Promise<ApiResponse<AlliedCommerceCreationCatalog>> {
    const result = await this.get<CrmEnvelope<unknown>>('/allied_commerces/create', undefined, {
      timeout: CATALOG_TIMEOUT_MS,
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          error: 'UpstreamError',
          message: 'El CRM no respondió en GET /allied_commerces/create',
        },
      }
    }

    const envelope = result.data
    if (envelope.status === false || envelope.data == null) {
      return {
        success: false,
        error: {
          error: typeof envelope.error === 'string' ? envelope.error : 'UpstreamError',
          message: envelope.message || 'GET /allied_commerces/create no devolvió catálogo',
        },
      }
    }

    if (!isAlliedCommerceFormCatalog(envelope.data)) {
      return {
        success: false,
        error: {
          error: 'NotFormCatalog',
          message:
            'GET /allied_commerces/create no es solo un catálogo de formulario. No se publica el listado de comercios.',
        },
      }
    }

    return { success: true, data: envelope.data }
  }
}
