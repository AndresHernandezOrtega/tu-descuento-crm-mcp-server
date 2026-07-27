import { createHash, timingSafeEqual } from 'crypto'

/**
 * Identidad de un cliente autorizado del MCP server.
 * Cada entrada en MCP_AUTH_TOKENS representa un consumidor distinto (n8n, bot, etc.).
 */
export interface McpClientIdentity {
  name: string
  scopes: string[]
}

interface McpAuthTokenEntry {
  name: string
  token: string
  scopes?: string[]
}

interface IndexedClient {
  name: string
  scopes: string[]
  /** SHA-256 hex del token en claro */
  tokenHash: string
}

const MIN_TOKEN_LENGTH = 32

let clientIndex: Map<string, IndexedClient> | null = null
let clientNames: string[] = []

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function parseAuthTokensEnv(raw: string | undefined): McpAuthTokenEntry[] {
  if (!raw || raw.trim() === '') {
    console.error('❌ ERROR: Variable de entorno MCP_AUTH_TOKENS requerida')
    console.error('   Formato JSON: [{"name":"cliente","token":"mcp_live_...","scopes":["*"]}]')
    console.error('   Genera un token con: npm run gen:token')
    process.exit(1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('❌ ERROR: MCP_AUTH_TOKENS no es JSON válido')
    process.exit(1)
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error('❌ ERROR: MCP_AUTH_TOKENS debe ser un array JSON no vacío')
    process.exit(1)
  }

  const entries: McpAuthTokenEntry[] = []
  const names = new Set<string>()
  const tokens = new Set<string>()

  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      console.error('❌ ERROR: Cada entrada de MCP_AUTH_TOKENS debe ser un objeto')
      process.exit(1)
    }

    const { name, token, scopes } = item as Record<string, unknown>

    if (typeof name !== 'string' || name.trim() === '') {
      console.error('❌ ERROR: Cada entrada de MCP_AUTH_TOKENS requiere "name" (string no vacío)')
      process.exit(1)
    }

    if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) {
      console.error(`❌ ERROR: Token de "${name}" debe tener al menos ${MIN_TOKEN_LENGTH} caracteres`)
      process.exit(1)
    }

    if (names.has(name)) {
      console.error(`❌ ERROR: Nombre de cliente duplicado en MCP_AUTH_TOKENS: ${name}`)
      process.exit(1)
    }

    if (tokens.has(token)) {
      console.error(`❌ ERROR: Token duplicado en MCP_AUTH_TOKENS (cliente: ${name})`)
      process.exit(1)
    }

    if (scopes !== undefined && (!Array.isArray(scopes) || !scopes.every((s) => typeof s === 'string'))) {
      console.error(`❌ ERROR: "scopes" de "${name}" debe ser un array de strings`)
      process.exit(1)
    }

    names.add(name)
    tokens.add(token)
    entries.push({
      name: name.trim(),
      token,
      scopes: (scopes as string[] | undefined) ?? ['*'],
    })
  }

  return entries
}

/**
 * Carga y valida MCP_AUTH_TOKENS. Debe llamarse DESPUÉS de dotenv.config().
 */
export function loadAuthTokens(): void {
  const entries = parseAuthTokensEnv(process.env.MCP_AUTH_TOKENS)
  const index = new Map<string, IndexedClient>()
  for (const entry of entries) {
    const tokenHash = hashToken(entry.token)
    index.set(tokenHash, {
      name: entry.name,
      scopes: entry.scopes ?? ['*'],
      tokenHash,
    })
  }
  clientIndex = index
  clientNames = entries.map((e) => e.name)
  console.log(`🔐 Clientes MCP autorizados: ${clientNames.join(', ')} (${clientNames.length})`)
}

/**
 * Resuelve un Bearer token a la identidad del cliente.
 * Usa hash + timingSafeEqual para evitar timing attacks.
 */
export function resolveMcpClient(bearerToken: string): McpClientIdentity | null {
  if (!clientIndex) {
    throw new Error('Auth tokens not loaded. Call loadAuthTokens() during startup.')
  }

  if (!bearerToken || typeof bearerToken !== 'string') {
    return null
  }

  const candidateHash = hashToken(bearerToken)
  const candidateBuf = Buffer.from(candidateHash, 'hex')

  for (const client of clientIndex.values()) {
    const storedBuf = Buffer.from(client.tokenHash, 'hex')
    if (candidateBuf.length !== storedBuf.length) {
      continue
    }
    if (timingSafeEqual(candidateBuf, storedBuf)) {
      return { name: client.name, scopes: client.scopes }
    }
  }

  const dummy = Buffer.alloc(candidateBuf.length)
  timingSafeEqual(candidateBuf, dummy)

  return null
}

export function listMcpClientNames(): string[] {
  return [...clientNames]
}
