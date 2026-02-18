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
  private sseConnections: Map<string, Response> = new Map() // Conexiones SSE activas por sessionId

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json())
    this.app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
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
   * Envía una respuesta JSON-RPC a través de SSE
   */
  private sendSSEResponse(sessionId: string, data: any): boolean {
    const sseConnection = this.sseConnections.get(sessionId)
    if (!sseConnection) {
      console.warn(`⚠️  No hay conexión SSE para sesión ${sessionId}`)
      return false
    }

    try {
      sseConnection.write('event: message\n')
      sseConnection.write(`data: ${JSON.stringify(data)}\n\n`)
      return true
    } catch (error) {
      console.error(`❌ Error enviando respuesta SSE:`, error)
      this.sseConnections.delete(sessionId)
      return false
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
        activeSSEConnections: this.sseConnections.size,
      })
    })

    // Endpoint SSE para recibir notificaciones del servidor (GET)
    this.app.get('/mcp', (req: Request, res: Response) => {
      const sessionId = (req.headers['mcp-session-id'] as string) || randomUUID()

      console.log(`🔗 Cliente SSE conectado (sesión ${sessionId})`)

      // Configurar headers para SSE
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('mcp-session-id', sessionId)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
      res.setHeader('X-Accel-Buffering', 'no')

      // Almacenar conexión SSE para enviar respuestas desde POST
      this.sseConnections.set(sessionId, res)

      // Enviar un mensaje inicial para confirmar la conexión
      res.write('event: connected\n')
      res.write(`data: ${JSON.stringify({ sessionId })}\n\n`)

      // Keep-alive ping cada 15 segundos
      const keepAlive = setInterval(() => {
        res.write(': ping\n\n')
      }, 15000)

      // Limpiar cuando el cliente se desconecta
      req.on('close', () => {
        clearInterval(keepAlive)
        this.sseConnections.delete(sessionId)
        console.log(`🔌 Cliente SSE desconectado (sesión ${sessionId})`)
      })
    })

    // Endpoint principal para MCP (compatible con clientes HTTP+POST)
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const sessionId = (req.headers['mcp-session-id'] as string) || randomUUID()
        const message = req.body

        console.log(`📨 Mensaje recibido (sesión ${sessionId}):`, message.method || 'notification')

        // Verificar que haya una conexión SSE activa
        const hasSSEConnection = this.sseConnections.has(sessionId)

        if (!hasSSEConnection && message.id) {
          // Si no hay conexión SSE y se espera respuesta, responder con error
          return res.status(400).json({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32000,
              message: 'No active SSE connection. Please establish GET /mcp connection first.',
            },
          })
        }

        // Obtener o crear servidor para esta sesión
        let server = this.servers.get(sessionId)
        if (!server) {
          console.log(`📝 Nueva sesión MCP: ${sessionId}`)
          server = this.createMCPServerInstance()
          this.servers.set(sessionId, server)
        }

        res.setHeader('mcp-session-id', sessionId)

        // Las notificaciones (sin id) no requieren respuesta
        if (!message.id) {
          console.log(`🔔 Notificación recibida: ${message.method}`)
          res.status(202).end()
          return
        }

        // Responder 202 Accepted inmediatamente (procesamiento asíncrono)
        res.status(202).json({
          accepted: true,
          sessionId: sessionId,
          message: 'Request accepted, response will be sent via SSE',
        })

        // Procesar request asíncronamente y enviar respuesta por SSE
        setImmediate(async () => {
          try {
            let responseData: any

            //  Para la inicialización, respondemos con las capacidades
            if (message.method === 'initialize') {
              responseData = {
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
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result: { tools },
              }
            } else if (message.method === 'tools/call') {
              const result = await handleToolCall({ params: message.params } as any)
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result,
              }
            } else if (message.method === 'prompts/list') {
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result: { prompts },
              }
            } else if (message.method === 'prompts/get') {
              const result = await handleGetPrompt({ params: message.params } as any)
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result,
              }
            } else if (message.method === 'resources/list') {
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result: { resources },
              }
            } else if (message.method === 'resources/read') {
              const result = await handleReadResource({ params: message.params } as any)
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                result,
              }
            } else {
              // Método no soportado
              responseData = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32601,
                  message: `Method not found: ${message.method}`,
                },
              }
            }

            // Enviar respuesta por SSE
            const sent = this.sendSSEResponse(sessionId, responseData)
            if (sent) {
              console.log(`✅ Respuesta enviada por SSE (sesión ${sessionId}, método ${message.method})`)
            } else {
              console.error(`❌ No se pudo enviar respuesta por SSE (sesión ${sessionId})`)
            }
          } catch (error) {
            console.error('❌ Error procesando mensaje MCP:', error)
            this.sendSSEResponse(sessionId, {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal error',
                data: error instanceof Error ? error.message : String(error),
              },
              id: message.id,
            })
          }
        })
      } catch (error) {
        console.error('❌ Error en endpoint POST:', error)
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error),
          },
          id: req.body.id || null,
        })
      }
    })
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(config.port, () => {
        console.log(`🚀 MCP Server iniciado en puerto ${config.port}`)
        console.log(`📡 MCP endpoint GET (SSE): http://localhost:${config.port}/mcp`)
        console.log(`📡 MCP endpoint POST: http://localhost:${config.port}/mcp`)
        console.log(`❤️  Health check: http://localhost:${config.port}/health`)
        console.log(``)
        console.log(`Transporte: HTTP+SSE (Server-Sent Events)`)
        console.log(`Compatible con n8n MCP Client y otros clientes HTTP Streameable`)
        console.log(``)
        console.log(`📝 Flujo de conexión:`)
        console.log(`   1. GET /mcp → Establecer conexión SSE (recibir sessionId)`)
        console.log(`   2. POST /mcp → Enviar comandos (usar sessionId en header)`)
        console.log(`   3. Respuestas → Recibidas por SSE como eventos 'message'`)
        resolve()
      })
    })
  }

  public getExpressApp() {
    return this.app
  }
}
