// apps/mcp-server/src/middleware/cf-rate-limit.ts
// Cloudflare Workers rate limiting using the CF Rate Limiting binding (Workers path only).
import { logger } from '../lib/logger.js'

export async function applyCfRateLimit(
  rateLimiter: RateLimit,
  request: Request,
): Promise<Response | null> {
  // cf-connecting-ip is set by Cloudflare's edge and cannot be spoofed by clients.
  // x-forwarded-for fallback is for local dev only; take only the first (leftmost) IP.
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'

  try {
    const { success } = await rateLimiter.limit({ key: ip })
    if (!success) {
      logger.warn({ source: 'rate-limiter', ip }, 'CF rate limit exceeded — returning 429')
      return Response.json(
        { source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }
  } catch (err) {
    logger.warn({ source: 'rate-limiter', err }, 'CF rate limiter error — failing open')
  }

  return null
}
