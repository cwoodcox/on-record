// apps/mcp-server/src/tools/search-bills.test.ts
// Unit tests for registerSearchBillsTool.
// All external dependencies are mocked — no real SQLite, no real HTTP.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SearchBillsResult, AppError, Bill } from '@on-record/types'

// ── Mock: cache/bills.js ─────────────────────────────────────────────────────
// Prevents any better-sqlite3 import from leaking into tool tests (Boundary 4).
vi.mock('../cache/bills.js', () => ({
  searchBillsByTheme: vi.fn(),
  getActiveSessionId: vi.fn(),
}))

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { searchBillsByTheme } from '../cache/bills.js'
import { getActiveSessionId } from '../cache/bills.js'
import { logger } from '../lib/logger.js'
import { registerSearchBillsTool } from './search-bills.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolHandler = (args: { legislatorId: string; theme: string }) => Promise<{
  content: Array<{ type: string; text: string }>
}>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): {
  invokeHandler: (args: { legislatorId: string; theme: string }) => Promise<{
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

  registerSearchBillsTool(mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer)

  return {
    invokeHandler: (args) => {
      if (!capturedHandler) throw new Error('Tool handler was not captured')
      return capturedHandler(args)
    },
  }
}

// ── Fixture: Bill objects ─────────────────────────────────────────────────────
function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'HB0042',
    session: '2026GS',
    title: 'Utah Healthcare Access Act',
    summary: 'Expands Medicaid access for low-income residents',
    status: 'Enrolled',
    sponsorId: 'RRabbitt',
    voteResult: 'Pass',
    voteDate: '2026-02-15',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('registerSearchBillsTool', () => {
  let server: ReturnType<typeof createMockServer>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    vi.mocked(getActiveSessionId).mockReturnValue('2026GS')
    server = createMockServer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── AC#1, AC#2: Happy path — returns SearchBillsResult ──────────────────

  it('returns structured JSON matching SearchBillsResult on cache hit', async () => {
    const bill = makeBill()
    vi.mocked(searchBillsByTheme).mockReturnValue([bill])

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content).toHaveLength(1)
    expect(response.content[0]?.type).toBe('text')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(result.bills[0]?.id).toBe('HB0042')
    expect(result.bills[0]?.session).toBe('2026GS')
    expect(result.bills[0]?.voteResult).toBe('Pass')
    expect(result.bills[0]?.voteDate).toBe('2026-02-15')
    expect(result.legislatorId).toBe('RRabbitt')
    expect(result.session).toBe('2026GS')
  })

  // ── AC#5: 5-bill limit ───────────────────────────────────────────────────

  it('returns at most 5 bills when cache has more than 5 matches', async () => {
    const eightBills = Array.from({ length: 8 }, (_, i) =>
      makeBill({ id: `HB000${i}`, title: `Healthcare Bill ${i}` }),
    )
    vi.mocked(searchBillsByTheme).mockReturnValue(eightBills)

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(5)
  })

  // ── AC#8: Empty result is not an error ───────────────────────────────────

  it('returns SearchBillsResult with empty bills array when no theme match', async () => {
    vi.mocked(searchBillsByTheme).mockReturnValue([])

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'cryptocurrency' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toEqual([])
    expect(result.legislatorId).toBe('RRabbitt')
    expect(result.session).toBe('2026GS')
    // Confirm it's a SearchBillsResult, not an AppError
    expect('source' in result).toBe(false)
  })

  // ── AC#3: Structured JSON ────────────────────────────────────────────────

  it('always returns content[0].type = "text" with valid JSON body', async () => {
    vi.mocked(searchBillsByTheme).mockReturnValue([makeBill()])

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content[0]?.type).toBe('text')
    expect(() => JSON.parse(response.content[0]?.text ?? '')).not.toThrow()
  })

  // ── Session field ────────────────────────────────────────────────────────

  it('populates session from getActiveSessionId regardless of bills returned', async () => {
    vi.mocked(getActiveSessionId).mockReturnValue('2025GS')
    vi.mocked(searchBillsByTheme).mockReturnValue([makeBill({ session: '2024GS' })])

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    // SearchBillsResult.session comes from getActiveSessionId, not bill.session
    expect(result.session).toBe('2025GS')
  })

  // ── AC#6: Retry on transient failure ─────────────────────────────────────

  it('retries on transient failure and succeeds on second attempt', async () => {
    const bill = makeBill()
    vi.mocked(searchBillsByTheme)
      .mockImplementationOnce(() => { throw new Error('SQLITE_BUSY') })
      .mockReturnValueOnce([bill])

    // Attach promise BEFORE advancing timers to avoid PromiseRejectionHandledWarning
    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(vi.mocked(searchBillsByTheme)).toHaveBeenCalledTimes(2)
  })

  // ── AC#7: All retries exhausted → AppError ───────────────────────────────

  it('returns AppError with source "legislature-api" when all retries are exhausted', async () => {
    vi.mocked(searchBillsByTheme).mockImplementation(() => {
      throw new Error('SQLITE_BUSY')
    })

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('legislature-api')
    expect(result.nature).toBe('Bill search is temporarily unavailable')
    expect(result.action).toBe(
      'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
    )
    // 3 total attempts: 1 initial + 2 retries
    expect(vi.mocked(searchBillsByTheme)).toHaveBeenCalledTimes(3)
  })

  // ── Logging ──────────────────────────────────────────────────────────────

  it('logs search_bills succeeded with billCount and theme on success', async () => {
    vi.mocked(searchBillsByTheme).mockReturnValue([makeBill()])

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mcp-tool',
        legislatorId: 'RRabbitt',
        billCount: 1,
        theme: 'healthcare',
      }),
      'search_bills succeeded',
    )
  })

  it('logs with source "legislature-api" when retries exhausted', async () => {
    vi.mocked(searchBillsByTheme).mockImplementation(() => {
      throw new Error('DB error')
    })

    const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api', legislatorId: 'RRabbitt' }),
      'search_bills failed after retries',
    )
  })
})
