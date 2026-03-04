// apps/mcp-server/src/providers/utah-legislature.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock must be hoisted — declare before any local imports
vi.mock('../env.js', () => ({
  getEnv: vi.fn(() => ({
    UTAH_LEGISLATURE_API_KEY: 'testapikey123',
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

// Verified API response shapes from live API (2026-03-03)
const mockLegislatorResponse = {
  id: 'DAILEJ',
  formatName: 'Jennifer Dailey-Provost',
  house: 'H',
  district: '22',
  email: 'jdprovost@le.utah.gov',
  cell: '385-321-7827',
}

const mockLegislatorNoCellResponse = {
  id: 'SMITHJ',
  formatName: 'John Smith',
  house: 'S',
  district: '5',
  email: 'jsmith@le.utah.gov',
  // no cell field — phoneTypeUnknown: true
}

const mockBillListResponse = [
  { number: 'HB0001', trackingID: 'TUBFCRPIYI' },
  { number: 'HB0002', trackingID: 'BKSTYLLAEC' },
]

const mockBillDetailResponse = {
  billNumber: 'HB0001',
  sessionID: '2026GS',
  shortTitle: 'Public Education Base Budget Amendments',
  generalProvisions: 'This bill supplements or reduces appropriations...',
  lastAction: 'Governor Signed',
  primeSponsor: 'WHYTESL',
  highlightedProvisions: 'This bill amends weighted pupil unit provisions...',
}

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
    vi.resetAllMocks()
  })

  describe('getLegislatorsByDistrict', () => {
    it('returns mapped Legislator[] on valid API response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLegislatorResponse,
      })

      const promise = provider.getLegislatorsByDistrict('house', 22)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      const first = result[0]
      expect(first).toMatchObject({
        id: 'DAILEJ',
        chamber: 'house',
        district: 22,
        name: 'Jennifer Dailey-Provost',
        email: 'jdprovost@le.utah.gov',
        phone: '385-321-7827',
        phoneLabel: 'cell',
      })
      expect(first?.phoneTypeUnknown).toBeUndefined()
      expect(typeof first?.session).toBe('string')
      expect(first?.session.length).toBeGreaterThan(0)
    })

    it('sets phoneTypeUnknown: true and omits phoneLabel when cell is absent (FR5)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLegislatorNoCellResponse,
      })

      const promise = provider.getLegislatorsByDistrict('senate', 5)
      await vi.runAllTimersAsync()
      const result = await promise
      const first = result[0]

      expect(first?.phoneTypeUnknown).toBe(true)
      expect(first?.phoneLabel).toBeUndefined()
      expect(first?.phone).toBe('')
    })

    it('district string from API is parsed to number', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLegislatorResponse, // district: "22"
      })

      const promise = provider.getLegislatorsByDistrict('house', 22)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(typeof result[0]?.district).toBe('number')
      expect(result[0]?.district).toBe(22)
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
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ unexpected: 'shape' }], // array instead of object
      })

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({
        source: 'legislature-api',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('uses correct URL structure with token in path (no auth header)', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mockLegislatorResponse })

      const promise = provider.getLegislatorsByDistrict('house', 10)
      await vi.runAllTimersAsync()
      await promise

      const callArgs = fetchMock.mock.calls[0] as [string, ...unknown[]]
      const url = callArgs[0]
      expect(url).toContain('glen.le.utah.gov')
      expect(url).toContain('/legislator/H/10/')
      expect(url).toContain('testapikey123')
      // No auth header — fetch called with URL only (no options arg with headers)
      expect(callArgs[1]).toBeUndefined()
    })

    it('does not include API key value in logger.error call args on failure', async () => {
      const errorMock = vi.mocked(logger.error)
      fetchMock.mockRejectedValue(new Error('Network failure'))

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise

      for (const call of errorMock.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain('testapikey123')
      }
    })
  })

  describe('getBillsBySession', () => {
    it('returns Bill[] stubs from billlist response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBillListResponse,
      })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(2)
      const first = result[0]
      expect(first?.id).toBe('HB0001')
      expect(first?.session).toBe('2026GS')
    })

    it('uses correct URL with token in path', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mockBillListResponse })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      await promise

      const url = (fetchMock.mock.calls[0] as [string])[0]
      expect(url).toContain('/bills/2026GS/billlist/')
      expect(url).toContain('testapikey123')
    })

    it('throws AppError on API failure', async () => {
      fetchMock.mockRejectedValue(new Error('API down'))

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'shape' }), // object instead of array
      })

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })

  describe('getBillDetail', () => {
    it('returns BillDetail mapped from real API field names', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBillDetailResponse,
      })

      const promise = provider.getBillDetail('HB0001')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toMatchObject({
        id: 'HB0001',
        session: '2026GS',
        title: 'Public Education Base Budget Amendments',
        summary: 'This bill supplements or reduces appropriations...',
        status: 'Governor Signed',
        sponsorId: 'WHYTESL',
        fullText: 'This bill amends weighted pupil unit provisions...',
      })
    })

    it('throws AppError on API failure', async () => {
      fetchMock.mockRejectedValue(new Error('Bill not found'))

      const rejectionPromise = expect(provider.getBillDetail('HB0001')).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ unexpected: 'shape' }],
      })

      const rejectionPromise = expect(provider.getBillDetail('HB0001')).rejects.toMatchObject({
        source: 'legislature-api',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })
})
