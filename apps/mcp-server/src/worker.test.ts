// apps/mcp-server/src/worker.test.ts
// Tests for Workers entrypoint env validation (AC 6).
import { describe, it, expect } from 'vitest'
import worker from './worker.js'

describe('worker fetch handler', () => {
  it('returns 500 with { source, nature, action } when env.DB binding is missing', async () => {
    const req = new Request('http://localhost/health')
    const env = {} as Env // empty env — DB binding absent
    const ctx = {} as ExecutionContext
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(500)
    const body = await res.json<{ source: string; nature: string; action: string }>()
    expect(body.source).toBe('worker')
    expect(body.nature).toContain('D1 binding missing')
    expect(body.action).toContain('wrangler.toml')
  })
})
