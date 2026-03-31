// apps/mcp-server/src/tools/resolve-address.test.ts
// Unit tests for registerResolveAddressTool.
// All external dependencies are mocked — no real HTTP, no env reads.
// lib/gis.js is NOT mocked — the full tool → lib → fetch stack is tested.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ResolveAddressResult, AppError } from '@on-record/types'

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
// Required because logger is a Proxy — vi.spyOn fails on Proxies.
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Mock: env.js ─────────────────────────────────────────────────────────────
// Required transitively — resolveAddressToDistricts calls getEnv() internally.
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
import { logger } from '../lib/logger.js'
import { registerResolveAddressTool } from './resolve-address.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolHandler = (args: { street: string; zone: string }) => Promise<{
  content: Array<{ type: string; text: string }>
}>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): {
  invokeHandler: (args: { street: string; zone: string }) => Promise<{
    content: Array<{ type: string; text: string }>
  }>
} {
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
  registerResolveAddressTool(
    mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
  )

  return {
    invokeHandler: (args) => {
      if (!capturedHandler) throw new Error('Tool handler was not captured')
      return capturedHandler(args)
    },
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGeocodeResponse(
  score = 90.5,
  matchAddress = '123 S State St, Salt Lake City, UT 84111',
): Response {
  return new Response(
    JSON.stringify({
      status: 200,
      result: {
        location: { x: -111.891, y: 40.76 },
        score,
        matchAddress,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function makeDistrictResponse(dist: number): Response {
  return new Response(
    JSON.stringify({ status: 200, result: [{ attributes: { dist } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('registerResolveAddressTool', () => {
  let server: ReturnType<typeof createMockServer>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    server = createMockServer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Test 1: Valid address returns ResolveAddressResult ───────────────────

  it('returns structured JSON matching ResolveAddressResult on valid address', async () => {
    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())      // geocode
      .mockResolvedValueOnce(makeDistrictResponse(24))   // house district
      .mockResolvedValueOnce(makeDistrictResponse(4))    // senate district

    const promise = server.invokeHandler({ street: '123 S State St', zone: 'Salt Lake City' })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content).toHaveLength(1)
    expect(response.content[0]?.type).toBe('text')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as ResolveAddressResult
    expect(result.houseDistrict).toBe(24)
    expect(result.senateDistrict).toBe(4)
    expect(result.resolvedAddress).toBe('123 S State St, Salt Lake City, UT 84111')

    // Verify logger.info was called with correct redacted context
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mcp-tool',
        address: '[REDACTED]',
        houseDistrict: 24,
        senateDistrict: 4,
      }),
      'resolve_address succeeded',
    )
  })

  // ── Test 2: P.O. Box address returns AppError before any GIS call ────────

  it('returns AppError with P.O. Box guidance before making any GIS request', async () => {
    const response = await server.invokeHandler({
      street: 'P.O. Box 123',
      zone: 'Salt Lake City',
    })

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('gis-api')
    expect(result.nature).toContain('P.O. Box')

    // No GIS fetch should have been called
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ── Test 3: UGRC transient failure (retries exhausted) returns AppError ──

  it('returns AppError with "unavailable" in nature when UGRC fetch throws on all retries', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))

    // Attach promise BEFORE advancing timers (CLAUDE.md timing invariant)
    const resultPromise = server.invokeHandler({ street: '123 S State St', zone: 'Salt Lake City' })
    await vi.runAllTimersAsync()
    const response = await resultPromise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('gis-api')
    expect(result.nature).toContain('unavailable')
  })

  // ── Test 4: Low-confidence geocode score returns AppError ────────────────

  it('returns AppError with "confidently located" in nature when geocode score < 70', async () => {
    mockFetch.mockResolvedValueOnce(makeGeocodeResponse(50))

    const promise = server.invokeHandler({ street: '123 S State St', zone: 'SLC' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('gis-api')
    expect(result.nature).toContain('confidently located')

    // Only 1 fetch — semantic failure, not retried
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ── Test 5: Address redaction — no street/zone in any log calls ──────────

  it('never logs the real address — all log calls contain "[REDACTED]"', async () => {
    mockFetch
      .mockResolvedValueOnce(makeGeocodeResponse())
      .mockResolvedValueOnce(makeDistrictResponse(24))
      .mockResolvedValueOnce(makeDistrictResponse(4))

    const promise = server.invokeHandler({
      street: '999 Unique Street',
      zone: 'Unique City',
    })
    await vi.runAllTimersAsync()
    await promise

    const allLogCalls = [
      ...vi.mocked(logger.info).mock.calls,
      ...vi.mocked(logger.error).mock.calls,
      ...vi.mocked(logger.debug).mock.calls,
      ...vi.mocked(logger.warn).mock.calls,
    ]

    // At least one log call must have occurred
    expect(allLogCalls.length).toBeGreaterThan(0)

    for (const [context] of allLogCalls) {
      const serialized = JSON.stringify(context)
      expect(serialized).not.toContain('999 Unique Street')
      expect(serialized).not.toContain('Unique City')
      expect(serialized).toContain('[REDACTED]')
    }
  })
})
