// apps/mcp-server/src/providers/utah-legislature.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock must be hoisted — declare before any local imports
vi.mock('../env.js', () => ({
  getEnv: vi.fn(() => ({
    UTAH_LEGISLATURE_API_KEY: 'test-api-key-not-real',
    PORT: 3001,
    NODE_ENV: 'test' as const,
    UGRC_API_KEY: 'test-ugrc-key',
  })),
}))

// Mock the pino logger to enable spying — logger is a Proxy and cannot be spied on directly
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { UtahLegislatureProvider } from './utah-legislature.js'
import { logger } from '../lib/logger.js'

describe('UtahLegislatureProvider', () => {
  let provider: UtahLegislatureProvider
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    provider = new UtahLegislatureProvider()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('getLegislatorsByDistrict', () => {
    it('returns mapped Legislator[] on valid API response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'leg-1', chamber: 'H', district: 10, name: 'Jane Smith',
            email: 'jsmith@utah.gov', phone: '801-555-0100', phoneLabel: 'cell',
          },
        ],
      })

      const promise = provider.getLegislatorsByDistrict('house', 10)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      const first = result[0]
      expect(first).toMatchObject({
        id: 'leg-1',
        chamber: 'house',
        district: 10,
        name: 'Jane Smith',
        email: 'jsmith@utah.gov',
        phone: '801-555-0100',
        phoneLabel: 'cell',
      })
      expect(first?.phoneTypeUnknown).toBeUndefined()
      // session field must be present and non-empty (getCurrentSession() stub)
      expect(typeof first?.session).toBe('string')
      expect(first?.session.length).toBeGreaterThan(0)
    })

    it('sets phoneTypeUnknown: true and omits phoneLabel when API returns no label (FR5)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'leg-2', chamber: 'S', district: 5, name: 'Bob Jones',
            email: 'bjones@utah.gov', phone: '801-555-0200',
            // no phoneLabel field
          },
        ],
      })

      const promise = provider.getLegislatorsByDistrict('senate', 5)
      await vi.runAllTimersAsync()
      const result = await promise
      const first = result[0]

      expect(first?.phoneTypeUnknown).toBe(true)
      expect(first?.phoneLabel).toBeUndefined()
    })

    it('sets phoneLabel and does NOT set phoneTypeUnknown when API provides a label', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'leg-3', chamber: 'H', district: 3, name: 'Alice Brown',
            email: 'abrown@utah.gov', phone: '801-555-0300', phoneLabel: 'district office',
          },
        ],
      })

      const promise = provider.getLegislatorsByDistrict('house', 3)
      await vi.runAllTimersAsync()
      const result = await promise
      const first = result[0]

      expect(first?.phoneLabel).toBe('district office')
      expect(first?.phoneTypeUnknown).toBeUndefined()
    })

    it('throws AppError with source legislature-api after all retries exhausted', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({
        source: 'legislature-api',
        nature: expect.any(String),
        action: expect.any(String),
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      // API returns an object instead of an array — zod safeParse will fail
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      })

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({
        source: 'legislature-api',
        nature: expect.any(String),
        action: expect.any(String),
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('sends Authorization header with API key and uses correct URL structure', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] })

      const promise = provider.getLegislatorsByDistrict('house', 10)
      await vi.runAllTimersAsync()
      await promise

      const callArgs = fetchMock.mock.calls[0] as [string, RequestInit]
      const url = callArgs[0]
      const headers = callArgs[1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer test-api-key-not-real')
      expect(url).toContain('chamber=H')
      expect(url).toContain('district=10')
      expect(url).toContain('glen.le.utah.gov')
    })

    it('does not include API key value in logger.error call args on failure', async () => {
      // logger is mocked — access error directly as a vi.fn()
      const errorMock = vi.mocked(logger.error)
      fetchMock.mockRejectedValue(new Error('Network failure'))

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise

      // The API key value must not appear in any logger.error call argument
      for (const call of errorMock.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain('test-api-key-not-real')
      }
    })
  })

  describe('getBillsBySession', () => {
    it('returns mapped Bill[] on valid response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'HB0001', session: '2025GS', title: 'Education Bill',
            summary: 'A bill about education', status: 'Enrolled', sponsorId: 'leg-1',
          },
        ],
      })

      const promise = provider.getBillsBySession('2025GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      const first = result[0]
      expect(first).toMatchObject({
        id: 'HB0001',
        session: '2025GS',
        title: 'Education Bill',
        sponsorId: 'leg-1',
      })
    })

    it('throws AppError on API failure', async () => {
      fetchMock.mockRejectedValue(new Error('API down'))

      const rejectionPromise = expect(provider.getBillsBySession('2025GS')).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      // API returns an object instead of an array — zod safeParse will fail
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      })

      const rejectionPromise = expect(provider.getBillsBySession('2025GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: expect.any(String),
        action: expect.any(String),
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })

  describe('getBillDetail', () => {
    it('returns BillDetail on valid response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'HB0234', session: '2025GS', title: 'Healthcare Bill',
          summary: 'A healthcare bill', status: 'Failed', sponsorId: 'leg-1',
          fullText: 'Full bill text here', subjects: ['healthcare', 'insurance'],
        }),
      })

      const promise = provider.getBillDetail('HB0234')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toMatchObject({
        id: 'HB0234',
        fullText: 'Full bill text here',
        subjects: ['healthcare', 'insurance'],
      })
    })

    it('throws AppError on API failure', async () => {
      fetchMock.mockRejectedValue(new Error('Bill not found'))

      const rejectionPromise = expect(provider.getBillDetail('HB0234')).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      // API returns an array instead of an object — zod safeParse will fail
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ unexpected: 'shape' }],
      })

      const rejectionPromise = expect(provider.getBillDetail('HB0234')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: expect.any(String),
        action: expect.any(String),
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })
})
