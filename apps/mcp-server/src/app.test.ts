// apps/mcp-server/src/app.test.ts
// Tests for the shared Hono app used by the Node.js path (index.ts).
// MCP route handler tests removed in Story 9.6 — MCP transport now handled by
// OnRecordMCP (McpAgent / Durable Objects) in worker.ts, not app.ts.
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

describe('GET /health', () => {
  it('returns 200 with { status: ok, service } JSON', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json<{ status: string; service: string }>()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('on-record-mcp-server')
  })
})
