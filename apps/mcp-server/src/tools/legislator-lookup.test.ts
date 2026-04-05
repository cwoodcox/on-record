// apps/mcp-server/src/tools/legislator-lookup.test.ts
// Unit tests for registerLookupLegislatorTool (ID / name / district search modes).
// All external dependencies are mocked — no real HTTP, no SQLite.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Legislator, LookupLegislatorResult, AppError } from '@on-record/types'

// ── Mock: cache/legislators.js ───────────────────────────────────────────────
// Prevents any better-sqlite3 import from leaking into tool tests (Boundary 4).
vi.mock('../cache/legislators.js', () => ({
  getLegislatorById: vi.fn(),
  getLegislatorsByDistrict: vi.fn(),
  getLegislatorsByName: vi.fn(),
}))

// ── Mock: lib/logger.js ──────────────────────────────────────────────────────
// Required because logger is a Proxy — vi.spyOn fails on Proxies.
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import {
  getLegislatorById,
  getLegislatorsByDistrict,
  getLegislatorsByName,
} from '../cache/legislators.js'
import { registerLookupLegislatorTool } from './legislator-lookup.js'

// ── Type for captured tool handler ───────────────────────────────────────────
type ToolHandler = (args: {
  id?: string
  name?: string
  chamber?: 'house' | 'senate'
  district?: number
}) => Promise<{ content: Array<{ type: string; text: string }> }>

// ── Helper: create mock McpServer and capture handler ────────────────────────
function createMockServer(): {
  invokeHandler: (args: {
    id?: string
    name?: string
    chamber?: 'house' | 'senate'
    district?: number
  }) => Promise<{ content: Array<{ type: string; text: string }> }>
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

  registerLookupLegislatorTool(
    mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
    {} as D1Database,
  )

  return {
    invokeHandler: (args) => {
      if (!capturedHandler) throw new Error('Tool handler was not captured')
      return capturedHandler(args)
    },
  }
}

// ── Fixture: legislator objects ───────────────────────────────────────────────
function makeLegislator(overrides: Partial<Legislator> = {}): Legislator {
  return {
    id: 'SMITHJ',
    chamber: 'house',
    district: 29,
    name: 'Jane Smith',
    email: 'jsmith@utah.gov',
    phone: '801-555-0100',
    phoneLabel: 'cell',
    session: '2026GS',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('registerLookupLegislatorTool', () => {
  let server: ReturnType<typeof createMockServer>

  beforeEach(() => {
    vi.resetAllMocks()
    server = createMockServer()
  })

  // ── Test 1 — ID mode (mode C) ────────────────────────────────────────────

  it('Test 1 — ID mode: returns legislators array and session when id is provided', async () => {
    const leg = makeLegislator({ id: 'DAILEJ', name: 'Jennifer Dailey-Provost' })
    vi.mocked(getLegislatorById).mockResolvedValue(leg)

    const response = await server.invokeHandler({ id: 'DAILEJ' })

    expect(getLegislatorById).toHaveBeenCalledWith(expect.anything(), 'DAILEJ')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    expect(result.legislators).toHaveLength(1)
    expect(result.legislators[0]?.id).toBe('DAILEJ')
    expect(result.session).toBe('2026GS')
  })

  // ── Test 2 — district mode (mode B) ─────────────────────────────────────

  it('Test 2 — district mode: returns legislators when chamber and district are provided', async () => {
    const leg = makeLegislator({ id: 'DISTLG', chamber: 'house', district: 29 })
    vi.mocked(getLegislatorsByDistrict).mockResolvedValue([leg])

    const response = await server.invokeHandler({ chamber: 'house', district: 29 })

    expect(getLegislatorsByDistrict).toHaveBeenCalledWith(expect.anything(), 'house', 29)

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    expect(result.legislators).toHaveLength(1)
    expect(result.session).toBe('2026GS')
  })

  // ── Test 3 — name mode (mode A) ──────────────────────────────────────────

  it('Test 3 — name mode: returns legislators when name is provided', async () => {
    const leg = makeLegislator({ id: 'SMITHB', name: 'Bob Smith' })
    vi.mocked(getLegislatorsByName).mockResolvedValue([leg])

    const response = await server.invokeHandler({ name: 'Smith' })

    expect(getLegislatorsByName).toHaveBeenCalledWith(expect.anything(), 'Smith')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    expect(result.legislators).toHaveLength(1)
    expect(result.session).toBe('2026GS')
  })

  // ── Test 4 — multi-mode merge/dedup ──────────────────────────────────────

  it('Test 4 — multi-mode: merges and deduplicates results across id and name modes', async () => {
    const sharedLeg = makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' })
    const extraLeg = makeLegislator({ id: 'SMITHB', name: 'Bob Smith', district: 30 })

    vi.mocked(getLegislatorById).mockResolvedValue(sharedLeg)
    vi.mocked(getLegislatorsByName).mockResolvedValue([sharedLeg, extraLeg])

    const response = await server.invokeHandler({ id: 'SMITHJ', name: 'Smith' })

    expect(getLegislatorById).toHaveBeenCalledWith(expect.anything(), 'SMITHJ')
    expect(getLegislatorsByName).toHaveBeenCalledWith(expect.anything(), 'Smith')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as LookupLegislatorResult
    // SMITHJ appears in both id result and name result — should be deduped
    const ids = result.legislators.map((l) => l.id)
    expect(ids.filter((id) => id === 'SMITHJ')).toHaveLength(1)
    // SMITHB from name search is included
    expect(ids).toContain('SMITHB')
  })

  // ── Test 5 — no valid mode ───────────────────────────────────────────────

  it('Test 5 — no valid mode: returns AppError with "at least one search mode" when {} provided', async () => {
    const response = await server.invokeHandler({})

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('mcp-tool')
    expect(result.nature).toContain('at least one search mode')
  })

  // ── Test 6 — partial pair (chamber only) ────────────────────────────────

  it('Test 6 — partial pair chamber only: returns AppError with "chamber and district"', async () => {
    const response = await server.invokeHandler({ chamber: 'house' })

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('mcp-tool')
    expect(result.nature).toContain('chamber and district')
  })

  // ── Test 7 — partial pair (district only) ───────────────────────────────

  it('Test 7 — partial pair district only: returns AppError with "chamber and district"', async () => {
    const response = await server.invokeHandler({ district: 14 })

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('mcp-tool')
    expect(result.nature).toContain('chamber and district')
  })

  // ── Test 8 — cache miss ──────────────────────────────────────────────────

  it('Test 8 — cache miss: returns AppError with source "cache" and "No legislators found" when id returns null', async () => {
    vi.mocked(getLegislatorById).mockResolvedValue(null)

    const response = await server.invokeHandler({ id: 'NOBODY' })

    expect(getLegislatorById).toHaveBeenCalledWith(expect.anything(), 'NOBODY')

    const result = JSON.parse(response.content[0]?.text ?? '{}') as AppError
    expect(result.source).toBe('cache')
    expect(result.nature).toContain('No legislators found')
  })

  // ── Test 9 — structured JSON always ──────────────────────────────────────

  it('Test 9 — structured JSON: content[0].type is always "text" and body is valid JSON', async () => {
    // Success path
    vi.mocked(getLegislatorById).mockResolvedValue(makeLegislator())
    const successResp = await server.invokeHandler({ id: 'SMITHJ' })
    expect(successResp.content[0]?.type).toBe('text')
    expect(() => JSON.parse(successResp.content[0]?.text ?? '')).not.toThrow()

    // Error: no valid mode
    const noModeResp = await server.invokeHandler({})
    expect(noModeResp.content[0]?.type).toBe('text')
    expect(() => JSON.parse(noModeResp.content[0]?.text ?? '')).not.toThrow()

    // Error: chamber only
    const chamberResp = await server.invokeHandler({ chamber: 'senate' })
    expect(chamberResp.content[0]?.type).toBe('text')
    expect(() => JSON.parse(chamberResp.content[0]?.text ?? '')).not.toThrow()

    // Error: cache miss
    vi.mocked(getLegislatorsByName).mockResolvedValue([])
    const missResp = await server.invokeHandler({ name: 'Zzznotfound' })
    expect(missResp.content[0]?.type).toBe('text')
    expect(() => JSON.parse(missResp.content[0]?.text ?? '')).not.toThrow()
  })

  // ── Test 10 — toHaveBeenCalledWith on all stubs ───────────────────────────

  it('Test 10 — toHaveBeenCalledWith: all three cache fns are called with correct args in combined mode', async () => {
    const legId = makeLegislator({ id: 'COMBID' })
    const legDist = makeLegislator({ id: 'COMBDIST', district: 5, chamber: 'senate' })
    const legName = makeLegislator({ id: 'COMBNAME', name: 'Combined Name', district: 31 })

    vi.mocked(getLegislatorById).mockResolvedValue(legId)
    vi.mocked(getLegislatorsByDistrict).mockResolvedValue([legDist])
    vi.mocked(getLegislatorsByName).mockResolvedValue([legName])

    await server.invokeHandler({ id: 'COMBID', chamber: 'senate', district: 5, name: 'Combined' })

    expect(getLegislatorById).toHaveBeenCalledWith(expect.anything(), 'COMBID')
    expect(getLegislatorsByDistrict).toHaveBeenCalledWith(expect.anything(), 'senate', 5)
    expect(getLegislatorsByName).toHaveBeenCalledWith(expect.anything(), 'Combined')
  })
})
