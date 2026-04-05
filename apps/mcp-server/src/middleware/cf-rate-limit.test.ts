import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn() }))
vi.mock('../lib/logger.js', () => ({ logger: { warn: mockWarn } }))

import { applyCfRateLimit } from './cf-rate-limit.js'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/mcp', { headers })
}

describe('applyCfRateLimit', () => {
  let mockRateLimiter: { limit: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockRateLimiter = { limit: vi.fn().mockResolvedValue({ success: true }) }
    mockWarn.mockClear()
  })

  it('returns null when rate limit is not exceeded', async () => {
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result).toBeNull()
  })

  it('returns 429 Response when rate limit is exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue({ success: false })
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
    const body = (await result!.json()) as Record<string, string>
    expect(body).toMatchObject({
      source: 'app',
      nature: 'Rate limit exceeded',
      action: 'Wait before retrying',
    })
  })

  it('logs warn with source: rate-limiter when limit exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue({ success: false })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rate-limiter' }),
      expect.stringContaining('429'),
    )
  })

  it('uses cf-connecting-ip as the rate limit key', async () => {
    const req = makeRequest({ 'cf-connecting-ip': '1.2.3.4' })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, req)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '1.2.3.4' })
  })

  it('falls back to x-forwarded-for when cf-connecting-ip absent', async () => {
    const req = makeRequest({ 'x-forwarded-for': '5.6.7.8' })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, req)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '5.6.7.8' })
  })

  it('uses only the first IP from x-forwarded-for when multiple are present', async () => {
    const req = makeRequest({ 'x-forwarded-for': '5.6.7.8, 9.10.11.12, 13.14.15.16' })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, req)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '5.6.7.8' })
  })

  it('falls back to unknown when both IP headers absent', async () => {
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: 'unknown' })
  })

  it('includes Retry-After header in 429 response', async () => {
    mockRateLimiter.limit.mockResolvedValue({ success: false })
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result!.headers.get('Retry-After')).toBe('60')
  })

  it('returns null and logs warn when rateLimiter.limit throws (fail-open)', async () => {
    mockRateLimiter.limit.mockRejectedValue(new Error('binding error'))
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rate-limiter' }),
      expect.stringContaining('failing open'),
    )
  })
})
