import dotenv from 'dotenv'
import { loadAuthTokens } from '@config/auth-tokens.js'

// Cargar variables de entorno desde archivo .env (solo en desarrollo local)
// En producción (Docker), las variables vienen de docker-compose.yml environment
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

// Validar variables críticas DESPUÉS de intentar cargar .env
const requiredEnvVars = ['TUDESCUENTO_API_URL', 'TUDESCUENTO_API_KEY', 'MCP_AUTH_TOKENS']
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ ERROR: Variables de entorno requeridas no encontradas:')
  missingVars.forEach((varName) => console.error(`   - ${varName}`))
  console.error('\n📋 En Docker: Configurar estas variables en docker-compose.yml o como variables de sistema')
  console.error('📋 En desarrollo local: Crear archivo .env con estas variables')
  console.error('📋 Genera tokens MCP con: npm run gen:token')
  console.error(
    '\n🔍 Variables actuales disponibles:',
    Object.keys(process.env)
      .filter((k) => k.startsWith('TUDESCUENTO') || k.startsWith('MCP_'))
      .join(', ') || 'ninguna',
  )
  process.exit(1)
}

// Validar e indexar tokens multi-cliente
loadAuthTokens()

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  tuDescuentoApiUrl: process.env.TUDESCUENTO_API_URL!,
  tuDescuentoApiKey: process.env.TUDESCUENTO_API_KEY!,

  mcpServerName: process.env.MCP_SERVER_NAME || 'tudescuento-mcp-server',
  mcpServerVersion: process.env.MCP_SERVER_VERSION || '1.0.0',

  logLevel: process.env.LOG_LEVEL || 'info',

  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['*'],

  /** Hosts permitidos para DNS rebinding protection (Host header). Vacío = deshabilitado. */
  allowedHosts: process.env.MCP_ALLOWED_HOSTS
    ? process.env.MCP_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
    : [],

  rateLimitPerMinute: parseInt(process.env.MCP_RATE_LIMIT_PER_MINUTE || '120', 10),

  /** TTL de sesiones inactivas en ms (default 30 min) */
  sessionTtlMs: parseInt(process.env.MCP_SESSION_TTL_MS || String(30 * 60 * 1000), 10),
} as const

console.log('✅ Configuración cargada exitosamente:')
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`   PORT: ${config.port}`)
console.log(`   API_URL: ${config.tuDescuentoApiUrl}`)
console.log(`   API_KEY: ${config.tuDescuentoApiKey.substring(0, 15)}...`)
console.log(`   CORS_ORIGINS: ${config.corsOrigins.join(', ')}`)
console.log(`   MCP_ALLOWED_HOSTS: ${config.allowedHosts.length ? config.allowedHosts.join(', ') : '(disabled)'}`)
console.log(`   MCP_RATE_LIMIT_PER_MINUTE: ${config.rateLimitPerMinute}`)
console.log(`   LOG_LEVEL: ${config.logLevel}`)

export type Config = typeof config
