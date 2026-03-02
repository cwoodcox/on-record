import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// vi.mock is hoisted above imports — loggingMiddleware will import the mocked logger
vi.mock('../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

import { logger } from '../lib/logger.js'
import { loggingMiddleware } from './logging.js'

function makeApp() {
  const app = new Hono()
  app.use('*', loggingMiddleware)
  app.get('/test', (c) => c.text('ok'))
  app.post('/test', (c) => c.text('ok'))
  return app
}

describe('loggingMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs incoming request at debug level with source http', async () => {
    await makeApp().request('/test')
    expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'http', method: 'GET', path: '/test' }),
      'Request received',
    )
  })

  it('logs completed response at info level with status and durationMs', async () => {
    await makeApp().request('/test')
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'http', status: 200, durationMs: expect.any(Number) }),
      'Request completed',
    )
  })

  it('does not log request body in either log call', async () => {
    await makeApp().request('/test', {
      method: 'POST',
      body: JSON.stringify({ address: '123 Main St, Salt Lake City' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const allCalls = [
      ...vi.mocked(logger.debug).mock.calls,
      ...vi.mocked(logger.info).mock.calls,
    ]
    for (const call of allCalls) {
      expect(JSON.stringify(call)).not.toContain('123 Main St')
    }
  })

  it('includes method and path in both log entries', async () => {
    await makeApp().request('/test', { method: 'POST' })
    expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/test' }),
      'Request received',
    )
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/test' }),
      'Request completed',
    )
  })
})
