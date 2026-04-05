// apps/mcp-server/src/worker.test.ts
// Tests for Workers entrypoint env validation (AC 6).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./cache/refresh.js', () => ({
  warmUpLegislatorsCache: vi.fn().mockResolvedValue(undefined),
  warmUpBillsCache: vi.fn().mockResolvedValue(['2026GS']),
  scheduleLegislatorsRefresh: vi.fn(),
  scheduleBillsRefresh: vi.fn(),
}))

vi.mock('./providers/utah-legislature.js', () => ({
  UtahLegislatureProvider: vi.fn(),
}))

vi.mock('./lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import worker from './worker.js'
import { warmUpLegislatorsCache, warmUpBillsCache } from './cache/refresh.js'
import { logger } from './lib/logger.js'

const mockDb = {} as D1Database
const mockEnv = {
  DB: mockDb,
  UTAH_LEGISLATURE_API_KEY: 'test-key',
  UGRC_API_KEY: 'test-ugrc-key',
  PORT: '3001',
  NODE_ENV: 'test',
} as Env

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

describe('worker scheduled handler', () => {
  let capturedPromise: Promise<void> | undefined
  let mockCtx: ExecutionContext

  beforeEach(() => {
    capturedPromise = undefined
    mockCtx = {
      waitUntil: vi.fn((p: Promise<void>) => {
        capturedPromise = p
      }),
    } as unknown as ExecutionContext
    vi.mocked(warmUpLegislatorsCache).mockResolvedValue(undefined)
    vi.mocked(warmUpBillsCache).mockResolvedValue(['2026GS'])
    vi.mocked(logger.info).mockReset()
    vi.mocked(logger.error).mockReset()
  })

  it('calls ctx.waitUntil once', () => {
    worker.scheduled({ cron: '0 * * * *' } as ScheduledEvent, mockEnv, mockCtx)
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('hourly trigger: calls warmUpBillsCache but NOT warmUpLegislatorsCache', async () => {
    worker.scheduled({ cron: '0 * * * *' } as ScheduledEvent, mockEnv, mockCtx)
    await capturedPromise
    expect(vi.mocked(warmUpBillsCache)).toHaveBeenCalledWith(mockEnv.DB, expect.anything())
    expect(vi.mocked(warmUpLegislatorsCache)).not.toHaveBeenCalled()
  })

  it('daily trigger: calls BOTH warmUpLegislatorsCache AND warmUpBillsCache', async () => {
    worker.scheduled({ cron: '0 6 * * *' } as ScheduledEvent, mockEnv, mockCtx)
    await capturedPromise
    expect(vi.mocked(warmUpLegislatorsCache)).toHaveBeenCalledWith(mockEnv.DB, expect.anything())
    expect(vi.mocked(warmUpBillsCache)).toHaveBeenCalledWith(mockEnv.DB, expect.anything())
  })

  it('logs success for bills refresh on hourly trigger', async () => {
    worker.scheduled({ cron: '0 * * * *' } as ScheduledEvent, mockEnv, mockCtx)
    await capturedPromise
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache', sessions: ['2026GS'] }),
      'Bills cache refreshed via cron trigger',
    )
  })

  it('error path: catches error and logs with source: cache and key phrase', async () => {
    vi.mocked(warmUpBillsCache).mockRejectedValueOnce(new Error('network failure'))
    worker.scheduled({ cron: '0 * * * *' } as ScheduledEvent, mockEnv, mockCtx)
    await capturedPromise
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      expect.stringContaining('Scheduled cache refresh failed'),
    )
  })
})
