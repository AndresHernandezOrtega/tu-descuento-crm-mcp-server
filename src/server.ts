import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { config } from '@config/config.js'
import { tools, handleToolCall } from '@tools/index.js'
import { prompts, handleGetPrompt } from '@prompts/index.js'
import { resources, handleReadResource } from '@resources/index.js'

export class MCPServer {
  private app: express.Application
  private servers: Map<string, Server> = new Map()

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // Middleware para raw body (necesario para streaming)
    this.app.use(express.text({ type: 'application/json', limit: '10mb' }))
    this.app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
        exposedHeaders: ['Content-Type', 'Transfer-Encoding'],
      }),
    )
  }

  /**
   * Crea una nueva instancia del servidor MCP con todos los handlers configurados
   */
  private createMCPServerInstance(): Server {
    const server = new Server(
      {
        name: config.mcpServerName,
        version: config.mcpServerVersion,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      },
    )

    // Handler para listar tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }))

    // Handler para ejecutar tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => handleToolCall(request))

    // Handler para listar prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts,
    }))

    // Handler para obtener un prompt
    server.setRequestHandler(GetPromptRequestSchema, async (request) => handleGetPrompt(request))

    // Handler para listar resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources,
    }))

    // Handler para leer un resource
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => handleReadResource(request))

    return server
  }

  /**
   * Procesa un mensaje JSON-RPC y retorna la respuesta
   */
  private async processMessage(message: any): Promise<any> {
    try {
      // Las notificaciones (sin id) no requieren respuesta
      if (!message.id) {
        console.log(`🔔 Notificación recibida: ${message.method}`)
        return null
      }

      //  Para la inicialización, respondemos con las capacidades
      if (message.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: config.mcpServerName,
              version: config.mcpServerVersion,
            },
            capabilities: {
              tools: {},
              prompts: {},
              resources: {},
            },
          },
        }
      } else if (message.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { tools },
        }
      } else if (message.method === 'tools/call') {
        const result = await handleToolCall({ params: message.params } as any)
        return {
          jsonrpc: '2.0',
          id: message.id,
          result,
        }
      } else if (message.method === 'prompts/list') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { prompts },
        }
      } else if (message.method === 'prompts/get') {
        const result = await handleGetPrompt({ params: message.params } as any)
        return {
          jsonrpc: '2.0',
          id: message.id,
          result,
        }
      } else if (message.method === 'resources/list') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { resources },
        }
      } else if (message.method === 'resources/read') {
        const result = await handleReadResource({ params: message.params } as any)
        return {
          jsonrpc: '2.0',
          id: message.id,
          result,
        }
      } else {
        // Método no soportado
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        }
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje MCP:', error)
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
        id: message.id,
      }
    }
  }

  private setupRoutes(): void {
    // Endpoint de salud
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        server: config.mcpServerName,
        version: config.mcpServerVersion,
        timestamp: new Date().toISOString(),
        activeSessions: this.servers.size,
      })
    })

    // Endpoint HTTP Streamable para MCP
    this.app.post('/mcp', async (req: Request, res: Response) => {
      const sessionId = (req.headers['mcp-session-id'] as string) || randomUUID()

      console.log(`🔗 Cliente HTTP Streamable conectado (sesión ${sessionId})`)

      // Obtener o crear servidor para esta sesión
      let server = this.servers.get(sessionId)
      const isNewSession = !server
      if (!server) {
        console.log(`📝 Nueva sesión MCP: ${sessionId}`)
        server = this.createMCPServerInstance()
        this.servers.set(sessionId, server)
      }

      // Limpiar cuando el cliente se desconecta
      req.on('close', () => {
        this.servers.delete(sessionId)
        console.log(`🔌 Cliente desconectado (sesión ${sessionId})`)
      })

      try {
        // Parsear el body como JSON (viene como texto raw)
        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

        // Intentar parsear como objeto único o array
        let messages: any[]
        try {
          const parsed = JSON.parse(body.trim())
          messages = Array.isArray(parsed) ? parsed : [parsed]
        } catch (e) {
          console.error('❌ Error parseando mensaje JSON:', body)
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error',
            },
            id: null,
          })
        }

        console.log(`📨 Recibidos ${messages.length} mensaje(s) (sesión ${sessionId})`)

        // Determinar si hay requests (con id) vs solo notificaciones/respuestas
        const hasRequests = messages.some((msg) => msg.id !== undefined && msg.method)

        // Recopilar todas las respuestas
        const responses: any[] = []
        let isInitializeResponse = false

        // Procesar cada mensaje
        for (const message of messages) {
          console.log(`   → Procesando: ${message.method || 'notification'}`)

          const response = await this.processMessage(message)

          if (response) {
            responses.push(response)
            console.log(`   ✅ Respuesta generada: ${message.method}`)

            // Detectar si es respuesta de initialize
            if (message.method === 'initialize') {
              isInitializeResponse = true
            }
          }
        }

        // Según especificación MCP Streamable HTTP:
        // Si solo hay notificaciones/respuestas (sin requests): 202 Accepted sin body
        // Si hay requests: Content-Type application/json con las respuestas

        if (!hasRequests && responses.length === 0) {
          // Solo notificaciones - 202 Accepted sin body
          console.log(`   ℹ️  Solo notificaciones, retornando 202 Accepted`)
          return res.status(202).end()
        }

        // Establecer session ID en header si es una nueva sesión y es initialize
        if (isNewSession && isInitializeResponse) {
          res.setHeader('Mcp-Session-Id', sessionId)
          console.log(`   🆔 Session ID establecido: ${sessionId}`)
        }

        // Enviar respuestas con Content-Type correcto
        if (responses.length === 1) {
          // Una sola respuesta: enviar como objeto JSON
          res.setHeader('Content-Type', 'application/json')
          res.send(JSON.stringify(responses[0]))
        } else if (responses.length > 1) {
          // Múltiples respuestas: enviar como array JSON
          res.setHeader('Content-Type', 'application/json')
          res.send(JSON.stringify(responses))
        } else {
          // Sin respuestas pero había requests - error interno
          console.error('⚠️  Se esperaba respuesta pero no se generó ninguna')
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error: No response generated',
            },
            id: null,
          })
        }
      } catch (error) {
        console.error('❌ Error en endpoint Streamable HTTP:', error)
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error),
          },
          id: null,
        })
      }
    })
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(config.port, () => {
        console.log(`🚀 MCP Server iniciado en puerto ${config.port}`)
        console.log(`📡 MCP endpoint: http://localhost:${config.port}/mcp`)
        console.log(`❤️  Health check: http://localhost:${config.port}/health`)
        console.log(``)
        console.log(`Transporte: Streamable HTTP (Chunked Transfer Encoding)`)
        console.log(`Compatible con n8n MCP Client y otros clientes MCP estándar`)
        console.log(``)
        console.log(`📝 Flujo de conexión:`)
        console.log(`   1. POST /mcp → Enviar mensaje JSON-RPC`)
        console.log(`   2. Respuestas → Recibidas en el mismo stream HTTP (line-delimited JSON)`)
        console.log(`   3. Múltiples requests → Enviar múltiples líneas JSON en el mismo POST`)
        console.log(``)
        console.log(`⚙️  Configuración:`)
        console.log(`   • CORS Origins: ${config.corsOrigins.join(', ')}`)
        console.log(`   • API URL: ${config.tuDescuentoApiUrl}`)
        resolve()
      })
    })
  }

  public getExpressApp() {
    return this.app
  }
}
