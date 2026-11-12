import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { FormCatalogService } from '@services/form-catalog-service.js'
import type { AlliedCommerceCreationCatalog, ClientCreationCatalog } from '@/types/index.js'

export const CLIENT_CREATION_URI = 'tudescuento://forms/client-creation'
export const ALLIED_COMMERCE_CREATION_URI = 'tudescuento://forms/allied-commerce-creation'

type Ready<T> = { status: 'ready'; payload: T; loadedAt: string }
type Failed = { status: 'error'; message: string }
type CatalogState<T> = { status: 'empty' } | Ready<T> | Failed

let clientCatalog: CatalogState<ClientCreationCatalog> = { status: 'empty' }
let commerceCatalog: CatalogState<AlliedCommerceCreationCatalog> = { status: 'empty' }
let inflight: Promise<void> | null = null

async function hydrate(): Promise<void> {
  const service = new FormCatalogService()
  const [clientResult, commerceResult] = await Promise.all([
    service.getClientCreationCatalog(),
    service.getAlliedCommerceCreationCatalog(),
  ])
  const loadedAt = new Date().toISOString()

  clientCatalog = clientResult.success && clientResult.data
    ? { status: 'ready', payload: clientResult.data, loadedAt }
    : { status: 'error', message: clientResult.error?.message || 'El CRM no respondió en GET /clients/creation' }

  commerceCatalog = commerceResult.success && commerceResult.data
    ? { status: 'ready', payload: commerceResult.data, loadedAt }
    : {
        status: 'error',
        message: commerceResult.error?.message || 'El CRM no respondió en GET /allied_commerces/create',
      }

  if (clientCatalog.status === 'ready') {
    console.log(`Resource ${CLIENT_CREATION_URI} listo`)
  } else {
    console.warn(`Resource ${CLIENT_CREATION_URI} no disponible: ${clientCatalog.message}`)
  }
  if (commerceCatalog.status === 'ready') {
    console.log(`Resource ${ALLIED_COMMERCE_CREATION_URI} listo`)
  } else {
    console.warn(`Resource ${ALLIED_COMMERCE_CREATION_URI} no disponible: ${commerceCatalog.message}`)
  }
}

export function startFormCatalogHydration(): void {
  void ensureFormCatalogs()
}

export async function ensureFormCatalogs(retry = false): Promise<void> {
  if (retry) {
    if (inflight) await inflight.catch(() => undefined)
    inflight = null
  }
  if (!inflight) inflight = hydrate()
  await inflight
}

function catalogError(uri: string, message: string): never {
  throw new McpError(
    ErrorCode.InternalError,
    `No se pudo leer ${uri}. ${message} Reintenta la lectura del resource.`,
  )
}

async function readReady<T>(uri: string, currentState: () => CatalogState<T>): Promise<T> {
  await ensureFormCatalogs()
  let current = currentState()
  if (current.status !== 'ready') {
    await ensureFormCatalogs(true)
    current = currentState()
  }
  if (current.status !== 'ready') {
    catalogError(uri, current.status === 'error' ? current.message : 'El catálogo todavía no está cargado.')
  }
  return current.payload
}

export async function readClientCreationResource(): Promise<ReadResourceResult> {
  const payload = await readReady(CLIENT_CREATION_URI, () => clientCatalog)
  return {
    contents: [
      {
        uri: CLIENT_CREATION_URI,
        mimeType: 'application/json',
        text: JSON.stringify(payload),
      },
    ],
  }
}

export async function readAlliedCommerceCreationResource(): Promise<ReadResourceResult> {
  const payload = await readReady(ALLIED_COMMERCE_CREATION_URI, () => commerceCatalog)
  return {
    contents: [
      {
        uri: ALLIED_COMMERCE_CREATION_URI,
        mimeType: 'application/json',
        text: JSON.stringify(payload),
      },
    ],
  }
}
