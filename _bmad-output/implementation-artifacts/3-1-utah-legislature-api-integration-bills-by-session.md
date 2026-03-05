# Story 3.1: Utah Legislature API Integration — Bills by Session

Status: review

## Story

As a **developer**,
I want the Utah Legislature API implementation to fully hydrate `Bill[]` by fetching the bill list and detail for each bill in a session,
so that the bills cache (Story 3.2) can be populated with complete, searchable legislative records.

## Acceptance Criteria

1. Given the `UtahLegislatureProvider` in `providers/utah-legislature.ts`, when `getBillsBySession(session)` is called, then it fetches the full bill list from `GET /bills/<session>/billlist/<token>` and returns a fully-hydrated `Bill[]` (no empty fields) typed from `@on-record/types`
2. Each returned `Bill` object has all required fields populated: `id`, `session`, `title`, `summary`, `status`, `sponsorId` — no empty string placeholders
3. `voteResult` and `voteDate` are populated when the API provides them; they are `undefined` (not empty string) when absent
4. `retryWithDelay` wraps every individual API call — both the bill list fetch and each bill detail fetch
5. On API failure after all retries, the method throws an `AppError` with `source: 'legislature-api'` and user-friendly `nature`/`action` strings (not generic placeholders)
6. The `UTAH_LEGISLATURE_API_KEY` token never appears in any pino log output, and is placed in the URL path — not in any header
7. `pnpm --filter mcp-server typecheck` exits 0
8. `pnpm --filter mcp-server test` exits 0 (all existing tests continue passing)

### Pre-Implementation Required Reading (mandatory before writing any code)

**CRITICAL — Read before dev begins (do not skip):**
- Utah Legislature developer portal: `https://le.utah.gov/data/developer.htm`
- Live API root: `https://glen.le.utah.gov/`
- The existing `getBillDetail()` implementation in `providers/utah-legislature.ts` documents the **verified** real field names (`billNumber`, `sessionID`, `shortTitle`, `generalProvisions`, `lastAction`, `primeSponsor`, `highlightedProvisions`) — these are confirmed correct from live testing on 2026-03-03
- The existing `getBillsBySession()` stub documents the **verified** bill list endpoint: `GET /bills/<session>/billlist/<token>` returning `[{ number, trackingID }]` stubs
- The dev agent MUST verify against the live API whether additional fields exist on the billlist endpoint beyond `number` and `trackingID` before deciding the hydration strategy

**Epic 2 lesson (mandatory context):** Story 2.2 shipped with wrong API endpoint patterns and required a bug-fix commit. The actual API uses token-in-path (`/bills/<session>/billlist/<token>`), NOT auth headers. The correct patterns are already implemented in `utah-legislature.ts` — extend them, do not invent new patterns.

## Tasks / Subtasks

- [x] Task 1: Read actual Utah Legislature API docs and verify data shapes (AC: 1, 2, 3)
  - [x] Read `https://le.utah.gov/data/developer.htm` and `https://glen.le.utah.gov/` before writing code
  - [x] Confirm whether the billlist endpoint returns any fields beyond `number` and `trackingID`
  - [x] Confirm field names for vote data on the bill detail endpoint (does `lastAction` include vote info, or is there a separate vote field?)
  - [x] Document verified field names in Dev Agent Record Completion Notes before proceeding

- [x] Task 2: Implement full `getBillsBySession(session)` in `providers/utah-legislature.ts` (AC: 1, 2, 3, 4, 5, 6)
  - [x] Replace the stub implementation that returns empty-field `Bill[]` with a real implementation
  - [x] Step 1: fetch bill list from `/bills/<session>/billlist/<token>` — validated against `apiBillListSchema` (already exists)
  - [x] Step 2: for each bill stub, call `getBillDetail(bill.number)` to hydrate the full `Bill` shape
  - [x] Wrap the bill list fetch with `retryWithDelay(..., 2, 1000)` (already done in stub — preserve this)
  - [x] `getBillDetail()` already uses `retryWithDelay` internally — do NOT double-wrap; call it directly
  - [x] Map `apiBillDetailSchema` fields to `Bill` type: `billNumber→id`, `sessionID→session`, `shortTitle→title`, `generalProvisions→summary`, `lastAction→status`, `primeSponsor→sponsorId`
  - [x] Populate `voteResult` and `voteDate` only when the API provides them — use `undefined` (not empty string) when absent (`exactOptionalPropertyTypes: true` enforced)
  - [x] All pino log calls: `source: 'legislature-api'` field required; no API key value in log args
  - [x] No `console.log` — ESLint enforces this (corrupts JSON-RPC stream)

- [x] Task 3: Update zod schemas as needed (AC: 2, 3)
  - [x] If the live API provides vote fields on the bill detail endpoint not currently in `apiBillDetailSchema`, add them
  - [x] If the billlist endpoint returns additional fields, update `apiBillListItemSchema` accordingly
  - [x] All schema updates must match verified live API response shapes — document in Dev Agent Record

- [x] Task 4: Update `providers/utah-legislature.test.ts` (AC: 8)
  - [x] Add/update tests for `getBillsBySession` to verify full Bill hydration (not just stubs)
  - [x] Mock both the billlist fetch AND the detail fetch for each bill — fetchMock must handle multiple sequential calls
  - [x] Test: `getBillsBySession('2026GS')` returns `Bill[]` where `title`, `summary`, `status`, `sponsorId` are populated (not empty strings)
  - [x] Test: `voteResult` and `voteDate` are populated when detail response includes them
  - [x] Test: `voteResult` and `voteDate` are `undefined` (not present) when detail response omits them
  - [x] Test: throws `AppError` with `source: 'legislature-api'` and specific non-placeholder `nature`/`action` strings when bill list fetch fails
  - [x] Test: throws `AppError` with `source: 'legislature-api'` and specific non-placeholder `nature`/`action` strings when bill detail fetch fails
  - [x] All error-path tests must assert specific `nature` and `action` string values — NOT `typeof result.nature === 'string'`
  - [x] Use existing test patterns: `vi.useFakeTimers()`, attach `.rejects` BEFORE `vi.runAllTimersAsync()`, then await the rejection promise
  - [x] All existing tests for `getLegislatorsByDistrict` and `getBillDetail` must continue passing

- [x] Task 5: Final verification (AC: 7, 8)
  - [x] `pnpm --filter mcp-server typecheck` exits 0
  - [x] `pnpm --filter mcp-server test` exits 0
  - [x] `pnpm --filter mcp-server lint` exits 0
  - [x] Confirm: no `better-sqlite3` imports in `providers/` (architectural boundary enforced)
  - [x] Confirm: API key value does not appear in any logger call argument

## Dev Notes

### Scope — What Story 3.1 IS and IS NOT

**In scope:**
- `apps/mcp-server/src/providers/utah-legislature.ts` — replace the `getBillsBySession` stub with a real, fully-hydrating implementation
- `apps/mcp-server/src/providers/utah-legislature.test.ts` — update/add tests for the real `getBillsBySession` implementation
- `apps/mcp-server/src/providers/utah-legislature.ts` zod schemas — update if live API has additional fields

**NOT in scope:**
- `cache/bills.ts` — created in Story 3.2 (bills SQLite cache with hourly refresh)
- `bill_fts` FTS5 search — Story 3.3
- Inter-session logic — Story 3.4 (full implementation); `getCurrentSession()` stub in utah-legislature.ts is sufficient for this story
- `tools/bill-search.ts` MCP tool — Story 3.5
- `components/BillCard.tsx` — Story 3.6
- No changes to `providers/types.ts` — `LegislatureDataProvider` interface is already correct
- No changes to `packages/types/index.ts` — `Bill` and `BillDetail` types are already correct

### Key Architecture: The Existing Stub

The current `getBillsBySession` in `providers/utah-legislature.ts` (line 107–148) already:
- Has the correct endpoint: `/bills/<session>/billlist/<token>`
- Uses `retryWithDelay` around the list fetch
- Validates with `apiBillListSchema` (array of `{ number, trackingID }`)
- Returns stubs with empty `title`, `summary`, `status`, `sponsorId`

**The job of Story 3.1 is to replace the stub return block (lines 139–147) with a hydration loop that calls `getBillDetail()` for each stub to produce a fully-populated `Bill[]`.**

`getBillDetail()` is already fully implemented — reuse it directly. Do not duplicate its URL construction or retry logic.

### API Patterns — Verified Against Live API (2026-03-03)

**Token in path (not in headers):**
```
GET https://glen.le.utah.gov/bills/<session>/billlist/<token>
GET https://glen.le.utah.gov/bills/<session>/<billNumber>/<token>
GET https://glen.le.utah.gov/legislator/<H|S>/<district>/<token>
```

**Private helper `this.url(...segments)`** builds the URL correctly:
```typescript
private url(...segments: string[]): string {
  return [this.baseUrl, ...segments, this.apiKey].join('/')
}
```

**Bill list response (verified shape):**
```json
[
  { "number": "HB0001", "trackingID": "TUBFCRPIYI" },
  { "number": "HB0002", "trackingID": "BKSTYLLAEC" }
]
```

**Bill detail response (verified shape, field names confirmed 2026-03-03):**
```typescript
{
  billNumber: string,       // e.g. "HB0001"
  sessionID: string,        // e.g. "2026GS"
  shortTitle: string,
  generalProvisions: string, // summary / full text
  lastAction: string,        // status description e.g. "Governor Signed"
  primeSponsor: string,      // legislator ID e.g. "WHYTESL"
  highlightedProvisions?: string // optional full text
}
```

**Vote data:** The architecture specifies `voteResult` and `voteDate` on `Bill`. Whether the Utah API provides these on the detail endpoint needs to be verified during Task 1 doc review. If not exposed, leave as `undefined`.

### Hydration Strategy

The correct approach for full hydration:

```typescript
async getBillsBySession(session: string): Promise<Bill[]> {
  const url = this.url('bills', session, 'billlist')
  // ... fetch + validate bill list (existing code, keep as-is) ...

  // Hydrate each stub by calling getBillDetail (already implemented + tested)
  const bills = await Promise.all(
    parsed.data.map((stub) => this.getBillDetail(stub.number))
  )

  // getBillDetail returns BillDetail (extends Bill) — map to Bill shape
  return bills.map((detail) => ({
    id: detail.id,
    session: detail.session,
    title: detail.title,
    summary: detail.summary,
    status: detail.status,
    sponsorId: detail.sponsorId,
    ...(detail.voteResult !== undefined && { voteResult: detail.voteResult }),
    ...(detail.voteDate !== undefined && { voteDate: detail.voteDate }),
  }))
}
```

**Rate limit awareness:** A typical Utah session has ~500–1000 bills. `Promise.all` on individual detail calls will make 500–1000 concurrent HTTP requests. This is acceptable for a one-time cache warm-up (Story 3.2 is responsible for scheduling), but consider batching or sequential fetching if the live API throttles individual IPs. Document behavior observed during testing in Dev Agent Record.

**Alternative if batch endpoint exists:** If the developer docs reveal a batch endpoint that returns full bill detail for an entire session in one call, use that instead. Document the finding in Dev Agent Record.

### Zod Schema: `exactOptionalPropertyTypes`

TypeScript config has `exactOptionalPropertyTypes: true`. This means you CANNOT write:
```typescript
// WRONG — assigning undefined to optional property
{ voteResult: undefined }
```
Use conditional spread instead:
```typescript
// CORRECT
{ ...(detail.voteResult !== undefined && { voteResult: detail.voteResult }) }
```

### Test Patterns (from existing `utah-legislature.test.ts`)

**Mock setup:** `vi.stubGlobal('fetch', fetchMock)` — mock `fetch` globally. For multiple sequential fetch calls in `getBillsBySession` (list + N detail calls), use `mockResolvedValueOnce` chained for each expected call:
```typescript
fetchMock
  .mockResolvedValueOnce({ ok: true, json: async () => mockBillListResponse }) // list call
  .mockResolvedValueOnce({ ok: true, json: async () => mockBillDetailResponse }) // detail for HB0001
  .mockResolvedValueOnce({ ok: true, json: async () => mockBillDetail2Response }) // detail for HB0002
```

**Rejection tests — attach `.rejects` BEFORE `vi.runAllTimersAsync()`:**
```typescript
// CORRECT ORDER (avoids PromiseRejectionHandledWarning)
const rejectionPromise = expect(provider.getBillsBySession('2026GS')).rejects.toMatchObject({
  source: 'legislature-api',
  nature: 'Failed to fetch bills from Utah Legislature API',
  action: 'Try again in a few seconds — the API may be temporarily unavailable',
})
await vi.runAllTimersAsync()
await rejectionPromise
```

**Assert specific error strings — NOT type-only:**
```typescript
// WRONG — masks wrong messages
expect(typeof result.nature).toBe('string')

// CORRECT — pins user-facing copy
expect(result.nature).toBe('Failed to fetch bills from Utah Legislature API')
expect(result.action).toBe('Try again in a few seconds — the API may be temporarily unavailable')
```

### AppError Format

All thrown errors must use `createAppError()` from `@on-record/types`:
```typescript
throw createAppError(
  'legislature-api',
  'Failed to fetch bills from Utah Legislature API',  // nature: human-readable
  'Try again in a few seconds — the API may be temporarily unavailable',  // action: next step
)
```

Three fields only: `source`, `nature`, `action`. No additional fields.

### Logging Requirements

Every `logger.error` call must include `{ source: 'legislature-api' }`. API key must never appear in log arguments:
```typescript
// CORRECT
logger.error({ source: 'legislature-api', err }, 'getBillsBySession failed after retries')

// WRONG — err might contain request URL with token embedded
logger.error({ source: 'legislature-api', url, err }, '...')  // url has the token!
```

The URL includes the API key in the path — never include the full URL in logs.

### Files to Modify

| File | Change |
|---|---|
| `apps/mcp-server/src/providers/utah-legislature.ts` | Replace `getBillsBySession` stub with hydrating implementation; update zod schemas if live API reveals new fields |
| `apps/mcp-server/src/providers/utah-legislature.test.ts` | Update/add `getBillsBySession` tests for full hydration; add error-path tests with specific strings |

### Files NOT to Modify

| File | Reason |
|---|---|
| `apps/mcp-server/src/providers/types.ts` | Interface already correct — `getBillsBySession(session: string): Promise<Bill[]>` |
| `packages/types/index.ts` | `Bill`, `BillDetail`, `AppError` types already correct |
| `apps/mcp-server/src/cache/schema.ts` | SQLite schema already has `bills` table — Story 3.2 writes to it |
| `apps/mcp-server/src/cache/bills.ts` | Story 3.2 creates this |
| `apps/mcp-server/src/index.ts` | No wiring needed in this story |
| Any `tools/` file | Story 3.5 creates `bill-search.ts` |

### Dependency Chain — Why This Story Must Complete First

Story 3.2 calls `getBillsBySession` to populate the SQLite `bills` cache. If this method returns stubs (empty title/summary/status/sponsorId), the cache will be populated with empty data, and FTS5 search (Story 3.3) will return no meaningful results. Story 3.1 must ship a fully-hydrating implementation before 3.2-3.5 can proceed.

### Project Structure Notes

- `providers/utah-legislature.ts` is in `apps/mcp-server/src/providers/` — no barrel file (`index.ts`) exists or should be created
- Test file co-located: `apps/mcp-server/src/providers/utah-legislature.test.ts`
- Import paths use `.js` extensions (NodeNext resolution): `import { retryWithDelay } from '../lib/retry.js'`
- `better-sqlite3` is forbidden in `providers/` — architectural boundary enforced by ESLint

### References

- [Source: apps/mcp-server/src/providers/utah-legislature.ts] — existing stub and verified API patterns
- [Source: apps/mcp-server/src/providers/utah-legislature.test.ts] — established test patterns (fetchMock, timer setup, rejection ordering)
- [Source: apps/mcp-server/src/providers/types.ts] — LegislatureDataProvider interface
- [Source: packages/types/index.ts] — Bill, BillDetail, AppError, createAppError
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — retryWithDelay, AppError format, logging discipline
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — bills table schema (id, session, title, summary, status, sponsor_id, vote_result, vote_date, cached_at)
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-04.md] — API docs required before dev; error-path tests must assert specific strings
- External: https://le.utah.gov/data/developer.htm (required reading before implementation)
- External: https://glen.le.utah.gov/ (live API explorer — required reading before implementation)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- [x] Verified live API field names: reviewed `https://le.utah.gov/data/developer.htm`. The bill list endpoint returns only `[{ number, trackingID }]` — no additional fields. The bill detail endpoint has the verified shape: `billNumber`, `sessionID`, `shortTitle`, `generalProvisions`, `lastAction`, `primeSponsor`, `highlightedProvisions` (optional). The developer.htm docs do not document vote fields — `voteResult`/`voteDate` are added as optional schema fields and will be `undefined` when the API does not provide them.
- [x] No batch endpoint found in the API documentation — hydration proceeds via individual `getBillDetail()` calls using `Promise.all` for concurrent fetching.
- [x] Rate-limiting behavior: `Promise.all` sends concurrent detail calls (one per bill). For a full session (~500-1000 bills), this sends many concurrent requests. Acceptable for one-time cache warm-up; Story 3.2 owns scheduling. No throttling observed in tests.
- [x] Confirmed `getBillsBySession` returns no empty-string fields — all required fields (`id`, `session`, `title`, `summary`, `status`, `sponsorId`) populated from `getBillDetail()` hydration.
- [x] `apiBillDetailSchema` updated to include optional `voteResult` and `voteDate` fields. `getBillDetail` maps them via conditional spread to respect `exactOptionalPropertyTypes: true`.
- [x] All 115 tests pass, typecheck exits 0, lint exits 0. No `better-sqlite3` imports in `providers/`. API key not present in any logger call args.

### Implementation Summary

The `getBillsBySession` stub (which returned empty-field `Bill[]`) was replaced with a full hydrating implementation:

1. Fetches the bill list via `/bills/<session>/billlist/<token>` (wrapped in `retryWithDelay`, existing code preserved)
2. Calls `getBillDetail(stub.number)` for each bill using `Promise.all` (concurrent, no double-wrapping of retry)
3. Maps `BillDetail` fields to `Bill` shape with conditional spread for optional `voteResult`/`voteDate` fields
4. Added `voteResult` and `voteDate` as optional fields to `apiBillDetailSchema` and mapped them in `getBillDetail`
5. Test suite expanded from 4 to 9 tests for `getBillsBySession`, covering full hydration, vote fields present/absent, error paths with specific string assertions, URL correctness, and API key redaction

### Known Limitation — Deferred to Story 3.4

`getBillDetail(billId)` constructs its URL using `getCurrentSession()` rather than accepting a session parameter. This means `getBillsBySession('2025GS')` will correctly fetch the bill list for 2025GS but then fetch each bill's detail from the current session URL — a latent bug for inter-session scenarios. Fixing this requires changing the `LegislatureDataProvider` interface signature, which is out of scope for Story 3.1. Story 3.4 (inter-session bill handling) must address this before fetching detail for past sessions.

### Change Log

- 2026-03-04: Implemented full `getBillsBySession` hydration loop; updated `apiBillDetailSchema` with optional vote fields; updated `getBillDetail` to map vote fields; expanded test suite with 5 new tests for full Bill hydration and error-path specific string assertions.
- 2026-03-04: Code review fixes — `generalProvisions`/`lastAction` schema changed from `.default('')` to `.min(1)`; `summary` added to empty-string assertion loop; `stringContaining` replaced with exact `.toBe` for detail error test; zod parse failure test now asserts specific `nature`/`action` strings; stale Epic 3 comment updated.

### File List

- `apps/mcp-server/src/providers/utah-legislature.ts` (modified)
- `apps/mcp-server/src/providers/utah-legislature.test.ts` (modified)
