# Story 2-7: `resolve_address` MCP Tool

Status: done

## Story

As a **chatbot agent**,
I want to call a dedicated `resolve_address` tool with a street address and zone,
so that I can obtain House and Senate district identifiers independently of a legislator lookup — enabling district-based legislative queries without forcing the constituent to also receive legislator contact info they may not need yet.

## Acceptance Criteria

1. The `resolve_address` tool is registered on the McpServer and is callable from Claude.ai or ChatGPT with input `{ street: string, zone: string }`.
2. A valid Utah address returns structured JSON matching the new `ResolveAddressResult` type from `packages/types/`: `{ houseDistrict: number, senateDistrict: number, resolvedAddress: string }`. No `session` field — redistricting cycle (2022–2032) is not session-specific.
3. A P.O. Box address (detected via regex before the GIS call) returns structured AppError JSON with `source: 'gis-api'` and a `nature` field containing `'P.O. Box'`.
4. A UGRC geocode failure (transient, retries exhausted) returns AppError JSON with `source: 'gis-api'` and `nature` containing `'unavailable'`.
5. A low-confidence geocode score (< 70) returns AppError JSON with `source: 'gis-api'` and `nature` containing `'confidently located'`.
6. All error responses are structured JSON — `content: [{ type: 'text', text: JSON.stringify(appError) }]` — never a prose string.
7. The street and zone are never logged in plain text — all pino log entries use `'[REDACTED]'` for the address (NFR7).
8. Retry logic (2 retries, 1s/3s delays) on transient GIS failures is handled by `resolveAddressToDistricts` in `lib/gis.ts` — the tool does NOT inline its own retry.
9. `ResolveAddressResult` is defined in `packages/types/index.ts` as the public type contract.
10. `pnpm --filter mcp-server typecheck` exits 0 and `pnpm --filter mcp-server test` exits 0.

## Tasks / Subtasks

- [x] Task 1: Add `ResolveAddressResult` to `packages/types/index.ts` (AC: 2, 9)
  - [x] Insert after `LookupLegislatorResult` export:
    ```typescript
    export interface ResolveAddressResult {
      houseDistrict: number
      senateDistrict: number
      resolvedAddress: string // geocoder's canonical address form; always '[REDACTED]' in logs
    }
    ```
  - [x] No other changes to `packages/types/index.ts` — do not rename or modify existing types

- [x] Task 2: Create `apps/mcp-server/src/tools/resolve-address.ts` (AC: 1–8)
  - [x] Copy `PO_BOX_PATTERN` from `legislator-lookup.ts` into this file (do NOT remove it from `legislator-lookup.ts` — that tool still has `{street, zone}` input until story 2-8-lookup-legislator-name-district-search)
    ```typescript
    const PO_BOX_PATTERN = /^p\.?o\.?\s*box\b/i
    ```
  - [x] Import: `McpServer` from `'@modelcontextprotocol/sdk/server/mcp.js'`
  - [x] Import: `z` from `'zod'`
  - [x] Import: `logger` from `'../lib/logger.js'`
  - [x] Import: `createAppError, isAppError` from `'@on-record/types'`
  - [x] Import: `ResolveAddressResult` type from `'@on-record/types'`
  - [x] Import: `resolveAddressToDistricts` from `'../lib/gis.js'`
  - [x] Export `registerResolveAddressTool(server: McpServer): void` as named export — no default export
  - [x] Inside the function, call `server.tool('resolve_address', description, schema, handler)`:
    - Description: `"Resolves a Utah street address to House and Senate legislative district numbers via GIS lookup. Returns structured JSON with houseDistrict, senateDistrict, and the geocoder's canonical form of the input address."`
    - Schema: `{ street: z.string().min(1).describe('Street portion only: number and street name. Example: "123 S State St"'), zone: z.string().min(1).describe('City name or 5-digit ZIP code. Example: "Salt Lake City" or "84111"') }`
  - [x] Handler body:
    1. P.O. Box pre-check: `if (PO_BOX_PATTERN.test(street.trim()))` → `logger.error({ source: 'gis-api', address: '[REDACTED]', errorType: 'po-box' }, 'P.O. Box address submitted')` → return AppError JSON with nature `'P.O. Box addresses cannot be geocoded to a legislative district'` and action `'Use your street address (e.g., 123 Main St) rather than a P.O. Box'`
    2. Wrap `resolveAddressToDistricts(street, zone)` in try/catch:
       - On `isAppError(err)`: return `{ content: [{ type: 'text', text: JSON.stringify(err) }] }`
       - On unknown error: rethrow
    3. On success, build `ResolveAddressResult`: `{ houseDistrict: result.houseDistrict, senateDistrict: result.senateDistrict, resolvedAddress: result.resolvedAddress }`
    4. `logger.info({ source: 'mcp-tool', address: '[REDACTED]', houseDistrict, senateDistrict }, 'resolve_address succeeded')`
    5. Return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
  - [x] Named export only — no default export
  - [x] No barrel file — caller imports directly from `'./tools/resolve-address.js'`

- [x] Task 3: Register tool in `apps/mcp-server/src/index.ts` (AC: 1)
  - [x] Add import: `import { registerResolveAddressTool } from './tools/resolve-address.js'`
  - [x] Add call `registerResolveAddressTool(server)` alongside the existing tool registrations (Story 2.4, 3.5)
  - [x] Update the `STEP 2.7` comment to include this story

- [x] Task 4: Create `apps/mcp-server/src/tools/resolve-address.test.ts` (AC: 10)
  - [x] Structure: mirrors `legislator-lookup.test.ts` — mock `lib/logger.js`, mock `env.js`, stub `fetch` globally
  - [x] Do NOT mock `lib/gis.js` — let the handler path run through `resolveAddressToDistricts` with the mocked fetch; this tests the full tool → lib → fetch stack
  - [x] Capture the tool handler via a mock McpServer (same helper pattern as `legislator-lookup.test.ts`)
  - [x] `makeGeocodeResponse` fixture: `{ status: 200, result: { location: { x: -111.891, y: 40.76 }, score: 90.5, matchAddress: '123 S State St, Salt Lake City, UT 84111' } }`
  - [x] `makeDistrictResponse(dist: number)` fixture: `{ status: 200, result: [{ attributes: { dist } }] }`
  - [x] Test 1 — valid address: mock fetch: geocode → district house (dist: 24) → district senate (dist: 4); assert response JSON matches `ResolveAddressResult` with `houseDistrict: 24`, `senateDistrict: 4`, `resolvedAddress: '123 S State St, Salt Lake City, UT 84111'`; verify `toHaveBeenCalledWith` on logger.info with `source: 'mcp-tool'` and `address: '[REDACTED]'`
  - [x] Test 2 — P.O. Box address: call handler with `{ street: 'P.O. Box 123', zone: 'Salt Lake City' }`; assert `content[0].text` parses to AppError; `nature` contains `'P.O. Box'`; verify fetch was NOT called
  - [x] Test 3 — UGRC geocode transient failure (retries exhausted): mock fetch to throw `new Error('network error')` every call; assert response is AppError with `source: 'gis-api'` and `nature` containing `'unavailable'`; use `vi.useFakeTimers()` + attach `.rejects` BEFORE `vi.runAllTimersAsync()` (CLAUDE.md timing invariant)
  - [x] Test 4 — low-confidence geocode score: mock fetch geocode response with `score: 50`; assert AppError with `nature` containing `'confidently located'`
  - [x] Test 5 — address redaction: all logger mock calls (info, error, warn) never contain the street/zone strings; all contain `'[REDACTED]'`
  - [x] Co-locate at `apps/mcp-server/src/tools/resolve-address.test.ts`

- [x] Task 5: Final verification (AC: 10)
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server test` — all tests pass (206 total, 5 new)
  - [x] `pnpm --filter mcp-server lint` — zero ESLint violations, no `console.log`
  - [x] Confirm `packages/types/index.ts` has `ResolveAddressResult` exported
  - [x] Confirm no `tools/index.ts` barrel file created
  - [x] Confirm `lookup_legislator` is UNCHANGED — it still accepts `{street, zone}` and calls `resolveAddressToDistricts` internally

## Dev Notes

### Scope — What This Story IS and IS NOT

**This story creates:**
- `apps/mcp-server/src/tools/resolve-address.ts` — new MCP tool registration
- `apps/mcp-server/src/tools/resolve-address.test.ts` — unit tests
- Modifies `packages/types/index.ts` — adds `ResolveAddressResult`
- Modifies `apps/mcp-server/src/index.ts` — registers the new tool

**NOT in this story:**
- `lookup_legislator` changes — address resolution stays in that tool until the NEXT story (`2-8-lookup-legislator-name-district-search`). Both tools may call `resolveAddressToDistricts` simultaneously — this is by design and temporary.
- Changes to `lib/gis.ts` — all GIS logic is already correct and complete there; do not touch it.
- `SearchBillsResult` or `Bill` type changes — those are in story 3-7.

### Why `session` is NOT in the output

The sprint-change-proposal-2026-03-27.md explicitly states:
> "District boundaries come from GIS data on a redistricting cycle, not a legislative session cycle — the current Utah map is valid 2022–2032. Session context is not meaningful here and is dropped from the output."

The existing `GisDistrictResult` interface in `lib/gis.ts` already has the correct shape (`houseDistrict`, `senateDistrict`, `resolvedAddress`) — `ResolveAddressResult` in `packages/types/` is its public-facing twin. Do not add `session` to the output.

### GIS Logic Is Already Complete

`resolveAddressToDistricts` in `lib/gis.ts` handles:
- Two-phase UGRC call (geocode → district lookup)
- Retry with 2 retries, 1s/3s delays (via `retryWithDelay`)
- Non-retryable 4xx detection (`UgrcHttpError` sentinel)
- Low-confidence geocode score (< 70) rejection
- District parse validation
- All AppError classifications with correct `source`, `nature`, `action`
- `'[REDACTED]'` address logging in all log entries

The tool's handler is a thin wrapper: P.O. Box pre-check → call `resolveAddressToDistricts` → catch AppError → build result → return JSON.

### P.O. Box Duplication is Intentional (For Now)

`PO_BOX_PATTERN` appears in both `resolve-address.ts` and `legislator-lookup.ts`. This is intentional — the next story (`2-8-lookup-legislator-name-district-search`) will remove the address input from `lookup_legislator`, at which point the P.O. Box check in `legislator-lookup.ts` becomes dead code and will be removed then. Do NOT move it to `lib/gis.ts` — it is a pre-call optimization specific to address-accepting tools.

### Test Key Phrases for `toContain` Assertions (CLAUDE.md requirement)

Error-path test assertions MUST use `toContain('key phrase')` on the `nature` or `action` field — not type-only checks, not exact strings:

| Scenario | Field | Key phrase |
|---|---|---|
| P.O. Box input | `nature` | `'P.O. Box'` |
| UGRC transient failure / retries exhausted | `nature` | `'unavailable'` |
| Low-confidence geocode score | `nature` | `'confidently located'` |
| Address not found (UGRC 404) | `nature` | `'Address not found'` |

### Test Timing Invariant (CLAUDE.md)

For the retry exhaustion test (Test 3), follow the Vitest rejection test pattern from CLAUDE.md:

```typescript
vi.useFakeTimers()
// Attach .rejects BEFORE advancing timers
const resultPromise = server.invokeHandler({ street: '...', zone: '...' })
await vi.runAllTimersAsync()
const result = await resultPromise
// Then assert on result
```

The `.rejects` assertion (or `await resultPromise`) must be attached before `vi.runAllTimersAsync()` to avoid `PromiseRejectionHandledWarning`. Note: since the tool catches all errors and returns structured JSON (not throws), `resultPromise` resolves — it does not reject. Parse `content[0].text` and assert the AppError fields.

### Architecture Reference

- `lib/gis.ts` — `resolveAddressToDistricts(street, zone): Promise<GisDistrictResult>` [Source: apps/mcp-server/src/lib/gis.ts]
- `packages/types/index.ts` — all shared type contracts [Source: packages/types/index.ts]
- `tools/legislator-lookup.ts` — reference for PO_BOX_PATTERN and handler structure [Source: apps/mcp-server/src/tools/legislator-lookup.ts]
- Sprint change proposal defining this story [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#4.3]
- No barrel files in `tools/` — import directly from the file [Source: CLAUDE.md]
- `console.log` FORBIDDEN in `apps/mcp-server/` — only `console.error` (but use pino logger instead) [Source: CLAUDE.md]

### Project Structure Notes

- Alignment with unified structure: new file goes in `apps/mcp-server/src/tools/resolve-address.ts`, test co-located at `apps/mcp-server/src/tools/resolve-address.test.ts`
- Type added to `packages/types/index.ts` (the only place shared types may live)
- No new dependencies required — `resolveAddressToDistricts`, `createAppError`, `isAppError`, `z`, `logger` all already present

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blocking issues.

### Completion Notes List

- Added `ResolveAddressResult` interface to `packages/types/index.ts` after `LookupLegislatorResult`; no existing types modified.
- Created `resolve-address.ts`: thin wrapper over `resolveAddressToDistricts` with P.O. Box pre-check, AppError catch/forward, and redacted pino logging. Named export only, no barrel file.
- Registered `registerResolveAddressTool` in `index.ts` alongside existing tool registrations; updated STEP 2.7 comment to include Story 2.7.
- Created 5 tests mirroring `legislator-lookup.test.ts` structure: valid address, P.O. Box, retries exhausted, low-confidence score, address redaction. All 206 mcp-server tests pass.
- `lookup_legislator` is unchanged — still accepts `{street, zone}` and calls `resolveAddressToDistricts` internally (duplication intentional until Story 2-8).

### File List

- `packages/types/index.ts` — modified (add `ResolveAddressResult` export)
- `apps/mcp-server/src/tools/resolve-address.ts` — new file
- `apps/mcp-server/src/tools/resolve-address.test.ts` — new file
- `apps/mcp-server/src/index.ts` — modified (register `registerResolveAddressTool`, update STEP 2.7 comment)

### Change Log

- 2026-03-30: Implemented Story 2-7 — `resolve_address` MCP tool. Added `ResolveAddressResult` type, created tool file and tests, registered in index.ts.
