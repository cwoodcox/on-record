# Story 3.7: `search_bills` Interface Redesign

Status: ready-for-dev

## Story

As a **developer**,
I want to replace the rigid `search_bills` tool interface (required `legislatorId` + `theme`) with an all-optional filter model,
so that the chatbot can search across all cached bills, not only by a specific sponsor.

## Acceptance Criteria

1. **Given** the updated `search_bills` tool is connected to a chatbot, **when** it is called with no parameters, **then** it returns the first page of all cached bills (up to the default page size of 50)
2. **Given** only `sponsorId` is provided, **when** the tool executes, **then** it returns all bills with that `sponsor_id` in the cache (paginated), in session-descending, bill-ID-ascending order
3. **Given** only `query` is provided, **when** the tool executes, **then** it runs an FTS5 full-text search on bill title and summary and returns matches ordered by BM25 relevance
4. **Given** both `query` and `sponsorId` are provided, **when** the tool executes, **then** results are restricted to FTS5 matches that also have the given `sponsor_id`
5. **Given** `billId` is provided (e.g., `"HB88"` or `"HB0088"` or `"HB088"`), **when** the tool executes, **then** it parses the prefix (letters) and numeric value (integer) from the input and matches against bills where the stored prefix equals the parsed prefix AND the stored numeric suffix equals the same integer — zero-padding is not assumed to be a fixed digit count; other filters still apply
6. **Given** `session` is provided, **when** the tool executes, **then** results are restricted to bills with that session value
7. **Given** `floorSponsorId` is provided, **when** the tool executes, **then** results are restricted to bills where `floor_sponsor_id` equals the given value — the Utah Legislature API provides `floorSponsor` on bill details (verified: HB0050 returns `"floorSponsor": "HARPEWA"`); it is optional (not all bills have a floor sponsor)
8. **Given** `chamber: 'house'` is provided, **when** the tool executes, **then** results are restricted to bills whose `id` starts with `'H'`; `chamber: 'senate'` restricts to `id` starting with `'S'`
9. **Given** `count` and `offset` are provided, **when** the tool executes, **then** the response contains at most `count` bills starting at `offset`; `count` defaults to 50, max 100
10. **Given** any outcome, **when** the tool executes, **then** the response is structured JSON — never prose — with `content[0].type === 'text'`
11. **Given** transient DB error on first call, **when** the tool executes, **then** it retries at least 2 times with increasing delay — the user sees no error for failures resolved within the retry window
12. **Given** all retries exhausted, **when** the tool returns an error, **then** `AppError.nature` contains `'Bill search is temporarily unavailable'` and `AppError.action` contains `'Try again in a few seconds'`
13. **Given** no bills match the provided filters, **when** the tool executes, **then** it returns `SearchBillsResult` with `bills: []` and `total: 0` — an empty result is NOT an error
14. **Given** the updated `SearchBillsResult` type, **when** the caller inspects the result, **then** it contains: `bills: Bill[]`, `total: number`, `count: number`, `offset: number` — `legislatorId` and `session` fields are removed
15. **Given** the updated `Bill` type, **when** the caller inspects it, **then** it includes `floorSponsorId?: string` — populated from the API's `floorSponsor` field when present, `undefined` when the bill has no floor sponsor
16. **Given** the updated `SearchBillsParams` type, **when** the caller inspects it, **then** all params are optional: `query?`, `billId?`, `sponsorId?`, `floorSponsorId?`, `session?`, `chamber?`, `count?`, `offset?`
17. `pnpm --filter mcp-server typecheck` exits 0
18. `pnpm --filter mcp-server test` exits 0 (all pre-existing tests pass; new tests added for `searchBills` and `parseBillId`)
19. `pnpm --filter mcp-server lint` exits 0
20. No `console.log` introduced anywhere in `apps/mcp-server/`
21. **Given** the codebase, **when** a developer searches for `better-sqlite3` imports, **then** they only appear inside `apps/mcp-server/src/cache/` (Boundary 4 enforced)

## Tasks / Subtasks

- [ ] Task 1: Update `packages/types/index.ts` — `Bill`, `SearchBillsParams`, new `SearchBillsResult` (AC: 14–16)
  - [ ] Add `floorSponsorId?: string` to the `Bill` interface (after `sponsorId`)
  - [ ] Add `SearchBillsParams` interface (all fields optional, see Dev Notes for exact shape)
  - [ ] Replace `SearchBillsResult` fields: remove `legislatorId: string` and `session: string`; add `total: number`, `count: number`, `offset: number`
  - [ ] Update the "DO NOT rename" comment to reflect the updated fields
  - [ ] Export `SearchBillsParams` from the package

- [ ] Task 2: Capture `floorSponsor` in the provider + schema migration (AC: 7, 15)
  - [ ] `apps/mcp-server/src/providers/utah-legislature.ts`: add `floorSponsor: z.string().optional()` to `apiBillDetailSchema`
  - [ ] `getBillDetail`: include `floorSponsorId: parsed.data.floorSponsor` in the returned `BillDetail` object (omit key if undefined — use `...(parsed.data.floorSponsor !== undefined && { floorSponsorId: parsed.data.floorSponsor })`)
  - [ ] `getBillsBySession` bill-building block: include `...(detail.floorSponsorId !== undefined && { floorSponsorId: detail.floorSponsorId })` alongside the existing `voteResult`/`voteDate` pattern
  - [ ] `apps/mcp-server/src/cache/schema.ts`: add `ALTER TABLE bills ADD COLUMN floor_sponsor_id TEXT` migration (run only when column is absent — check via `pragma table_info` before executing, same pattern as the existing PK migration guard)
  - [ ] `apps/mcp-server/src/cache/bills.ts` — `BillRow` interface: add `floor_sponsor_id: string | null`
  - [ ] `rowToBill`: map `floor_sponsor_id` → `bill.floorSponsorId` (same null-to-undefined pattern as `voteResult`/`voteDate`)
  - [ ] `writeBills`: add `floor_sponsor_id` column to INSERT statement; pass `bill.floorSponsorId ?? null`
  - [ ] `apps/mcp-server/src/providers/utah-legislature.test.ts`: add `floorSponsor: 'HARPEWA'` to `mockBillDetailResponse`; add test asserting `floorSponsorId: 'HARPEWA'` in the returned bill

- [ ] Task 3: Update `apps/mcp-server/src/cache/bills.ts` — add `searchBills`, keep `searchBillsByTheme` as deprecated (AC: 1–9, 13)
  - [ ] Add `parseBillId(raw: string): { prefix: string; num: number } | null` (internal helper, not exported)
    - Regex: `/^([A-Za-z]+)(\d+)$/` — extract letters prefix + numeric value as integer
    - Returns `null` for unrecognized format (no letters-then-digits structure)
    - See Dev Notes for exact SQL WHERE clause to use the parsed result
  - [ ] Add `export function searchBills(params: SearchBillsParams): SearchBillsResult`
    - Destructure `{ query, billId, sponsorId, floorSponsorId, session, chamber, count = 50, offset = 0 }` from params
    - Clamp `limit = Math.min(count, 100)`
    - Build WHERE conditions array and args array dynamically (see Dev Notes for exact SQL patterns)
    - `floorSponsorId` filter: `conditions.push('floor_sponsor_id = ?'); conditionArgs.push(floorSponsorId)` — column exists after Task 2 migration
    - Execute two queries: count query + page query (see Dev Notes)
    - Return `{ bills, total, count: bills.length, offset }`
    - Empty-MATCH guard: if `query` is provided but normalizes to `''`, skip FTS5 and treat as no-query path
  - [ ] Mark `searchBillsByTheme` as `@deprecated` with JSDoc: "Use searchBills({ query, sponsorId }) instead. Retained for test compatibility only — do not add new callers."
  - [ ] Remove `THEME_QUERIES` map — delete the entire constant. `searchBills` uses the raw FTS5 query directly (no expansion map)

- [ ] Task 4: Rewrite `apps/mcp-server/src/tools/search-bills.ts` (AC: 1–13, 20, 21)
  - [ ] Update imports: replace `searchBillsByTheme, getActiveSessionId` with `searchBills`; remove `getActiveSessionId` import
  - [ ] New zod input schema (all optional — see Dev Notes for exact `.describe()` text)
  - [ ] Handler: call `searchBills(params)` inside `retryWithDelay(..., 2, 1000)` — same retry config as before
  - [ ] On success: return `JSON.stringify(result)` — no slicing (pagination handles size now)
  - [ ] On success: log `{ source: 'mcp-tool', billCount: result.count, filters: loggableSummary }` where `loggableSummary` omits PII (no addresses, just the filter keys that were provided)
  - [ ] On catch: `logger.error({ source: 'legislature-api' }, 'search_bills failed after retries')`; return AppError JSON
  - [ ] AppError: `nature: 'Bill search is temporarily unavailable'`, `action: 'Try again in a few seconds. If the problem persists, the service may be temporarily down.'`
  - [ ] Update tool description (see Dev Notes — must not enumerate categories or list values)

- [ ] Task 5: Rewrite `apps/mcp-server/src/tools/search-bills.test.ts` (AC: 1–13, 18)
  - [ ] Update mock: `vi.mock('../cache/bills.js', () => ({ searchBills: vi.fn() }))` — remove `searchBillsByTheme` and `getActiveSessionId` mocks
  - [ ] Update `ToolHandler` type and `createMockServer` for new all-optional schema
  - [ ] Test cases (see Dev Notes for full list)

- [ ] Task 6: Update `apps/mcp-server/src/cache/bills.test.ts` — add `searchBills` + `parseBillId` tests (AC: 18)
  - [ ] Import `searchBills` from the module (same dynamic import pattern used by the file)
  - [ ] Add `describe('parseBillId (via searchBills)', ...)` — since `parseBillId` is not exported, test it indirectly via `searchBills({ billId })` against an in-memory DB
  - [ ] Add `describe('searchBills', ...)` using real in-memory SQLite (same pattern as existing bills.test.ts describe blocks):
    - No params: returns all bills (paginated)
    - `sponsorId` filter: returns only matching bills
    - `floorSponsorId` filter: returns only bills with matching `floor_sponsor_id` (write a bill with `floorSponsorId: 'HARPEWA'`, verify filter works)
    - `session` filter: returns only matching session
    - `chamber: 'house'`: returns only HB/HR/HJR/HCR bills
    - `chamber: 'senate'`: returns only SB/SR/SJR/SCR bills
    - `query` filter: FTS5 hits (write bills with matching titles, verify match)
    - `billId` normalization: `"HB88"` matches `"HB0088"` in DB
    - `count` + `offset` pagination: writes 5 bills, requests page 2 of size 2, gets bills 3–4
    - `total` field: matches actual count of matching rows, not just page size
    - Empty query guard: `query: ''` returns results (does not throw SQLite syntax error)

- [ ] Task 7: Check web app impact — `apps/web/src/` (AC: 14)
  - [ ] Search for any import or use of `SearchBillsResult.legislatorId` or `SearchBillsResult.session` in `apps/web/src/`
  - [ ] Confirm: as of this story, no web component uses these removed fields (verified in pre-story analysis — the web app uses `Bill` directly, not `SearchBillsResult.legislatorId`)
  - [ ] If any usages are found, update them — they should be removable given the platform pivot to ChatGPT App

- [ ] Task 8: Update `system-prompt/agent-instructions.md` — tool description + result shape (AC: 14)
  - [ ] Update any reference to `search_bills` input schema (remove `legislatorId`, `theme` as required fields)
  - [ ] Update any reference to `SearchBillsResult` fields (remove `legislatorId`, `session`; add `total`, `count`, `offset`)
  - [ ] NOTE: This is a minimal update. The full system prompt rewrite is Story 4-X (new system prompt). Only update the tool schema references here.

- [ ] Task 9: Final verification (AC: 17–21)
  - [ ] `pnpm --filter mcp-server typecheck` exits 0
  - [ ] `pnpm --filter mcp-server test` exits 0
  - [ ] `pnpm --filter mcp-server lint` exits 0
  - [ ] `pnpm typecheck` (workspace-wide) exits 0 — confirms packages/types consumers compile
  - [ ] Confirm no `better-sqlite3` imports outside `apps/mcp-server/src/cache/`
  - [ ] Confirm no `console.log` introduced

## Dev Notes

### Context — Why This Redesign

The original `search_bills` required `legislatorId + theme` as mandatory inputs, enforcing a "constituent writing to their own legislator about that legislator's bill" flow. The modal real-world use case is different: "oppose Rep Lee's HB88 — it's terrible, you should vote no." The constituent's target legislator didn't sponsor HB88. The old interface makes this impossible.

The new interface makes all filters optional and composable. Any combination narrows results. The `THEME_QUERIES` expansion map (hardcoded synonym table) is removed — the LLM can infer relevant terms from context; FTS5 accepts arbitrary terms directly.

[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#4.2`]

---

### SearchBillsParams — Exact Type Shape

```typescript
// In packages/types/index.ts

export interface SearchBillsParams {
  query?: string           // freeform FTS5 full-text search on bill title + summary
  billId?: string          // bill ID match — normalized to 4-digit-padded form before lookup
                           // "HB88" → "HB0088"; combine with chamber when chamber is known
  sponsorId?: string       // filter to bills with this sponsor_id
  floorSponsorId?: string  // filter to bills where floor_sponsor_id = this value; column added in Task 2 migration
  session?: string         // filter to a specific session (e.g. "2026GS")
  chamber?: 'house' | 'senate'  // 'house' → id LIKE 'H%'; 'senate' → id LIKE 'S%'
  count?: number           // page size; default 50, max 100
  offset?: number          // pagination offset; default 0
}
```

---

### SearchBillsResult — New Shape

```typescript
// In packages/types/index.ts — replaces the old shape

export interface SearchBillsResult {
  bills: Bill[]    // page of results
  total: number    // total matching records (for pagination)
  offset: number   // offset used for this page
  count: number    // number of bills returned in this page (= bills.length)
}
```

The removed fields `legislatorId` and `session` are confirmed unused in `apps/web/` (BillCard uses `Bill.session`, not `SearchBillsResult.session`). [Source: `apps/web/src/components/BillCard.tsx:75`]

---

### SQL Implementation in `searchBills`

**Path A — `query` provided (FTS5):**

```typescript
const whereClause = ftsConditions.join(' AND ')
const countSql = `
  SELECT COUNT(*) as total
  FROM bill_fts
  JOIN bills b ON b.rowid = bill_fts.rowid
  WHERE bill_fts MATCH ?
  ${nonFtsConditions.length > 0 ? 'AND ' + nonFtsConditions.join(' AND ') : ''}
`
const pageSql = `
  SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.vote_result, b.vote_date
  FROM bill_fts
  JOIN bills b ON b.rowid = bill_fts.rowid
  WHERE bill_fts MATCH ?
  ${nonFtsConditions.length > 0 ? 'AND ' + nonFtsConditions.join(' AND ') : ''}
  ORDER BY bill_fts.rank
  LIMIT ? OFFSET ?
`
// args for count: [ftsQuery, ...nonFtsArgs]
// args for page:  [ftsQuery, ...nonFtsArgs, limit, offset]
```

**Path B — no `query` (direct table scan):**

```typescript
const countSql = `
  SELECT COUNT(*) as total FROM bills
  ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
`
const pageSql = `
  SELECT id, session, title, summary, status, sponsor_id, vote_result, vote_date
  FROM bills
  ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
  ORDER BY session DESC, id ASC
  LIMIT ? OFFSET ?
`
// args for count: [...conditionArgs]
// args for page:  [...conditionArgs, limit, offset]
```

**WHERE condition building pattern:**

```typescript
const conditions: string[] = []
const conditionArgs: unknown[] = []

if (normalizedBillId) {
  conditions.push('id = ?')    // 'b.id = ?' in FTS JOIN path
  conditionArgs.push(normalizedBillId)
}
if (sponsorId) {
  conditions.push('sponsor_id = ?')    // 'b.sponsor_id = ?' in FTS JOIN path
  conditionArgs.push(sponsorId)
}
if (session) {
  conditions.push('session = ?')    // 'b.session = ?' in FTS JOIN path
  conditionArgs.push(session)
}
if (chamber === 'house') {
  conditions.push("id LIKE 'H%'")    // literal — no user input; safe SQL
}
if (chamber === 'senate') {
  conditions.push("id LIKE 'S%'")
}
// floorSponsorId: skipped intentionally — no column exists
```

**`COUNT(*)` result:**

```typescript
const countRow = db.prepare<unknown[], { total: number }>(countSql).get(...countArgs)
const total = countRow?.total ?? 0
```

**FTS5 empty-query guard** (inherited from `searchBillsByTheme`):

```typescript
const normalized = (query ?? '').trim()
if (normalized === '') {
  // fall through to Path B (table scan) even if query was provided but empty
}
```

**Sorting for Path B:** `ORDER BY session DESC, id ASC` — most recent session first, then bill number ascending.

[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#4.2`, `apps/mcp-server/src/cache/bills.ts:131-155` (FTS5 JOIN pattern)]

---

### `parseBillId` Implementation

The cache stores bill IDs verbatim from the Utah Legislature API (e.g., `"HB0001"`, `"SB0042"`). The API returns `z.string()` with no guaranteed digit count — zero-padding may vary by session. Therefore, **do not normalize to a fixed digit width**. Instead, parse the prefix and numeric value and use a SQL comparison on the integer:

```typescript
// Internal to bills.ts — not exported
function parseBillId(raw: string): { prefix: string; num: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(raw.trim())
  if (!match) return null
  return {
    prefix: match[1]!.toUpperCase(),
    num: parseInt(match[2]!, 10),
  }
}
```

**SQL usage for `billId` filter:**

```typescript
const parsed = parseBillId(billId)
if (parsed) {
  conditions.push('SUBSTR(id, 1, ?) = ? AND CAST(SUBSTR(id, ? + 1) AS INTEGER) = ?')
  conditionArgs.push(parsed.prefix.length, parsed.prefix, parsed.prefix.length, parsed.num)
} else {
  // Unrecognized format — fall back to exact string match; will likely miss
  conditions.push('id = ?')
  conditionArgs.push(billId.trim())
}
```

This correctly matches `"HB88"`, `"HB088"`, `"HB0088"`, `"HB00088"` against any stored form.

Edge cases:
- `"HB88"` → prefix `"HB"`, num `88` → matches `"HB0088"` in DB ✓
- `"HB0088"` → prefix `"HB"`, num `88` → same match ✓
- `"hb88"` → prefix `"HB"`, num `88` (case-normalized) ✓
- `"HJR01"` → prefix `"HJR"`, num `1` → matches `"HJR0001"` ✓
- `"HB"` → no digits → `parseBillId` returns `null`, falls back to exact match ✓
- `"totally wrong"` → `null`, exact match fallback (will miss in DB) ✓

**Task 2 subtask update:** rename internal helper from `normalizeBillId` to `parseBillId`; update bills.test.ts describe block name accordingly (`describe('parseBillId', ...)`).

**AC16 update:** "new tests added for `searchBills` and `parseBillId`" — replace `normalizeBillId` references in tests with `parseBillId`.

---

### Tool Description (updated)

```
'Searches the Utah Legislature bill cache. All parameters are optional — omitting all returns all cached bills. Filters compose: providing sponsorId + session returns that legislator\'s bills from that session. Useful for: (1) loading all bills by a known sponsor, (2) finding a specific bill by number, (3) full-text searching across all bills by topic. Returns paginated results with total count.'
```

**Critical:** Do NOT enumerate valid values for `chamber` or `session` in the tool description. Do not say "e.g., healthcare, education, taxes" for `query`. The LLM should derive filters from context, not a menu. [Source: CLAUDE.md#Architectural Rules — LLM tool descriptions]

---

### New zod Input Schema

```typescript
{
  query: z.string().optional().describe(
    'Freeform search term derived from the constituent\'s stated concern — passed directly to FTS5. Do not present this as a menu; infer from conversation context.'
  ),
  billId: z.string().optional().describe(
    'Bill number to look up (e.g. "HB88" or "HB0088") — zero-padding is normalized automatically'
  ),
  sponsorId: z.string().optional().describe(
    'Legislator ID from lookup_legislator output — restricts results to bills this legislator sponsored'
  ),
  floorSponsorId: z.string().optional().describe(
    'Floor sponsor legislator ID — restricts results to bills floor-sponsored by this legislator'
  ),
  session: z.string().optional().describe(
    'Legislative session identifier (e.g. "2026GS") — restricts results to one session'
  ),
  chamber: z.enum(['house', 'senate']).optional().describe(
    'Legislative chamber — narrows to house or senate bills'
  ),
  count: z.number().int().min(1).max(100).optional().describe(
    'Page size (default 50, max 100)'
  ),
  offset: z.number().int().min(0).optional().describe(
    'Pagination offset (default 0)'
  ),
}
```

---

### Tool Test Cases (search-bills.test.ts)

All tests use the `createMockServer` + `invokeHandler` pattern from the existing file. Mock `searchBills` from `../cache/bills.js`.

```typescript
vi.mock('../cache/bills.js', () => ({ searchBills: vi.fn() }))
```

`ToolHandler` type changes to accept `Partial<SearchBillsParams>` (all optional):

```typescript
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>
}>
```

Test cases (map to ACs):
- **AC#1 (no params → SearchBillsResult):** `searchBills` mocked to return `{ bills: [bill], total: 1, count: 1, offset: 0 }`; invoke with `{}`; result has `bills.length === 1`, `total === 1`; `toHaveBeenCalledWith({})` (or the resolved defaults — check what the handler passes)
- **AC#8 (empty result not error):** `searchBills` returns `{ bills: [], total: 0, count: 0, offset: 0 }`; result has `bills: []` and `total === 0`; no `source` field
- **AC#9 (structured JSON):** `content[0].type === 'text'`, body is valid JSON
- **AC#10 (retry):** `searchBills` throws on 1st call, resolves on 2nd → called twice, result has bills
- **AC#11 (all retries exhausted → AppError):** always throws → `result.source === 'legislature-api'`; `result.nature` contains `'Bill search is temporarily unavailable'`; `result.action` contains `'Try again in a few seconds'`
- **AC#11 key phrases (toContain):** Use `expect(result.nature).toContain('Bill search is temporarily unavailable')` and `expect(result.action).toContain('Try again in a few seconds')` — not exact match
- **Logging on success:** `logger.info` called with `{ source: 'mcp-tool' }` and the 'search_bills succeeded' message
- **Logging on failure:** `logger.error` called with `{ source: 'legislature-api' }` and 'search_bills failed after retries'

**Note:** `getActiveSessionId` is no longer mocked or imported — the handler no longer calls it. If any leftover `getActiveSessionId` mock import exists, remove it.

---

### `floorSponsorId` — Deferred Implementation Note

The `bills` table has no `floor_sponsor_id` column. The `SearchBillsParams` type includes `floorSponsorId?: string` for interface stability (callers can pass it without error), but the `searchBills` function must silently ignore it in SQL and log a warning when provided.

When the column is later added (separate story), the SQL condition can be activated. This is NOT a blocker for this story.

[Source: `apps/mcp-server/src/cache/schema.ts:50-65` (bills table DDL — no floor_sponsor_id column)]

---

### `floorSponsorId` — API Field and Schema Migration

**API field:** `floorSponsor` (string, optional) — confirmed present on cross-chamber bills. Verified: `GET /bills/2026GS/HB0050/{key}` returns `"floorSponsor": "HARPEWA"`. Not all bills have a floor sponsor (e.g., a Senate bill that never crosses to the House); treat as optional throughout.

**Schema migration pattern** (in `schema.ts`, inside `initializeSchema`):

```typescript
// Add floor_sponsor_id column if absent — backward-compatible (nullable, no default needed)
const billsCols = db.pragma('table_info(bills)') as Array<{ name: string }>
if (!billsCols.some((c) => c.name === 'floor_sponsor_id')) {
  db.exec('ALTER TABLE bills ADD COLUMN floor_sponsor_id TEXT')
}
```

Place this after the existing PK migration guard, before the `db.transaction(...)` block.

**`writeBills` INSERT statement** — add `floor_sponsor_id` to the column list and parameter list:

```sql
INSERT OR REPLACE INTO bills
  (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, cached_at)
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Pass `bill.floorSponsorId ?? null` as the 7th parameter.

**`utah-legislature.ts` test fixture update:** add `floorSponsor: 'HARPEWA'` to `mockBillDetailResponse` and assert `result.floorSponsorId === 'HARPEWA'` in the existing "returns fully-hydrated Bill[]" test. Add a second test: "omits floorSponsorId when detail response lacks floorSponsor" — use a fixture without the field and confirm `result.floorSponsorId` is `undefined`.

[Source: live API response — `curl https://glen.le.utah.gov/bills/2026GS/HB0050/{key}`, 2026-03-30]

---

### Boundary 4 Compliance

`better-sqlite3` imports confined to `apps/mcp-server/src/cache/` only. The tool (`tools/search-bills.ts`) calls `searchBills` from `../cache/bills.js` — never imports `db` or `better-sqlite3` directly. This boundary is ESLint-enforced. [Source: CLAUDE.md#Architectural Rules]

---

### Retry and Error Pattern

Retry config unchanged from Story 3.5: `retryWithDelay(async () => searchBills(params), 2, 1000)` — 1 initial attempt + 2 retries, 1s delay then 3s. AppError `source: 'legislature-api'` — the cache is the legislature data layer from the tool's perspective. [Source: `apps/mcp-server/src/tools/search-bills.ts:35-38`]

---

### Testing Standards

- Error-path tests: `toContain('key phrase')` on `nature`/`action` fields (not type-only checks, not exact string match) [Source: CLAUDE.md#Testing]
- `mockReturnValue` tests: always add `toHaveBeenCalledWith` to verify correct args [Source: CLAUDE.md#Testing]
- Vitest rejection tests: attach `.rejects` BEFORE `vi.runAllTimersAsync()` [Source: CLAUDE.md#Testing]
- `searchBills` cache tests: use real in-memory SQLite (same pattern as `bills.test.ts` existing describe blocks) [Source: CLAUDE.md#Testing — "Tests mock at LegislatureDataProvider boundary, never touch SQLite directly" applies to tool-layer tests; cache-layer tests use in-memory DB]

---

### Project Structure Notes

Files to create or modify:

| File | Action |
|---|---|
| `packages/types/index.ts` | MODIFY — add `floorSponsorId?` to `Bill`, add `SearchBillsParams`, rewrite `SearchBillsResult` |
| `apps/mcp-server/src/cache/schema.ts` | MODIFY — add `floor_sponsor_id` column migration |
| `apps/mcp-server/src/cache/bills.ts` | MODIFY — add `searchBills`, add `parseBillId`, add `floor_sponsor_id` to `BillRow`/`rowToBill`/`writeBills`, remove `THEME_QUERIES`, deprecate `searchBillsByTheme` |
| `apps/mcp-server/src/cache/bills.test.ts` | MODIFY — add `searchBills` + `parseBillId` tests |
| `apps/mcp-server/src/providers/utah-legislature.ts` | MODIFY — add `floorSponsor` to schema; wire through `getBillDetail` + `getBillsBySession` |
| `apps/mcp-server/src/providers/utah-legislature.test.ts` | MODIFY — add `floorSponsor` to fixtures; add floor sponsor passthrough tests |
| `apps/mcp-server/src/tools/search-bills.ts` | MODIFY — new schema, new handler |
| `apps/mcp-server/src/tools/search-bills.test.ts` | MODIFY (full rewrite of mock setup and test cases) |
| `system-prompt/agent-instructions.md` | MODIFY — update tool schema references only (minimal) |
| `apps/web/src/` | CHECK ONLY — confirm no `SearchBillsResult.legislatorId`/`.session` usages |

Do NOT modify:
- `apps/mcp-server/src/index.ts` — tool registration unchanged; `registerSearchBillsTool` still registered the same way
- `apps/mcp-server/src/cache/refresh.ts` — bill write path unchanged (calls `writeBills` which is updated in this story)
- `apps/web/src/components/BillCard.tsx` — uses `Bill.session`, not `SearchBillsResult.session`; no change needed

---

### References

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#Section 4.2`] — canonical spec for new interface
- [Source: `apps/mcp-server/src/cache/bills.ts`] — existing `searchBillsByTheme`, `THEME_QUERIES`, `rowToBill`, FTS5 JOIN pattern
- [Source: `apps/mcp-server/src/tools/search-bills.ts`] — existing tool handler, retry config, AppError pattern
- [Source: `apps/mcp-server/src/tools/search-bills.test.ts`] — existing test patterns (mock setup, `createMockServer`, timer handling)
- [Source: `packages/types/index.ts`] — current `SearchBillsResult`, `Bill`, `AppError` shapes
- [Source: `apps/mcp-server/src/cache/schema.ts:50-65`] — bills table DDL (confirms no `floor_sponsor_id` column)
- [Source: CLAUDE.md#Architectural Rules] — `console.log` ban, no barrel files, Boundary 4, LLM tool description rules
- [Source: CLAUDE.md#Testing] — `toContain` key phrase convention, `mockReturnValue` + `toHaveBeenCalledWith`, rejection test ordering

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
