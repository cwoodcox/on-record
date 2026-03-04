// apps/mcp-server/src/tools/legislator-lookup.test.ts
// Unit tests for registerLookupLegislatorTool.
// All external dependencies are mocked — no real HTTP, no SQLite, no env reads.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Legislator, LookupLegislatorResult, AppError } from '@on-record/types'

// ── Mock: cache/legislators.js ───────────────────────────────────────────────
// Prevents any better-sqlite3 import from leaking into tool tests (Boundary 4).
vi.mock('../cache/legislators.js', () => ({
  getLegislatorsByDistrict: vi.fn(),
}))

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
// Required because logger is a Proxy — vi.spyOn fails on Proxies.
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Mock: env.js ─────────────────────────────────────────────────────────────
// Prevent validateEnv() requirement; provide a stable UGRC_API_KEY.
vi.mock('../env.js', () => ({
  getEnv: () => ({
    UGRC_API_KEY: 'test-ugrc-key',
    PORT: 3001,
    NODE_ENV: 'test',
    UTAH_LEGISLATURE_API_KEY: 'test-key',
  }),
}))

// ── Mock: fetch (global) ─────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { getLegislatorsByDistrict } from '../cache/legislators.js'
import { logger } from '../lib/logger.js'
import { registerLookupLegislatorTool } from './legislator-lookup.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolHandler = (args: { address: string }) => Promise<{
  content: Array<{ type: string; text: string }>
}>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): { invokeHandler: (args: { address: string }) => Promise<{ content: Array<{ type: string; text: string }> }> } {
  let capturedHandler: ToolHandler | undefined

  const mockServer = {
    tool: vi.fn(
      (
        _name: string,
        _description: string,
        _schema: unknown,
        handler: ToolHandler,
      ) => {
        capturedHandler = handler
      },
    ),
  }

  // Register the tool — this populates capturedHandler
  registerLookupLegislatorTool(mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer)

  return {
    invokeHandler: (args) => {
      if (!capturedHandler) throw new Error('Tool handler was not captured')
      return capturedHandler(args)
    },
  }
}

// ── Fixture: successful geocode response ─────────────────────────────────────
function makeGeocodeResponse(score = 90.5, x = -111.891, y = 40.76): Response {
  return new Response(
    JSON.stringify({
      status: 200,
      result: { location: { x, y }, score },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function makeDistrictResponse(dist: string): Response {
  return new Response(
    JSON.stringify({ result: [{ attributes: { DIST: dist } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

/** Simulates a UGRC district query that returns no results (out-of-state / no district). */
function makeEmptyDistrictResponse(): Response {
  return new Response(
    JSON.stringify({ result: [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// ── Fixture: legislator objects ───────────────────────────────────────────────
function makeLegislator(overrides: Partial<Legislator> = {}): Legislator {
  return {
    id: 'leg-001',
    chamber: 'house',
    district: 29,
    name: 'Jane Smith',
    email: 'jsmith@utah.gov',
    phone: '801-555-0100',
    phoneLabel: 'cell',
    session: '2025GS',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('registerLookupLegislatorTool', () => {
  let server: ReturnType<typeof createMockServer>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    server = createMockServer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── AC#1, AC#2: Happy path — returns LookupLegislatorResult ─────────────

  it('returns structured JSON matching LookupLegislatorResult on valid address', async () => {
    const houseLeg = makeLegislator({ id: 'house-1', chamber: 'house', district: 29 })
    const senateLeg = makeLegislator({ id: 'senate-1', chamber: 'senate', district: 10 })

    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())     // Phase 1: geocode
      .mockResolvedValueOnce(makeDistrictResponse('29')) // Phase 2: house
      .mockResolvedValueOnce(makeDistrictResponse('10')) // Phase 2: senate

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([houseLeg])   // house district 29
      .mockReturnValueOnce([senateLeg])  // senate district 10

    const promise = server.invokeHandler({ address: '123 S State St, Salt Lake City, UT 84111' })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content).toHaveLength(1)
    expect(response.content[0]?.type).toBe('text')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    expect(result.legislators).toHaveLength(2)
    expect(result.session).toBe('2025GS')
    expect(result.resolvedAddress).toBe('123 S State St, Salt Lake City, UT 84111')
  })

  // ── AC#3: phoneTypeUnknown when no phoneLabel ───────────────────────────

  it('includes phoneTypeUnknown: true when getLegislatorsByDistrict returns a legislator with no phoneLabel', async () => {
    // Build a legislator without phoneLabel — phoneTypeUnknown should be present
    const leg: Legislator = {
      id: 'leg-001',
      chamber: 'house',
      district: 29,
      name: 'Jane Smith',
      email: 'jsmith@utah.gov',
      phone: '801-555-0100',
      phoneTypeUnknown: true,
      session: '2025GS',
    }

    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse('29'))
      .mockResolvedValueOnce(makeDistrictResponse('10'))

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([leg])
      .mockReturnValueOnce([])

    const promise = server.invokeHandler({ address: '123 S State St, SLC, UT' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult

    expect(result.legislators[0]?.phoneTypeUnknown).toBe(true)
    expect(result.legislators[0]?.phoneLabel).toBeUndefined()
  })

  // ── AC#4: Response is structured JSON, never prose ──────────────────────

  it('always returns content[0].type = "text" with JSON-stringified body', async () => {
    const leg = makeLegislator()

    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse('29'))
      .mockResolvedValueOnce(makeDistrictResponse('10'))

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([leg])
      .mockReturnValueOnce([])

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content[0]?.type).toBe('text')
    // Must be valid JSON
    expect(() => JSON.parse(response.content[0]?.text ?? '')).not.toThrow()
  })

  // ── AC#6: Address redaction — '[REDACTED]' in all log calls ─────────────

  it('never logs the real address — all log context objects contain "[REDACTED]"', async () => {
    const leg = makeLegislator()

    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse('29'))
      .mockResolvedValueOnce(makeDistrictResponse('10'))

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([leg])
      .mockReturnValueOnce([])

    const promise = server.invokeHandler({ address: '123 S State St, Salt Lake City' })
    await vi.runAllTimersAsync()
    await promise

    const allLogCalls = [
      ...vi.mocked(logger.info).mock.calls,
      ...vi.mocked(logger.error).mock.calls,
      ...vi.mocked(logger.debug).mock.calls,
    ]

    // At least one log call should have occurred
    expect(allLogCalls.length).toBeGreaterThan(0)

    for (const [context] of allLogCalls) {
      const serialized = JSON.stringify(context)
      expect(serialized).not.toContain('123 S State St')
      expect(serialized).toContain('[REDACTED]')
    }
  })

  // ── AC#7: GIS API failure → AppError with source: 'gis-api' ────────────

  it('returns AppError JSON with source "gis-api" when UGRC geocode fails (HTTP error)', async () => {
    // All 3 attempts (1 + 2 retries) fail
    mockFetch
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('gis-api')
    expect(typeof result.nature).toBe('string')
    expect(typeof result.action).toBe('string')
  })

  it('returns AppError JSON with source "gis-api" when geocode score < 70', async () => {
    // Low score is a semantic failure (not retried) — only 1 fetch call
    mockFetch.mockResolvedValueOnce(makeGeocodeResponse(60))

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('gis-api')
    expect(result.nature).toBe('Could not resolve that address to a legislative district')
    // Only 1 fetch call — no retries for semantic failures
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ── AC#8: Cache miss → AppError with source: 'cache' ───────────────────

  it('returns AppError JSON with source "cache" when no legislators found in cache', async () => {
    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse('29'))
      .mockResolvedValueOnce(makeDistrictResponse('10'))

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([])  // house: empty
      .mockReturnValueOnce([])  // senate: empty

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('cache')
    expect(typeof result.nature).toBe('string')
    expect(typeof result.action).toBe('string')
  })

  // ── AC#9: retryWithDelay wraps UGRC call — retry timing test ────────────

  it('retries UGRC call on transient failure and succeeds on second attempt', async () => {
    const leg = makeLegislator()
    mockFetch
      // First attempt: geocode fails with 503
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      // Second attempt (after 1s delay): geocode succeeds
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse('29'))
      .mockResolvedValueOnce(makeDistrictResponse('10'))

    vi.mocked(getLegislatorsByDistrict)
      .mockReturnValueOnce([leg])
      .mockReturnValueOnce([])

    // Attach promise BEFORE advancing timers to avoid PromiseRejectionHandledWarning
    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    expect(result.legislators).toHaveLength(1)
    // fetch: 1 (failed geocode) + 1 (geocode) + 2 (districts) = 4 total
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('exhausts all retries and returns gis-api AppError when all attempts fail', async () => {
    // All 3 attempts fail (1 initial + 2 retries)
    mockFetch
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('gis-api')
    // 3 total attempts: mockFetch called 3 times (all geocode phase 1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  // ── isAppError forwarding — upstream AppError preserved ─────────────────

  it('forwards the upstream AppError (does not re-wrap) when geocode returns semantic error', async () => {
    // Low confidence is a semantic failure — returned (not thrown), no retries
    mockFetch.mockResolvedValueOnce(makeGeocodeResponse(50))

    const promise = server.invokeHandler({ address: '123 S State St, SLC' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    // The precise AppError from ugrcGeocode must be forwarded, not wrapped
    expect(result.source).toBe('gis-api')
    expect(result.nature).toBe('Could not resolve that address to a legislative district')
    // Only 1 fetch — semantic errors are not retried
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ── Story 2.5: Error classification ─────────────────────────────────────

  it('returns AppError with P.O. Box guidance before making any GIS request', async () => {
    const result = await server.invokeHandler({ address: 'PO Box 123, Salt Lake City UT 84101' })
    const parsed = JSON.parse(result.content[0]?.text ?? '{}') as AppError

    expect(parsed.source).toBe('gis-api')
    expect(parsed.nature).toBe('P.O. Box addresses cannot be geocoded to a legislative district')
    expect(parsed.action).toMatch(/street address/i)
    // No GIS fetch should have been called
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns P.O. Box AppError for variant spellings: "p.o. box", "P.O.Box", "po box"', async () => {
    const variants = ['p.o. box 1', 'P.O.Box 42', 'po box 999 Provo UT']
    for (const address of variants) {
      vi.clearAllMocks()
      server = createMockServer()
      const result = await server.invokeHandler({ address })
      const parsed = JSON.parse(result.content[0]?.text ?? '{}') as AppError
      expect(parsed.source).toBe('gis-api')
      expect(parsed.nature).toBe('P.O. Box addresses cannot be geocoded to a legislative district')
      expect(mockFetch).not.toHaveBeenCalled()
    }
  })

  it('logs [REDACTED] (not raw address) when P.O. Box is submitted', async () => {
    const address = 'PO Box 555, Provo UT 84601'
    await server.invokeHandler({ address })

    const allLogCalls = [
      ...vi.mocked(logger.info).mock.calls,
      ...vi.mocked(logger.error).mock.calls,
      ...vi.mocked(logger.debug).mock.calls,
    ]

    for (const [context] of allLogCalls) {
      const serialized = JSON.stringify(context)
      expect(serialized).not.toContain('PO Box 555')
      expect(serialized).not.toContain('Provo')
    }
  })

  it('returns out-of-state AppError when district lookup returns empty results (NaN districts)', async () => {
    // Geocode succeeds but district queries return empty results → NaN parse
    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())         // geocode: ok
      .mockResolvedValueOnce(makeEmptyDistrictResponse())  // house: empty
      .mockResolvedValueOnce(makeEmptyDistrictResponse())  // senate: empty

    const promise = server.invokeHandler({ address: '123 Main St, Denver CO 80203' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('gis-api')
    expect(result.nature).toBe('That address appears to be outside Utah')
    expect(result.action).toMatch(/utah street address/i)
  })

  it('returns unresolvable AppError when geocode score is below threshold', async () => {
    // Low score is a SEMANTIC failure — ugrcGeocode returns (not throws) an AppError.
    // retryWithDelay does not retry returned values, only thrown exceptions.
    // Therefore only 1 fetch call occurs, regardless of retry count.
    mockFetch.mockResolvedValueOnce(makeGeocodeResponse(55))

    const promise = server.invokeHandler({ address: 'Rural Route 4, Wayne County UT' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('gis-api')
    expect(result.nature).toBe('Could not resolve that address to a legislative district')
    expect(result.action).toMatch(/zip code/i)
    // Only 1 fetch — semantic failures are returned (not thrown) so retryWithDelay does not retry
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('returns GIS API unavailable AppError (network failure) after retries exhausted — non-AppError path', async () => {
    // Simulate all 3 geocode attempts throwing a non-AppError (network error)
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    const promise = server.invokeHandler({ address: '123 S State St, SLC UT' })
    await vi.runAllTimersAsync()
    const response = await promise
    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError

    expect(result.source).toBe('gis-api')
    expect(result.nature).toBe('Address lookup service is temporarily unavailable')
    expect(result.action).toBe('Wait a moment and try again')
  })
})
