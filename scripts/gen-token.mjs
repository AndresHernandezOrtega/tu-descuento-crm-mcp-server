#!/usr/bin/env node
/**
 * Genera un token Bearer seguro para un cliente del MCP server.
 * Uso: npm run gen:token [-- --name mi-cliente]
 */
import { randomBytes } from 'crypto'

const args = process.argv.slice(2)
let name = 'nuevo-cliente'
const nameIdx = args.indexOf('--name')
if (nameIdx >= 0 && args[nameIdx + 1]) {
  name = args[nameIdx + 1]
}

const token = `mcp_live_${randomBytes(32).toString('base64url')}`

const entry = {
  name,
  token,
  scopes: ['*'],
}

console.log('')
console.log('=== Token MCP generado ===')
console.log(`Cliente: ${name}`)
console.log(`Token:   ${token}`)
console.log('')
console.log('Añade esta entrada al array JSON de MCP_AUTH_TOKENS:')
console.log(JSON.stringify(entry, null, 2))
console.log('')
console.log('Ejemplo de variable de entorno (un solo cliente):')
console.log(`MCP_AUTH_TOKENS='${JSON.stringify([entry])}'`)
console.log('')
console.log('Header a configurar en el cliente:')
console.log(`Authorization: Bearer ${token}`)
console.log('')
