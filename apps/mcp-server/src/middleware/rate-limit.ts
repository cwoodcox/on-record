// apps/mcp-server/src/middleware/rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter'
import type { MiddlewareHandler } from 'hono'
import { logger } from '../lib/logger.js'

export const rateLimitMiddleware: MiddlewareHandler = rateLimiter({
  windowMs: 60 * 1000, // 1-minute window
  limit: 60,           // 60 requests per IP per window (NFR8)
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    // In production behind Railway's reverse proxy, use x-forwarded-for
    const forwardedFor = c.req.header('x-forwarded-for')
    const realIp = c.req.header('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? 'unknown'
    return ip
  },
  handler: (c, _next, options) => {
    logger.warn(
      {
        source: 'rate-limiter',
        limit: options.limit,
        windowMs: options.windowMs,
        ip: c.req.header('x-forwarded-for') ?? 'unknown',
      },
      'Rate limit exceeded — returning 429'
    )
    return c.json(
      {
        source: 'app',
        nature: 'Rate limit exceeded',
        action: 'Wait 60 seconds before retrying',
      },
      429
    )
  },
})
