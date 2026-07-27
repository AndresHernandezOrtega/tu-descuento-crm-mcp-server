import { randomUUID } from 'crypto'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { config } from '@config/config.js'
import { authMiddleware } from '@/middleware/auth.js'
import { createRateLimitMiddleware } from '@/middleware/rate-limit.js'
import { registerAllTools } from '@tools/index.js'

interface SessionEntry {
  transport: StreamableHTTPServerTransport
  server: McpServer
  clientName: string
  lastAccessMs: number
}

function isInitializeRequest(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body]
  return messages.some(
    (msg) =>
      typeof msg === 'object' &&
      msg !== null &&
      'method' in msg &&
      (msg as { method?: string }).method === 'initialize',
  )
}

export class MCPServer {
  private app: express.Application
  private sessions = new Map<string, SessionEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
    this.startSessionCleanup()
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '4mb' }))
    this.app.use(
      cors({
        origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
        credentials: true,
        exposedHeaders: ['Content-Type', 'Mcp-Session-Id', 'WWW-Authenticate', 'Retry-After'],
      }),
    )
  }

  private createMcpServer(): McpServer {
    const server = new McpServer(
      {
        name: config.mcpServerName,
        version: config.mcpServerVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    registerAllTools(server)
    return server
  }

  private startSessionCleanup(): void {
    const intervalMs = Math.min(config.sessionTtlMs, 5 * 60 * 1000)
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [sessionId, entry] of this.sessions.entries()) {
        if (now - entry.lastAccessMs > config.sessionTtlMs) {
          console.log(`⏱️  Sesión expirada por TTL: ${sessionId}`)
          void entry.transport.close().catch(() => undefined)
          this.sessions.delete(sessionId)
        }
      }
    }, intervalMs)

    if (typeof this.cleanupTimer === 'object' && this.cleanupTimer && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  private forbidCrossClient(res: Response, sessionClient: string, requestClient: string): void {
    res.status(403).json({
      jsonrpc: '2.0',
      error: {
        code: -32003,
        message: `Session belongs to client "${sessionClient}", not "${requestClient}"`,
      },
      id: null,
    })
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        server: config.mcpServerName,
        version: config.mcpServerVersion,
        timestamp: new Date().toISOString(),
        activeSessions: this.sessions.size,
      })
    })

    const rateLimit = createRateLimitMiddleware(config.rateLimitPerMinute)
    const mcpAuth = [authMiddleware, rateLimit]

    this.app.post('/mcp', ...mcpAuth, async (req: Request, res: Response) => {
      await this.handleMcpPost(req, res)
    })

    this.app.get('/mcp', ...mcpAuth, async (req: Request, res: Response) => {
      await this.handleMcpSessionRequest(req, res)
    })

    this.app.delete('/mcp', ...mcpAuth, async (req: Request, res: Response) => {
      await this.handleMcpSessionRequest(req, res)
    })
  }

  private async handleMcpPost(req: Request, res: Response): Promise<void> {
    const client = req.mcpClient
    if (!client) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
      })
      return
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined

    try {
      if (sessionId && this.sessions.has(sessionId)) {
        const entry = this.sessions.get(sessionId)!
        if (entry.clientName !== client.name) {
          this.forbidCrossClient(res, entry.clientName, client.name)
          return
        }
        entry.lastAccessMs = Date.now()
        await entry.transport.handleRequest(req, res, req.body)
        return
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const enableDnsProtection = config.allowedHosts.length > 0
        const allowedOrigins = config.corsOrigins.includes('*') ? undefined : [...config.corsOrigins]

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          enableDnsRebindingProtection: enableDnsProtection,
          allowedHosts: enableDnsProtection ? config.allowedHosts : undefined,
          allowedOrigins: enableDnsProtection ? allowedOrigins : undefined,
          onsessioninitialized: (sid) => {
            console.log(`📝 Sesión MCP inicializada: ${sid} (cliente: ${client.name})`)
          },
          onsessionclosed: (sid) => {
            this.sessions.delete(sid)
            console.log(`🔌 Sesión MCP cerrada: ${sid}`)
          },
        })

        const server = this.createMcpServer()

        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid) {
            this.sessions.delete(sid)
            console.log(`🧹 Transport cerrado, sesión eliminada: ${sid}`)
          }
        }

        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)

        const newSessionId = transport.sessionId
        if (newSessionId) {
          this.sessions.set(newSessionId, {
            transport,
            server,
            clientName: client.name,
            lastAccessMs: Date.now(),
          })
          console.log(`🆔 Sesión vinculada a cliente ${client.name}: ${newSessionId}`)
        } else {
          console.warn(`⚠️  Initialize sin sessionId (cliente: ${client.name})`)
        }
        return
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: sessionId
            ? `Unknown session: ${sessionId}`
            : 'Bad Request: expected initialize request or valid Mcp-Session-Id',
        },
        id: null,
      })
    } catch (error) {
      console.error('❌ Error en POST /mcp:', error)
      if (!res.headersSent) {
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
    }
  }

  private async handleMcpSessionRequest(req: Request, res: Response): Promise<void> {
    const client = req.mcpClient
    if (!client) {
      res.status(401).end()
      return
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !this.sessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing Mcp-Session-Id' },
        id: null,
      })
      return
    }

    const entry = this.sessions.get(sessionId)!
    if (entry.clientName !== client.name) {
      this.forbidCrossClient(res, entry.clientName, client.name)
      return
    }

    entry.lastAccessMs = Date.now()
    try {
      await entry.transport.handleRequest(req, res)
    } catch (error) {
      console.error(`❌ Error en ${req.method} /mcp:`, error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null,
        })
      }
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(config.port, () => {
        console.log(`🚀 MCP Server iniciado en puerto ${config.port}`)
        console.log(`📡 MCP endpoint: http://localhost:${config.port}/mcp`)
        console.log(`❤️  Health check: http://localhost:${config.port}/health`)
        console.log(``)
        console.log(`Transporte: Streamable HTTP (SDK StreamableHTTPServerTransport)`)
        console.log(`Auth: Bearer token multi-cliente (MCP_AUTH_TOKENS)`)
        console.log(`Rate limit: ${config.rateLimitPerMinute} req/min por cliente`)
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
