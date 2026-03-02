import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { corsMiddleware } from './cors.js'

function makeApp() {
  const app = new Hono()
  app.use('*', corsMiddleware)
  app.get('/test', (c) => c.text('ok'))
  return app
}

describe('corsMiddleware', () => {
  it('allows requests from https://claude.ai', async () => {
    const res = await makeApp().request('/test', {
      headers: { Origin: 'https://claude.ai' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai')
  })

  it('allows requests from https://chatgpt.com', async () => {
    const res = await makeApp().request('/test', {
      headers: { Origin: 'https://chatgpt.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com')
  })

  it('allows requests from https://chat.openai.com', async () => {
    const res = await makeApp().request('/test', {
      headers: { Origin: 'https://chat.openai.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://chat.openai.com')
  })

  it('does not set CORS header for unknown origins', async () => {
    const res = await makeApp().request('/test', {
      headers: { Origin: 'https://evil.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('allows requests with no origin (curl, server-to-server)', async () => {
    const res = await makeApp().request('/test')
    expect(res.status).toBe(200)
  })

  it('exposes Mcp-Session-Id and Last-Event-Id headers', async () => {
    const res = await makeApp().request('/test', {
      headers: { Origin: 'https://claude.ai' },
    })
    const exposed = res.headers.get('Access-Control-Expose-Headers') ?? ''
    expect(exposed).toContain('Mcp-Session-Id')
    expect(exposed).toContain('Last-Event-Id')
  })

  it('handles OPTIONS preflight and sets Allow-Origin', async () => {
    const res = await makeApp().request('/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://claude.ai',
        'Access-Control-Request-Method': 'POST',
      },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('includes MCP headers in Access-Control-Allow-Headers', async () => {
    const res = await makeApp().request('/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://claude.ai',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Mcp-Session-Id',
      },
    })
    const allowed = res.headers.get('Access-Control-Allow-Headers') ?? ''
    expect(allowed).toContain('Mcp-Session-Id')
    expect(allowed).toContain('Last-Event-Id')
  })
})
