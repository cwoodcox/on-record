import { describe, it, expect, vi, beforeEach } from 'vitest'

// Each test uses vi.resetModules() + dynamic import to reset the _env singleton
// between test cases, since env.ts uses a module-level `let _env` that persists
// across imports within a single test run.

const VALID_ENV = {
  UTAH_LEGISLATURE_API_KEY: 'test-legislature-key',
  UGRC_API_KEY: 'test-ugrc-key',
}

describe('validateEnv()', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('returns validated env when all required vars are set', async () => {
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
    vi.stubEnv('NODE_ENV', 'development')

    const { validateEnv } = await import('./env.js')
    const env = validateEnv()

    expect(env.UTAH_LEGISLATURE_API_KEY).toBe(VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    expect(env.UGRC_API_KEY).toBe(VALID_ENV.UGRC_API_KEY)
    expect(env.PORT).toBe(3001)
    expect(env.NODE_ENV).toBe('development')
  })

  it('defaults PORT to 3001 when PORT is not set', async () => {
    // zod .default('3001') only fires when the key is absent (undefined),
    // not when it is set to an empty string.
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
    delete process.env['PORT']

    const { validateEnv } = await import('./env.js')
    const env = validateEnv()

    expect(env.PORT).toBe(3001)
  })

  it('uses provided PORT when set', async () => {
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
    vi.stubEnv('PORT', '8080')

    const { validateEnv } = await import('./env.js')
    const env = validateEnv()

    expect(env.PORT).toBe(8080)
  })

  it('calls process.exit(1) when UTAH_LEGISLATURE_API_KEY is missing', async () => {
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { validateEnv } = await import('./env.js')
    validateEnv()

    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('calls process.exit(1) when UGRC_API_KEY is missing', async () => {
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { validateEnv } = await import('./env.js')
    validateEnv()

    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('calls process.exit(1) when PORT is out of range', async () => {
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
    vi.stubEnv('PORT', '99999')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { validateEnv } = await import('./env.js')
    validateEnv()

    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('accepts valid NODE_ENV values', async () => {
    for (const nodeEnv of ['development', 'production', 'test'] as const) {
      vi.resetModules()
      vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
      vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)
      vi.stubEnv('NODE_ENV', nodeEnv)

      const { validateEnv } = await import('./env.js')
      const env = validateEnv()

      expect(env.NODE_ENV).toBe(nodeEnv)
    }
  })
})

describe('getEnv()', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('throws when called before validateEnv()', async () => {
    const { getEnv } = await import('./env.js')
    expect(() => getEnv()).toThrow('getEnv() called before validateEnv()')
  })

  it('returns the same validated env after validateEnv() is called', async () => {
    vi.stubEnv('UTAH_LEGISLATURE_API_KEY', VALID_ENV.UTAH_LEGISLATURE_API_KEY)
    vi.stubEnv('UGRC_API_KEY', VALID_ENV.UGRC_API_KEY)

    const { validateEnv, getEnv } = await import('./env.js')
    const fromValidate = validateEnv()
    const fromGet = getEnv()

    expect(fromGet).toBe(fromValidate)
  })
})
