// apps/mcp-server/src/tools/search-bills.test.ts
// Unit tests for registerSearchBillsTool.
// All external dependencies are mocked — no real SQLite, no real HTTP.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SearchBillsResult, AppError, Bill } from '@on-record/types'

// ── Mock: cache/bills.js ─────────────────────────────────────────────────────
// Prevents any better-sqlite3 import from leaking into tool tests (Boundary 4).
vi.mock('../cache/bills.js', () => ({
  searchBills: vi.fn(),
  getActiveSessionId: vi.fn(),
}))

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { searchBills, getActiveSessionId } from '../cache/bills.js'
import { logger } from '../lib/logger.js'
import { registerSearchBillsTool } from './search-bills.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolArgs = {
  query?: string
  billId?: string
  sponsorId?: string
  session?: string
  limit?: number
}
type ToolHandler = (args: ToolArgs) => Promise<{
  content: Array<{ type: string; text: string }>
}>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): {
  invokeHandler: (args: ToolArgs) => Promise<{
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

  // ── query only — FTS path ─────────────────────────────────────────────────

  it('query only — calls searchBills with correct params and returns SearchBillsResult', async () => {
    const bill = makeBill()
    vi.mocked(searchBills).mockReturnValue([bill])

    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content).toHaveLength(1)
    expect(response.content[0]?.type).toBe('text')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(result.bills[0]?.id).toBe('HB0042')
    expect(result.session).toBe('2026GS')
    // No legislatorId when sponsorId not provided
    expect(result.legislatorId).toBeUndefined()
    expect(vi.mocked(searchBills)).toHaveBeenCalledWith({
      query: 'healthcare',
      billId: undefined,
      sponsorId: undefined,
      session: undefined,
      limit: 5,
    })
  })

  // ── billId only — ID lookup path ──────────────────────────────────────────

  it('billId only — calls searchBills, result has no legislatorId', async () => {
    const bill = makeBill({ id: 'HB0042', session: '2026GS' })
    vi.mocked(searchBills).mockReturnValue([bill])

    const promise = server.invokeHandler({ billId: 'HB0042', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills[0]?.id).toBe('HB0042')
    // Session from first returned bill (most recent)
    expect(result.session).toBe('2026GS')
    expect(result.legislatorId).toBeUndefined()
    expect(vi.mocked(searchBills)).toHaveBeenCalledWith({
      query: undefined,
      billId: 'HB0042',
      sponsorId: undefined,
      session: undefined,
      limit: 5,
    })
  })

  // ── sponsorId provided — legislatorId populated in result ─────────────────

  it('sponsorId provided — result includes legislatorId', async () => {
    const bill = makeBill()
    vi.mocked(searchBills).mockReturnValue([bill])

    const promise = server.invokeHandler({ query: 'healthcare', sponsorId: 'RRabbitt', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.legislatorId).toBe('RRabbitt')
    expect(vi.mocked(searchBills)).toHaveBeenCalledWith({
      query: 'healthcare',
      billId: undefined,
      sponsorId: 'RRabbitt',
      session: undefined,
      limit: 5,
    })
  })

  // ── neither query nor billId — error response ─────────────────────────────

  it('neither query nor billId — returns error with nature containing "no search criteria"', async () => {
    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('mcp-tool')
    expect(result.nature).toContain('no search criteria')
  })

  // ── AC#8: Empty result is not an error ───────────────────────────────────

  it('returns SearchBillsResult with empty bills array when no match', async () => {
    vi.mocked(searchBills).mockReturnValue([])

    const promise = server.invokeHandler({ query: 'cryptocurrency', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toEqual([])
    expect(result.session).toBe('2026GS')
    // Confirm it's a SearchBillsResult, not an AppError
    expect('source' in result).toBe(false)
  })

  // ── AC#3: Structured JSON ────────────────────────────────────────────────

  it('always returns content[0].type = "text" with valid JSON body', async () => {
    vi.mocked(searchBills).mockReturnValue([makeBill()])

    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content[0]?.type).toBe('text')
    expect(() => JSON.parse(response.content[0]?.text ?? '')).not.toThrow()
  })

  // ── billId lookup: session from returned bill ─────────────────────────────

  it('billId path — session in result comes from first returned bill, not getActiveSessionId', async () => {
    vi.mocked(getActiveSessionId).mockReturnValue('2026GS')
    vi.mocked(searchBills).mockReturnValue([makeBill({ session: '2025GS' })])

    const promise = server.invokeHandler({ billId: 'HB0042', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    // Session from first bill row, not from getActiveSessionId
    expect(result.session).toBe('2025GS')
  })

  // ── billId lookup with no results — fallback to getActiveSessionId ─────────

  it('billId path with no results — session falls back to getActiveSessionId', async () => {
    vi.mocked(getActiveSessionId).mockReturnValue('2026GS')
    vi.mocked(searchBills).mockReturnValue([])

    const promise = server.invokeHandler({ billId: 'HB9999', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.session).toBe('2026GS')
  })

  // ── AC#6: Retry on transient failure ─────────────────────────────────────

  it('retries on transient failure and succeeds on second attempt', async () => {
    const bill = makeBill()
    vi.mocked(searchBills)
      .mockImplementationOnce(() => { throw new Error('SQLITE_BUSY') })
      .mockReturnValueOnce([bill])

    // Attach promise BEFORE advancing timers to avoid PromiseRejectionHandledWarning
    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(vi.mocked(searchBills)).toHaveBeenCalledTimes(2)
  })

  // ── AC#7: All retries exhausted → AppError ───────────────────────────────

  it('returns AppError with source "legislature-api" when all retries are exhausted', async () => {
    vi.mocked(searchBills).mockImplementation(() => {
      throw new Error('SQLITE_BUSY')
    })

    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('legislature-api')
    expect(result.nature).toBe('Bill search is temporarily unavailable')
    expect(result.action).toBe(
      'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
    )
    // 3 total attempts: 1 initial + 2 retries
    expect(vi.mocked(searchBills)).toHaveBeenCalledTimes(3)
  })

  // ── Logging ──────────────────────────────────────────────────────────────

  it('logs search_bills succeeded with billCount and query on success', async () => {
    vi.mocked(searchBills).mockReturnValue([makeBill()])

    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mcp-tool',
        billCount: 1,
        query: 'healthcare',
      }),
      'search_bills succeeded',
    )
  })

  it('logs with source "legislature-api" when retries exhausted', async () => {
    vi.mocked(searchBills).mockImplementation(() => {
      throw new Error('DB error')
    })

    const promise = server.invokeHandler({ query: 'healthcare', limit: 5 })
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api', query: 'healthcare' }),
      'search_bills failed after retries',
    )
  })
})
