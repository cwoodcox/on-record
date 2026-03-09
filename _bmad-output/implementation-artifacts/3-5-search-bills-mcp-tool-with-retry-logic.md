# Story 3.5: `search_bills` MCP Tool with Retry Logic

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to invoke a `search_bills` MCP tool from Claude.ai or ChatGPT,
so that the chatbot can surface specific legislation from my legislator's record grounded in my stated concern.

## Acceptance Criteria

1. **Given** a `legislatorId` and `theme` are provided as tool inputs, **when** the tool executes, **then** it returns structured JSON matching `SearchBillsResult` from `@on-record/types`
2. **Given** matching bills exist in the cache, **when** the tool executes, **then** each bill in `SearchBillsResult.bills` includes: `id`, `title`, `summary`, `status`, `session`, plus `voteResult` and `voteDate` if present — all fields required for citation (FR7, FR19)
3. **Given** any outcome, **when** the tool executes, **then** the response is structured JSON — never prose — with `content[0].type === 'text'`
4. **Given** the tool is registered, **when** Claude.ai or ChatGPT lists available tools, **then** `search_bills` appears with an informative description
5. **Given** more than 5 bills match, **when** the tool executes, **then** the response contains at most 5 bills (FR7: "up to 5 bills per request")
6. **Given** `searchBillsByTheme` throws on first call (transient DB error), **when** the tool executes, **then** it retries at least 2 times with increasing delay — the user sees no error for failures resolved within retry window (FR36)
7. **Given** all retries are exhausted, **when** the tool cannot produce results, **then** it returns `AppError` with `source: 'legislature-api'`, human-readable `nature`, and actionable `action`
8. **Given** no bills match the theme, **when** the tool executes, **then** it returns `SearchBillsResult` with `bills: []` — an empty result is NOT an error
9. `pnpm --filter mcp-server typecheck` exits 0
10. `pnpm --filter mcp-server test` exits 0 (all 175 pre-existing tests pass; new tests added)
11. `pnpm --filter mcp-server lint` exits 0
12. No `console.log` introduced anywhere in `apps/mcp-server/`
13. **Given** the codebase, **when** a developer searches for `better-sqlite3` imports, **then** they only appear inside `apps/mcp-server/src/cache/` (Boundary 4 enforced)

## Tasks / Subtasks

- [x] Task 1: Add `getActiveSessionId()` to `apps/mcp-server/src/cache/bills.ts` (AC: 1)
  - [x] Add `import { getActiveSession } from './sessions.js'` at top with other imports
  - [x] Export `getActiveSessionId(): string` — calls `getActiveSession(db)` using the singleton
  - [x] JSDoc: "Wraps getActiveSession(db) for use from tools/ which cannot import the db singleton (Boundary 4)."
  - [x] Place after all other exported functions, before `writeBills`

- [x] Task 2: Add test for `getActiveSessionId()` in `apps/mcp-server/src/cache/bills.test.ts` (AC: 10)
  - [x] In the `beforeAll` import block, add `getActiveSessionId as GetActiveSessionIdFn` to the import type block
  - [x] Add `let getActiveSessionId: typeof GetActiveSessionIdFn` variable
  - [x] Add `getActiveSessionId = mod.getActiveSessionId` in `beforeAll`
  - [x] Add `describe('getActiveSessionId', ...)` block:
    - [x] `'returns a non-empty string session ID'` — call `getActiveSessionId()`, expect `typeof result === 'string'` and `result.length > 0`
  - [x] Note: the real db singleton uses the on-disk SQLite file. The test only validates the function is callable and returns a string — it does not seed a specific session. The result may vary by date, and that's fine.

- [x] Task 3: Create `apps/mcp-server/src/tools/search-bills.ts` (AC: 1–8, 12, 13)
  - [x] File header comment: boundary note, purpose, dependency note
  - [x] Imports (see Dev Notes for exact list)
  - [x] Export `registerSearchBillsTool(server: McpServer): void`
  - [x] Tool name: `'search_bills'`
  - [x] Tool description: `"Searches bills sponsored by a Utah legislator by issue theme. Returns up to 5 bills from the SQLite cache matching the theme and legislator. Returns structured JSON with bill ID, title, summary, status, vote result, vote date, and session."`
  - [x] Input schema:
    - `legislatorId`: `z.string().min(1).describe('Legislator ID from lookup_legislator output (e.g. "RRabbitt")')`
    - `theme`: `z.string().min(1).describe('Issue theme keyword (e.g. "healthcare", "education", "water", "taxes")')`
  - [x] Handler implementation (see Dev Notes for full code pattern):
    - Wrap `searchBillsByTheme(legislatorId, theme)` in `retryWithDelay(async () => ..., 2, 1000)`
    - On success: slice to 5, build `SearchBillsResult`, JSON.stringify, return
    - On catch: log with `logger.error`, return `AppError` JSON with `source: 'legislature-api'`
    - `SearchBillsResult.session`: always use `getActiveSessionId()`
    - `SearchBillsResult.legislatorId`: pass through from input

- [x] Task 4: Create `apps/mcp-server/src/tools/search-bills.test.ts` (AC: 1–8, 10)
  - [x] Set up mocks (see Dev Notes for full mock list and patterns)
  - [x] Test cases (see Dev Notes for complete test suite):
    - [x] Happy path: returns SearchBillsResult with bills from cache
    - [x] 5-bill limit: 8 matching bills → response has exactly 5
    - [x] Empty result: searchBillsByTheme returns [] → SearchBillsResult with bills: []
    - [x] Structured JSON: content[0].type === 'text', body is valid JSON
    - [x] Session field always present: populated from getActiveSessionId mock
    - [x] Retry: throws on 1st call, succeeds on 2nd → result returned, searchBillsByTheme called twice
    - [x] All retries exhausted: always throws → AppError with source 'legislature-api'
    - [x] AppError fields: nature and action are non-empty strings (specific string values)

- [x] Task 5: Update `apps/mcp-server/src/index.ts` (AC: 4)
  - [x] Add `import { registerSearchBillsTool } from './tools/search-bills.js'` to STEP 2.7
  - [x] Add `registerSearchBillsTool(server) // Story 3.5` immediately after `registerLookupLegislatorTool(server)` call
  - [x] Remove the commented-out `// registerSearchBillsTool(server)    // Story 3.5 (add here when ready)` line

- [x] Task 6: Final verification (AC: 9–13)
  - [x] `pnpm --filter mcp-server typecheck` exits 0
  - [x] `pnpm --filter mcp-server test` exits 0 — confirm 185 tests pass (175 pre-existing + 10 new)
  - [x] `pnpm --filter mcp-server lint` exits 0
  - [x] Confirm no `better-sqlite3` imports outside `apps/mcp-server/src/cache/`
  - [x] Confirm no `console.log` introduced

## Dev Notes

### Scope — What Story 3.5 IS and IS NOT

**In scope:**
- `apps/mcp-server/src/cache/bills.ts` — add `getActiveSessionId()` export
- `apps/mcp-server/src/cache/bills.test.ts` — add `getActiveSessionId()` test
- `apps/mcp-server/src/tools/search-bills.ts` — CREATE NEW: `registerSearchBillsTool`
- `apps/mcp-server/src/tools/search-bills.test.ts` — CREATE NEW: full test coverage
- `apps/mcp-server/src/index.ts` — register `registerSearchBillsTool`

**NOT in scope:**
- `components/BillCard.tsx` / `CitationTag.tsx` — Story 3.6
- `LegislatureDataProvider` interface — no changes (no provider injection needed)
- `searchBillsByTheme` implementation — do NOT modify (it already works correctly with FTS5)
- `packages/types/` — no changes; `SearchBillsResult` already exists and is correct
- Writing fetched bills to the cache — that is the refresh cycle's job, not the tool's

### Architecture Boundaries (ENFORCE STRICTLY)

1. **Boundary 4**: `better-sqlite3` imports ONLY in `apps/mcp-server/src/cache/`. The tool in `tools/search-bills.ts` MUST NOT import `better-sqlite3` or `./db.js`.
2. **No barrel files**: Do not create or modify `tools/index.ts` or `cache/index.ts`.
3. **No `console.log`**: All logging via `logger.error` / `logger.info` from `../lib/logger.js`.
4. **strict: true**: No `any`, no `@ts-ignore`, no non-null assertions except where provably safe.
5. **Import paths use `.js` extensions**: `import { searchBillsByTheme } from '../cache/bills.js'`
6. **`SearchBillsResult` is already defined** in `packages/types/index.ts` — do NOT re-define it.

### Why `getActiveSessionId()` Goes in `bills.ts`

`bills.ts` already imports the `db` singleton (`import { db } from './db.js'`). Functions in `bills.ts` that use `db` directly (e.g. `getBillsBySponsor`, `searchBillsByTheme`) are callable from `tools/` because they encapsulate the db access. `getActiveSessionId()` follows the same pattern — it wraps `getActiveSession(db)` using the existing singleton, keeping the db import within `cache/`.

Do NOT add a separate `db` import to `sessions.ts` — that module is designed to receive `db` as a parameter for testability. The singleton wrapper belongs in `bills.ts`.

### `getActiveSessionId()` Implementation

Add to `apps/mcp-server/src/cache/bills.ts`, after the existing exports and before `writeBills`:

```typescript
// Import at top of file (add to existing imports):
import { getActiveSession } from './sessions.js'

/**
 * Returns the active or most recently completed legislative session ID.
 * Wraps getActiveSession(db) using the db singleton.
 * Callable from tools/ where the db singleton cannot be imported directly (Boundary 4).
 */
export function getActiveSessionId(): string {
  return getActiveSession(db)
}
```

### `search-bills.ts` — Complete Implementation

```typescript
// apps/mcp-server/src/tools/search-bills.ts
// MCP tool: search_bills — searches bills from the SQLite cache by issue theme.
// Reads from cache via searchBillsByTheme (Boundary 4: no better-sqlite3 import here).
// Wraps the cache read in retryWithDelay for resilience against transient DB errors.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError } from '@on-record/types'
import type { SearchBillsResult } from '@on-record/types'
import { searchBillsByTheme, getActiveSessionId } from '../cache/bills.js'
import { retryWithDelay } from '../lib/retry.js'

/**
 * Registers the `search_bills` MCP tool on the given McpServer instance.
 * Call once per McpServer (inside the new-session else branch in index.ts).
 *
 * @param server - McpServer instance to register the tool on
 */
export function registerSearchBillsTool(server: McpServer): void {
  server.tool(
    'search_bills',
    'Searches bills sponsored by a Utah legislator by issue theme. Returns up to 5 bills from the SQLite cache matching the theme and legislator. Returns structured JSON with bill ID, title, summary, status, vote result, vote date, and session.',
    {
      legislatorId: z
        .string()
        .min(1)
        .describe('Legislator ID from lookup_legislator output (e.g. "RRabbitt")'),
      theme: z
        .string()
        .min(1)
        .describe('Issue theme keyword (e.g. "healthcare", "education", "water", "taxes")'),
    },
    async ({ legislatorId, theme }) => {
      let bills: ReturnType<typeof searchBillsByTheme>

      try {
        bills = await retryWithDelay(
          async () => searchBillsByTheme(legislatorId, theme),
          2,    // 2 retries (3 total attempts: 1 initial + 2 retries)
          1000, // 1s delay then 3s delay (FR36: "at least 2 retries with increasing delay")
        )
      } catch {
        logger.error(
          { source: 'legislature-api', legislatorId },
          'search_bills failed after retries',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'legislature-api',
                  'Bill search is temporarily unavailable',
                  'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
                ),
              ),
            },
          ],
        }
      }

      const result: SearchBillsResult = {
        bills: bills.slice(0, 5),
        legislatorId,
        session: getActiveSessionId(),
      }

      logger.info(
        { source: 'mcp-tool', legislatorId, billCount: result.bills.length, theme },
        'search_bills succeeded',
      )

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )
}
```

### `search-bills.test.ts` — Complete Test Suite

```typescript
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
```

### `index.ts` — Changes Required

In the STEP 2.7 import block:
```typescript
// STEP 2.7: MCP tool registrations (Story 2.4, 3.5)
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerSearchBillsTool } from './tools/search-bills.js'
```

In the new-session else branch (replace the commented-out placeholder):
```typescript
registerLookupLegislatorTool(server) // Story 2.4
registerSearchBillsTool(server)      // Story 3.5
```

Remove the line:
```typescript
// registerSearchBillsTool(server)    // Story 3.5 (add here when ready)
```

### Retry Behavior in Detail

`retryWithDelay(fn, 2, 1000)` means:
- Attempt 1 (initial): fn() called immediately
- Attempt 2 (1st retry): after 1000ms (1s delay)
- Attempt 3 (2nd retry): after 3000ms (3× multiplier for subsequent retries)
- Total max window: ~4s + fn execution time (well within "≤10 seconds" FR36 requirement)

The `retryWithDelay` utility does NOT retry by default if `shouldRetry` is not provided — it retries all errors (default `() => true`). This is appropriate here since `searchBillsByTheme` errors are always transient DB errors (FTS5 syntax errors are handled internally by `searchBillsByTheme` and returned as `[]`, not thrown).

**Key nuance for retry tests**: In production, `searchBillsByTheme` catches FTS5 syntax errors internally and returns `[]`. Only genuine DB errors (e.g., `SQLITE_BUSY`) propagate as exceptions. In tests, the mock can be made to throw on demand, proving the retry wiring works correctly.

### `SearchBillsResult.session` — Design Decision

`SearchBillsResult.session` uses `getActiveSessionId()` (not `bills[0]?.session`). Rationale:
- During inter-session, the cache contains bills from 2 sessions (e.g., 2026GS and 2025GS). FTS5 may return bills from either session. Using `bills[0].session` would give an inconsistent/unexpected session.
- `getActiveSessionId()` returns the "current legislative context" — the most recently completed session when inter-session. This is the session the constituent is most likely asking about.
- Each bill already has its own `session` field (e.g., `bill.session = '2025GS'`), which the chatbot can use for per-bill citations. `SearchBillsResult.session` is the overall context, not a per-bill field.

### Test Mock Pattern for `cache/bills.js`

The test mocks the entire `../cache/bills.js` module. This prevents any `better-sqlite3` import from reaching the test environment (Boundary 4 enforcement). The mock provides vi.fn() implementations for `searchBillsByTheme` and `getActiveSessionId`. Both are reset via `vi.resetAllMocks()` in `beforeEach`.

The pattern is identical to how `legislator-lookup.test.ts` mocks `../cache/legislators.js`:
```typescript
vi.mock('../cache/bills.js', () => ({
  searchBillsByTheme: vi.fn(),
  getActiveSessionId: vi.fn(),
}))
```

No `env.js` mock is needed — `search-bills.ts` does not call `getEnv()` (no HTTP calls, no env variables used).

No `fetch` global mock is needed — `search-bills.ts` reads from SQLite cache (mocked), no HTTP.

### Fake Timers — Required for Retry Tests

Use `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach` (same as `legislator-lookup.test.ts`). For retry tests:
```typescript
const promise = server.invokeHandler({ legislatorId: 'RRabbitt', theme: 'healthcare' })
await vi.runAllTimersAsync()  // advances all fake timers (retry delays)
const response = await promise
```

**Critical**: Attach the promise BEFORE calling `vi.runAllTimersAsync()` to avoid `PromiseRejectionHandledWarning`. This is the established pattern from Story 2.4 code review.

### ESLint / TypeScript Enforcement Reminders

- No `console.log` — use `logger.info` / `logger.error` from `'../lib/logger.js'`
- `strict: true` + `exactOptionalPropertyTypes: true` — be precise with optional fields
- Import `.js` extensions: `'../cache/bills.js'`, `'../lib/retry.js'`, `'../lib/logger.js'`
- No barrel file — do NOT create or modify `tools/index.ts`
- `search-bills.ts` must export only: `registerSearchBillsTool`
- `SearchBillsResult` imported from `@on-record/types` — do NOT re-define
- `Bill` type is in `@on-record/types` — import if needed in tests

### `bills.ts` Header Comment Update

The file header comment at the top of `bills.ts` currently lists:
```typescript
// Column-to-type mapping (snake_case DB → camelCase Bill) is confined here only.
```
After adding `getActiveSessionId()`, update the comment to mention the new export is a singleton wrapper for `sessions.ts` functions — something like: "Also exports singleton wrappers for sessions.ts functions (getActiveSessionId) for use from tools/."

### Project Structure Notes

```
apps/mcp-server/src/
  cache/
    bills.ts          — MODIFIED: add getActiveSessionId() export
    bills.test.ts     — MODIFIED: add getActiveSessionId test
  tools/
    search-bills.ts   — CREATED: registerSearchBillsTool
    search-bills.test.ts — CREATED: full test coverage
  index.ts            — MODIFIED: import and register registerSearchBillsTool
```

No changes to `packages/types/` — `SearchBillsResult` and `Bill` are already defined.
No changes to `cache/sessions.ts` — `getActiveSession` remains parameter-injected.
No changes to `cache/bills.ts`'s `searchBillsByTheme` behavior.

### Test Count Impact

Current baseline: 175 tests passing

Additions:
- `bills.test.ts`: +1 (`getActiveSessionId` returns a string)
- `search-bills.test.ts`: +9 (see test cases above)

Expected total: **185 tests** passing after Story 3.5.

### Previous Story Intelligence (Story 3.4)

From Story 3.4 completion and code review:
1. **Pattern: singleton wrapper via bills.ts** — Story 3.4 dev notes explicitly flagged: "Story 3.5 may also call `getActiveSession(db)` or `isInSession(db)` to populate `SearchBillsResult.session`. If called from `tools/`, it would need the db singleton — consider exporting singleton-based wrappers in that story." This is exactly what `getActiveSessionId()` in bills.ts provides.
2. **Fake timer / rejection warning pattern** — Story 3.4 code review confirmed: attach `.rejects` assertion BEFORE `vi.runAllTimersAsync()` (or attach the promise before advancing timers). Applied here in all retry tests.
3. **searchBillsByTheme already searches across ALL sessions** — during inter-session, the cache has bills from 2026GS + 2025GS. `searchBillsByTheme` queries across all cached sessions without filtering by session. The tool does NOT need to apply any session filter.
4. **Test isolation**: tests mock `../cache/bills.js` fully — `vi.resetAllMocks()` in `beforeEach` ensures no state bleeds between tests.
5. **Error-path tests**: assert specific `nature` and `action` string values — not just `typeof result.nature === 'string'`.

### Git Intelligence (Recent Commits)

Recent commits all address Story 3.4:
- `fix(story-3.4): address code review findings — timezone bugs and redundant queries`
- `feat(story-3.4): implement inter-session bill handling with SQLite-backed session detection`

Established patterns to follow:
- File header comments with boundary/purpose notes
- JSDoc on all exported functions
- `retryWithDelay` from `'../lib/retry.js'` (Story 1.4 — already proven pattern used in `gis.ts`)
- Tool handler returns `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`
- Logger context object always has `source` field as first key

### References

- [Source: apps/mcp-server/src/tools/legislator-lookup.ts] — Reference implementation for MCP tool structure: handler pattern, logger.info/error usage, AppError return, `content[0].type = 'text'` JSON pattern
- [Source: apps/mcp-server/src/tools/legislator-lookup.test.ts] — Reference for mock pattern, createMockServer helper, fake timer usage, retry test pattern
- [Source: apps/mcp-server/src/cache/bills.ts] — `searchBillsByTheme` and `getBillsBySponsor` — the db singleton is already imported; `getActiveSessionId()` follows same pattern
- [Source: apps/mcp-server/src/cache/sessions.ts] — `getActiveSession(db, now?)` — what `getActiveSessionId()` wraps
- [Source: apps/mcp-server/src/lib/retry.ts] — `retryWithDelay` signature: `(fn, attempts, delayMs, shouldRetry?) => Promise<T>`
- [Source: apps/mcp-server/src/index.ts#line 111–112] — Where `registerLookupLegislatorTool(server)` is called and commented stub for this story
- [Source: packages/types/index.ts#lines 80–84] — `SearchBillsResult` interface — `{ bills: Bill[], legislatorId: string, session: string }`
- [Source: packages/types/index.ts#lines 19–29] — `Bill` interface — `{ id, session, title, summary, status, sponsorId, voteResult?, voteDate? }`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5] — FR7 "up to 5 bills per request", FR26 "invokable from Claude.ai + ChatGPT", FR36 "retry at least 2 times"
- [Source: _bmad-output/implementation-artifacts/3-4-inter-session-bill-handling.md#Story 3.5 Dependency Note] — "search_bills applies the 5-bill limit; consider exporting singleton-based wrappers for getActiveSession"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded cleanly with no blocking issues.

### Completion Notes List

- Implemented `getActiveSessionId()` in `bills.ts` following the singleton wrapper pattern established in Story 3.4 dev notes. Imported `getActiveSession` from `./sessions.js` and wrapped it with the existing `db` singleton — keeping all direct `db` access inside `cache/`.
- Created `search-bills.ts` with `registerSearchBillsTool(server)`: wraps `searchBillsByTheme` in `retryWithDelay(fn, 2, 1000)` (3 total attempts), slices results to 5, builds `SearchBillsResult`, returns structured JSON. On all-retries-exhausted, logs via `logger.error` and returns `AppError` with `source: 'legislature-api'`.
- Created `search-bills.test.ts` with 9 tests covering all ACs: happy path, 5-bill limit, empty result, structured JSON, session field, transient retry, all-retries-exhausted AppError, and logging (info + error paths). Used `vi.useFakeTimers()` + `vi.runAllTimersAsync()` pattern with promise attached before timer advancement (no `PromiseRejectionHandledWarning`).
- Updated `index.ts` to import and register `registerSearchBillsTool` in the new-session branch, removing the commented-out placeholder stub.
- All boundary constraints verified: `better-sqlite3` appears only in `cache/` (comments only in `tools/`), no `console.log` introduced, no barrel files created/modified.
- Final test count: **185 tests passing** (175 pre-existing + 1 `getActiveSessionId` + 9 `search-bills`).

### File List

- `apps/mcp-server/src/cache/bills.ts` — modified: added `getActiveSessionId()` export and `getActiveSession` import
- `apps/mcp-server/src/cache/bills.test.ts` — modified: added `getActiveSessionId` test
- `apps/mcp-server/src/tools/search-bills.ts` — created: `registerSearchBillsTool`
- `apps/mcp-server/src/tools/search-bills.test.ts` — created: full test suite (9 tests)
- `apps/mcp-server/src/index.ts` — modified: import + register `registerSearchBillsTool`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified: story status in-progress → review

## Change Log

- Implemented Story 3.5: `search_bills` MCP tool with retry logic — new tool file, new tests, `getActiveSessionId()` singleton wrapper in `bills.ts`, and `index.ts` registration (Date: 2026-03-08)
