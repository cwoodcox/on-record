// apps/mcp-server/src/lib/logger.test.ts
// Verifies that pino routes to the correct console method per level.
// These calls must go through console.* so CF Workers observability captures them.
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('logger console routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('routes info to console.log', async () => {
    const { getLogger } = await import('./logger.js')
    getLogger().info({ source: 'test' }, 'info message')
    expect(console.log).toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('routes warn to console.warn', async () => {
    const { getLogger } = await import('./logger.js')
    getLogger().warn({ source: 'test' }, 'warn message')
    expect(console.warn).toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('routes error to console.error', async () => {
    const { getLogger } = await import('./logger.js')
    getLogger().error({ source: 'test' }, 'error message')
    expect(console.error).toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })
})
