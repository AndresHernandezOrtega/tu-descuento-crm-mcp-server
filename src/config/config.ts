import dotenv from 'dotenv'

// Cargar variables de entorno desde archivo .env (solo en desarrollo)
// En producción (Docker), las variables vienen de docker-compose.yml o sistema
dotenv.config()

// Validar variables críticas
const requiredEnvVars = ['TUDESCUENTO_API_URL', 'TUDESCUENTO_API_KEY']
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ ERROR: Variables de entorno requeridas no encontradas:')
  missingVars.forEach((varName) => console.error(`   - ${varName}`))
  console.error('\n📋 En Docker, asegúrate de configurar estas variables en docker-compose.yml')
  console.error('📋 En desarrollo local, crea un archivo .env con estas variables')
  process.exit(1)
}

export const config = {
  // Configuración del servidor
  port: parseInt(process.env.PORT || '3000', 10),

  // Configuración de Tu Descuento API
  tuDescuentoApiUrl: process.env.TUDESCUENTO_API_URL!,
  tuDescuentoApiKey: process.env.TUDESCUENTO_API_KEY!,

  // Configuración del servidor MCP
  mcpServerName: process.env.MCP_SERVER_NAME || 'tudescuento-mcp-server',
  mcpServerVersion: process.env.MCP_SERVER_VERSION || '1.0.0',

  // Nivel de log
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : ['*'],
} as const

// Log de configuración (sin exponer API_KEY)
if (process.env.NODE_ENV !== 'production') {
  console.log('⚙️  Configuración cargada:')
  console.log(`   PORT: ${config.port}`)
  console.log(`   API_URL: ${config.tuDescuentoApiUrl}`)
  console.log(`   API_KEY: ${config.tuDescuentoApiKey.substring(0, 10)}...`)
  console.log(`   CORS_ORIGINS: ${config.corsOrigins.join(', ')}`)
}

export type Config = typeof config
