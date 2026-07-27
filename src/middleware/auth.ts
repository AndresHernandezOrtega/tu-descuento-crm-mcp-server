import type { Request, Response, NextFunction } from 'express'
import { resolveMcpClient, type McpClientIdentity } from '@config/auth-tokens.js'

declare global {
  namespace Express {
    interface Request {
      mcpClient?: McpClientIdentity
    }
  }
}

const WWW_AUTHENTICATE = 'Bearer realm="mcp", error="invalid_token"'

function unauthorized(res: Response, message: string): void {
  res.setHeader('WWW-Authenticate', WWW_AUTHENTICATE)
  res.status(401).json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message,
    },
    id: null,
  })
}

/**
 * Middleware de autenticación Bearer para /mcp.
 * Requiere Authorization: Bearer <token> emitido vía MCP_AUTH_TOKENS.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header || typeof header !== 'string') {
    unauthorized(res, 'Missing Authorization header. Expected: Bearer <token>')
    return
  }

  const [scheme, token, ...rest] = header.trim().split(/\s+/)

  if (scheme.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    unauthorized(res, 'Invalid Authorization scheme. Expected: Bearer <token>')
    return
  }

  const client = resolveMcpClient(token)
  if (!client) {
    unauthorized(res, 'Invalid or unauthorized token')
    return
  }

  req.mcpClient = client
  next()
}
