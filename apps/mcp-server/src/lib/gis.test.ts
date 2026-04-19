// apps/mcp-server/src/lib/gis.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { isAppError } from '@on-record/types'
import { retryWithDelay } from './retry.js'
import type { GisDistrictResult } from './gis.js'

// vi.mock declarations are hoisted by Vitest — must be before any import of the module under test
vi.mock('./retry.js', () => ({
  retryWithDelay: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}))

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))


const TEST_API_KEY = 'test-api-key'

// Dynamic import inside beforeAll — top-level await not valid in NodeNext without "type":"module"
// in package.json; beforeAll guarantees mocks are applied before the module under test loads.
let resolveAddressToDistricts: (street: string, zone: string, apiKey: string) => Promise<GisDistrictResult>
beforeAll(async () => {
  const mod = await import('./gis.js')
  resolveAddressToDistricts = mod.resolveAddressToDistricts
})

// Reusable mock response helpers
const geocodeOk = {
  ok: true,
  json: async () => ({
    status: 200,
    result: {
      location: { x: -111.89, y: 40.76 },
      score: 85.3,
      matchAddress: '123 S Main St, Salt Lake City',
    },
  }),
} as unknown as Response

const houseOk = {
  ok: true,
  json: async () => ({ status: 200, result: [{ attributes: { dist: 22 } }] }),
} as unknown as Response

const senateOk = {
  ok: true,
  json: async () => ({ status: 200, result: [{ attributes: { dist: 10 } }] }),
} as unknown as Response

describe('resolveAddressToDistricts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns correct GisDistrictResult on successful lookup', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(geocodeOk)
      .mockResolvedValueOnce(houseOk)
      .mockResolvedValueOnce(senateOk)

    const result = await resolveAddressToDistricts('123 S Main St', 'Salt Lake City', TEST_API_KEY)
    expect(result.houseDistrict).toBe(22)
    expect(result.senateDistrict).toBe(10)
    expect(result.resolvedAddress).toBe('123 S Main St, Salt Lake City')
    // AC5: verify geocode fetch was wrapped in retryWithDelay(fn, 2, 1000, shouldRetry)
    expect(vi.mocked(retryWithDelay)).toHaveBeenCalledWith(
      expect.any(Function),
      2,
      1000,
      expect.any(Function),
    )
  })

  it('throws AppError when geocode fetch rejects (network error)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) {
      expect(err.source).toBe('gis-api')
      expect(err.nature).toBe('Address lookup failed — the GIS service is unavailable')
      expect(err.action).toBe(
        'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
      )
    }
  })

  it('throws AppError with address-not-found message when geocode returns 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) {
      expect(err.source).toBe('gis-api')
      expect(err.nature).toBe('Address not found')
      expect(err.action).toBe(
        'Check that the address is a valid Utah street address and try again.',
      )
    }
  })

  it('throws AppError with malformed-request message when geocode returns 400', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 400 } as Response)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) {
      expect(err.source).toBe('gis-api')
      expect(err.nature).toBe('Address lookup failed — request was malformed')
      expect(err.action).toBe(
        'This is an internal error. Please try again or contact support if the problem persists.',
      )
    }
  })

  it('throws AppError when geocode score is below 70', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 200,
        result: { location: { x: -111.89, y: 40.76 }, score: 45 },
      }),
    } as unknown as Response)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) expect(err.source).toBe('gis-api')
  })

  it('throws AppError when geocode result is null/missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 200, result: null }),
    } as unknown as Response)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) expect(err.source).toBe('gis-api')
  })

  it('throws AppError when district query returns non-ok HTTP status', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(geocodeOk)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(senateOk)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) expect(err.source).toBe('gis-api')
  })

  it('throws AppError when district result is empty array (address outside Utah)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(geocodeOk)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 200, result: [] }),
      } as unknown as Response)
      .mockResolvedValueOnce(senateOk)
    const err = await resolveAddressToDistricts('123 S Main St', 'SLC', TEST_API_KEY).catch((e: unknown) => e)
    expect(isAppError(err)).toBe(true)
    if (isAppError(err)) expect(err.source).toBe('gis-api')
  })
})
