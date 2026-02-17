import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

export const config = {
  // Configuración del servidor
  port: parseInt(process.env.PORT || '3000', 10),

  // Configuración de Tu Descuento API
  tuDescuentoApiUrl: process.env.TUDESCUENTO_API_URL || 'https://api.tudescuento.com',
  tuDescuentoApiKey: process.env.TUDESCUENTO_API_KEY || '',

  // Configuración del servidor MCP
  mcpServerName: process.env.MCP_SERVER_NAME || 'tudescuento-mcp-server',
  mcpServerVersion: process.env.MCP_SERVER_VERSION || '1.0.0',

  // Nivel de log
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : ['*'],
} as const

export type Config = typeof config
