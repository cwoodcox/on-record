// apps/mcp-server/src/middleware/cf-rate-limit.ts
// Cloudflare Workers rate limiting using the CF Rate Limiting binding (Workers path only).
import { logger } from '../lib/logger.js'

export async function applyCfRateLimit(
  rateLimiter: RateLimit,
  request: Request,
): Promise<Response | null> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'unknown'

  const { success } = await rateLimiter.limit({ key: ip })

  if (!success) {
    logger.warn({ source: 'rate-limiter', ip }, 'CF rate limit exceeded — returning 429')
    return Response.json(
      { source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' },
      { status: 429 },
    )
  }

  return null
}
