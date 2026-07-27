import type { Request, Response, NextFunction } from 'express'

interface WindowState {
  count: number
  windowStartMs: number
}

const windows = new Map<string, WindowState>()
const WINDOW_MS = 60_000

/**
 * Rate limiting en memoria por cliente MCP (sliding fixed window).
 * Configurable vía MCP_RATE_LIMIT_PER_MINUTE (default 120).
 */
export function createRateLimitMiddleware(limitPerMinute: number) {
  const limit = Math.max(1, limitPerMinute)

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const clientName = req.mcpClient?.name
    if (!clientName) {
      // authMiddleware debe correr antes; si no hay cliente, dejar pasar al 401
      next()
      return
    }

    const now = Date.now()
    let state = windows.get(clientName)

    if (!state || now - state.windowStartMs >= WINDOW_MS) {
      state = { count: 0, windowStartMs: now }
      windows.set(clientName, state)
    }

    state.count += 1

    if (state.count > limit) {
      const retryAfterSec = Math.ceil((WINDOW_MS - (now - state.windowStartMs)) / 1000)
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)))
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Rate limit exceeded for client "${clientName}". Max ${limit} requests/minute.`,
        },
        id: null,
      })
      return
    }

    next()
  }
}
