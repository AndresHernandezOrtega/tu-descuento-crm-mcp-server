import { MCPServer } from '@/server.js'

async function main() {
  try {
    const server = new MCPServer()
    await server.start()
  } catch (error) {
    console.error('Error al iniciar el servidor:', error)
    process.exit(1)
  }
}

// Manejo de señales para cierre gracioso
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...')
  process.exit(0)
})

main()
