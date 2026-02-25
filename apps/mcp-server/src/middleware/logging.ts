// apps/mcp-server/src/middleware/logging.ts
import type { MiddlewareHandler } from 'hono'
import { logger } from '../lib/logger.js'

// HTTP-level request/response logging middleware.
// Logs method, path, status, and duration.
// Does NOT log request/response bodies (may contain PII from future tool inputs).
// Per-tool structured logging (source: 'mcp-tool') is added in Story 7.1.
export const loggingMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path

  logger.debug({ source: 'http', method, path }, 'Request received')

  await next()

  const status = c.res.status
  const durationMs = Date.now() - start

  logger.info({ source: 'http', method, path, status, durationMs }, 'Request completed')
}
