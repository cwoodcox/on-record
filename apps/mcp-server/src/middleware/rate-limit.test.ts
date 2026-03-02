import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.doMock (not hoisted) so vi.resetModules() in beforeEach gives each test
// a fresh rateLimiter MemoryStore — preventing counter bleed between tests.

const mockWarn = vi.fn()

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('../lib/logger.js', () => ({
      logger: { warn: mockWarn },
    }))
    mockWarn.mockClear()
  })

  it('returns 429 with correct error body after exceeding 60 requests from the same IP', async () => {
    const { rateLimitMiddleware } = await import('./rate-limit.js')
    const { Hono } = await import('hono')

    const app = new Hono()
    app.use('*', rateLimitMiddleware)
    app.post('/mcp', (c) => c.text('ok'))

    for (let i = 0; i < 60; i++) {
      const res = await app.request('/mcp', { method: 'POST' })
      expect(res.status).toBe(200)
    }

    const res = await app.request('/mcp', { method: 'POST' })
    expect(res.status).toBe(429)

    const body = (await res.json()) as Record<string, string>
    expect(body).toMatchObject({
      source: 'app',
      nature: 'Rate limit exceeded',
      action: 'Wait 60 seconds before retrying',
    })
  })

  it('logs at warn level with source rate-limiter when limit is exceeded', async () => {
    const { rateLimitMiddleware } = await import('./rate-limit.js')
    const { Hono } = await import('hono')

    const app = new Hono()
    app.use('*', rateLimitMiddleware)
    app.post('/mcp', (c) => c.text('ok'))

    for (let i = 0; i < 60; i++) {
      await app.request('/mcp', { method: 'POST' })
    }
    await app.request('/mcp', { method: 'POST' })

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rate-limiter' }),
      expect.stringContaining('429'),
    )
  })

  it('keys requests by x-forwarded-for — different IPs have separate counters', async () => {
    const { rateLimitMiddleware } = await import('./rate-limit.js')
    const { Hono } = await import('hono')

    const app = new Hono()
    app.use('*', rateLimitMiddleware)
    app.post('/mcp', (c) => c.text('ok'))

    // Exhaust the limit for IP A
    for (let i = 0; i < 60; i++) {
      await app.request('/mcp', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })
    }

    // IP A should now be rate limited
    const resA = await app.request('/mcp', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    expect(resA.status).toBe(429)

    // IP B (different key) should still be allowed
    const resB = await app.request('/mcp', {
      method: 'POST',
      headers: { 'x-forwarded-for': '9.9.9.9' },
    })
    expect(resB.status).toBe(200)
  })
})
