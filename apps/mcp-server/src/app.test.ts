// apps/mcp-server/src/app.test.ts
// Tests for MCP route error handling: session lookup failures and error response format.
import { describe, it, expect, vi } from 'vitest'

// Mock the logger so loggingMiddleware doesn't call getEnv() (which requires validateEnv() first).
// vi.mock is hoisted above imports — app will import the mocked logger.
vi.mock('./lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { app } from './app.js'

describe('POST /mcp', () => {
  it('returns 404 with { source, nature, action } when a stale or unknown session ID is provided', async () => {
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'mcp-session-id': 'unknown-session-id-that-does-not-exist' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
    const body = await res.json<{ source: string; nature: string; action: string }>()
    expect(body.source).toBe('app')
    expect(body.nature).toContain('unknown session')
    expect(body.action).toContain('new session')
  })
})

describe('GET /mcp', () => {
  it('returns 404 with { source, nature, action } when no active session exists', async () => {
    const res = await app.request('/mcp')
    expect(res.status).toBe(404)
    const body = await res.json<{ source: string; nature: string; action: string }>()
    expect(body.source).toBe('app')
    expect(body.nature).toContain('no active MCP session')
    expect(body.action).toContain('POST /mcp')
  })
})

describe('DELETE /mcp', () => {
  it('returns 404 with { source, nature, action } when no active session exists', async () => {
    const res = await app.request('/mcp', { method: 'DELETE' })
    expect(res.status).toBe(404)
    const body = await res.json<{ source: string; nature: string; action: string }>()
    expect(body.source).toBe('app')
    expect(body.nature).toContain('no active MCP session')
    expect(body.action).toContain('POST /mcp')
  })
})
