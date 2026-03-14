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

const mockBillDetail2Response = {
  billNumber: 'HB0002',
  sessionID: '2026GS',
  shortTitle: 'Transportation Infrastructure Amendments',
  generalProvisions: 'This bill modifies transportation funding provisions...',
  lastAction: 'Enrolled',
  primeSponsor: 'ANDERSJ',
  // no highlightedProvisions — optional field absent
}

const mockBillDetailWithVoteResponse = {
  billNumber: 'HB0001',
  sessionID: '2026GS',
  shortTitle: 'Public Education Base Budget Amendments',
  generalProvisions: 'This bill supplements or reduces appropriations...',
  lastAction: 'Governor Signed',
  primeSponsor: 'WHYTESL',
  voteResult: 'passed',
  voteDate: '2026-03-01',
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
        text: async () => JSON.stringify(mockLegislatorResponse),
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
        text: async () => JSON.stringify(mockLegislatorNoCellResponse),
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
        text: async () => JSON.stringify(mockLegislatorResponse), // district: "22"
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
        nature: 'Failed to fetch legislators from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{ unexpected: 'shape' }]), // array instead of object
      })

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({
        source: 'legislature-api',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('uses correct URL structure with token in path (no auth header)', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockLegislatorResponse) })

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

    it('throws AppError when API returns non-JSON HTTP 200 body (regression: "Invalid request" plain text)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => 'Invalid request',
      })

      const rejectionPromise = expect(provider.getLegislatorsByDistrict('house', 10)).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Failed to fetch legislators from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })

  describe('getBillsBySession', () => {
    it('returns fully-hydrated Bill[] with all required fields populated', async () => {
      // list call + two detail calls (one per bill)
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillListResponse) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetailResponse) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetail2Response) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(2)

      const first = result[0]
      expect(first?.id).toBe('HB0001')
      expect(first?.session).toBe('2026GS')
      expect(first?.title).toBe('Public Education Base Budget Amendments')
      expect(first?.summary).toBe('This bill supplements or reduces appropriations...')
      expect(first?.status).toBe('Governor Signed')
      expect(first?.sponsorId).toBe('WHYTESL')

      const second = result[1]
      expect(second?.id).toBe('HB0002')
      expect(second?.title).toBe('Transportation Infrastructure Amendments')
      expect(second?.sponsorId).toBe('ANDERSJ')
    })

    it('returns Bill[] with no empty-string fields — all required fields populated', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillListResponse) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetailResponse) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetail2Response) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      for (const bill of result) {
        expect(bill.id).not.toBe('')
        expect(bill.session).not.toBe('')
        expect(bill.title).not.toBe('')
        expect(bill.summary).not.toBe('')
        expect(bill.status).not.toBe('')
        expect(bill.sponsorId).not.toBe('')
      }
    })

    it('skips individual bill detail failures and returns the successful bills', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillListResponse) })
        // HB0001 detail fetch fails on all attempts
        .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
        .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
        .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
        // HB0002 detail fetch succeeds
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetail2Response) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0002')
    })

    it('populates voteResult and voteDate when detail response includes them', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0001', trackingID: 'TUBFCRPIYI' }]) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetailWithVoteResponse) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      const bill = result[0]
      expect(bill?.voteResult).toBe('passed')
      expect(bill?.voteDate).toBe('2026-03-01')
    })

    it('includes bill with empty lastAction as status "" rather than silently dropping it', async () => {
      const billWithEmptyLastAction = { ...mockBillDetailResponse, lastAction: '' }
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0001', trackingID: 'TUBFCRPIYI' }]) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(billWithEmptyLastAction) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe('')
    })

    it('omits voteResult and voteDate (undefined, not empty string) when detail response lacks them', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0002', trackingID: 'BKSTYLLAEC' }]) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetail2Response) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(1)
      const bill = result[0]
      // exactOptionalPropertyTypes: true — property must not be present at all (not undefined assignment)
      expect('voteResult' in (bill ?? {})).toBe(false)
      expect('voteDate' in (bill ?? {})).toBe(false)
    })

    it('uses correct URL with token in path for bill list fetch', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0001', trackingID: 'TUBFCRPIYI' }]) })
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetailResponse) })

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      await promise

      const url = (fetchMock.mock.calls[0] as [string])[0]
      expect(url).toContain('/bills/2026GS/billlist/')
      expect(url).toContain('testapikey123')
    })

    it('throws AppError with specific nature and action strings when bill list fetch fails after retries', async () => {
      fetchMock.mockRejectedValue(new Error('API down'))

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Failed to fetch bills from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('logs error and returns empty array when all bill detail fetches fail after retries', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0001', trackingID: 'TUBFCRPIYI' }]) })
        .mockRejectedValue(new Error('Network error on detail'))

      const promise = provider.getBillsBySession('2026GS')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toHaveLength(0)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'legislature-api' }),
        'getBillDetail failed for individual bill — skipping',
      )
    })

    it('throws AppError when bill list API returns unexpected response shape (zod parse failure)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ unexpected: 'shape' }), // object instead of array
      })

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Utah Legislature API returned an unexpected bills data format',
        action: 'This is a system error — please try again later',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('does not include API key value in logger.error call args on bill list failure', async () => {
      const errorMock = vi.mocked(logger.error)
      fetchMock.mockRejectedValue(new Error('Network failure'))

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({ source: 'legislature-api' })
      await vi.runAllTimersAsync()
      await rejectionPromise

      for (const call of errorMock.mock.calls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain('testapikey123')
      }
    })

    it('throws AppError when bill list API returns non-JSON HTTP 200 body (regression: "Invalid request" plain text)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => 'Invalid request',
      })

      const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Failed to fetch bills from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })

  describe('getBillDetail', () => {
    it('returns BillDetail mapped from real API field names', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockBillDetailResponse),
      })

      const promise = provider.getBillDetail('HB0001', '2026GS')
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

      const rejectionPromise = expect(provider.getBillDetail('HB0001', '2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Failed to fetch bill detail for HB0001 from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('throws AppError when API returns unexpected response shape (zod parse failure)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{ unexpected: 'shape' }]),
      })

      const rejectionPromise = expect(provider.getBillDetail('HB0001', '2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Utah Legislature API returned an unexpected bill detail format',
        action: 'This is a system error — please try again later',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })

    it('builds URL using the provided session, not getCurrentSession()', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockBillDetailResponse),
      })

      const promise = provider.getBillDetail('HB0001', '2025GS')
      await vi.runAllTimersAsync()
      await promise

      const firstCall = fetchMock.mock.calls[0] as [string, ...unknown[]]
      expect(firstCall[0]).toContain('/bills/2025GS/HB0001/')
    })

    it('throws AppError when API returns non-JSON HTTP 200 body (regression: "Invalid request" plain text)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => 'Invalid request',
      })

      const rejectionPromise = expect(provider.getBillDetail('HB0001', '2026GS')).rejects.toMatchObject({
        source: 'legislature-api',
        nature: 'Failed to fetch bill detail for HB0001 from Utah Legislature API',
        action: 'Try again in a few seconds — the API may be temporarily unavailable',
      })
      await vi.runAllTimersAsync()
      await rejectionPromise
    })
  })
})
