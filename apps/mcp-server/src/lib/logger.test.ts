// apps/mcp-server/src/lib/logger.test.ts
// Verifies that logger methods route to the correct console method per level.
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('logger console routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('routes info to console.log', async () => {
    const { logger } = await import('./logger.js')
    logger.info({ source: 'test' }, 'info message')
    expect(console.log).toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('routes warn to console.warn', async () => {
    const { logger } = await import('./logger.js')
    logger.warn({ source: 'test' }, 'warn message')
    expect(console.warn).toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('routes error to console.error', async () => {
    const { logger } = await import('./logger.js')
    logger.error({ source: 'test' }, 'error message')
    expect(console.error).toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })
})
