// apps/mcp-server/src/tools/search-bills.test.ts
// Unit tests for registerSearchBillsTool.
// All external dependencies are mocked — no real SQLite, no real HTTP.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SearchBillsResult, AppError, Bill } from '@on-record/types'

// ── Mock: cache/bills.js ─────────────────────────────────────────────────────
// Prevents any better-sqlite3 import from leaking into tool tests (Boundary 4).
vi.mock('../cache/bills.js', () => ({
  searchBills: vi.fn(),
}))

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { searchBills } from '../cache/bills.js'
import { logger } from '../lib/logger.js'
import { registerSearchBillsTool } from './search-bills.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>
}>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): {
  invokeHandler: (args: Record<string, unknown>) => Promise<{
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
        _annotations: unknown,
        handler: ToolHandler,
      ) => {
        capturedHandler = handler
      },
    ),
  }

  registerSearchBillsTool(mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer, {} as D1Database)

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

function makeSearchBillsResult(overrides: Partial<SearchBillsResult> = {}): SearchBillsResult {
  return {
    bills: [makeBill()],
    total: 1,
    count: 1,
    offset: 0,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('registerSearchBillsTool', () => {
  let server: ReturnType<typeof createMockServer>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    server = createMockServer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── AC#1: No params → SearchBillsResult ─────────────────────────────────

  it('returns structured JSON matching SearchBillsResult when called with no params (AC#1)', async () => {
    vi.mocked(searchBills).mockResolvedValue(makeSearchBillsResult())

    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content).toHaveLength(1)
    expect(response.content[0]?.type).toBe('text')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.count).toBe(1)
    expect(result.offset).toBe(0)
    expect(vi.mocked(searchBills)).toHaveBeenCalledWith(expect.anything(), {})
  })

  // ── AC#8 (empty result not error) ────────────────────────────────────────

  it('returns SearchBillsResult with empty bills when no matches — not an error (AC#8)', async () => {
    vi.mocked(searchBills).mockResolvedValue({ bills: [], total: 0, count: 0, offset: 0 })

    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toEqual([])
    expect(result.total).toBe(0)
    // Confirm it's a SearchBillsResult, not an AppError
    expect('source' in result).toBe(false)
  })

  // ── AC#9: Structured JSON ────────────────────────────────────────────────

  it('always returns content[0].type = "text" with valid JSON body (AC#9)', async () => {
    vi.mocked(searchBills).mockResolvedValue(makeSearchBillsResult())

    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    const response = await promise

    expect(response.content[0]?.type).toBe('text')
    expect(() => JSON.parse(response.content[0]?.text ?? '')).not.toThrow()
  })

  // ── AC#10: Retry on transient failure ────────────────────────────────────

  it('retries on transient failure and succeeds on second attempt (AC#10)', async () => {
    vi.mocked(searchBills)
      .mockImplementationOnce(() => { throw new Error('SQLITE_BUSY') })
      .mockResolvedValueOnce(makeSearchBillsResult())

    const promise = server.invokeHandler({ sponsorId: 'RRabbitt' })
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as SearchBillsResult
    expect(result.bills).toHaveLength(1)
    expect(vi.mocked(searchBills)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(searchBills)).toHaveBeenCalledWith(expect.anything(), { sponsorId: 'RRabbitt' })
  })

  // ── AC#11: All retries exhausted → AppError ──────────────────────────────

  it('returns AppError with source "legislature-api" when all retries are exhausted (AC#11)', async () => {
    vi.mocked(searchBills).mockImplementation(() => {
      throw new Error('SQLITE_BUSY')
    })

    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    const response = await promise

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('legislature-api')
    expect(result.nature).toContain('Bill search is temporarily unavailable')
    expect(result.action).toContain('Try again in a few seconds')
    // 3 total attempts: 1 initial + 2 retries
    expect(vi.mocked(searchBills)).toHaveBeenCalledTimes(3)
  })

  // ── Logging on success ───────────────────────────────────────────────────

  it('logs search_bills succeeded with billCount and filters on success', async () => {
    vi.mocked(searchBills).mockResolvedValue(makeSearchBillsResult())

    const promise = server.invokeHandler({ sponsorId: 'RRabbitt', session: '2026GS' })
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mcp-tool',
        billCount: 1,
      }),
      'search_bills succeeded',
    )
  })

  // ── Logging on failure ───────────────────────────────────────────────────

  it('logs with source "legislature-api" when retries exhausted', async () => {
    vi.mocked(searchBills).mockImplementation(() => {
      throw new Error('DB error')
    })

    const promise = server.invokeHandler({})
    await vi.runAllTimersAsync()
    await promise

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api' }),
      'search_bills failed after retries',
    )
  })
})
