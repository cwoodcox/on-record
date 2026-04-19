# Story 4.9 — Bill URL Computed Field

## Status: done

## Story
As a ChatGPT App user, when I ask about a bill, I want the response to include a clickable link to the full bill text on the Utah Legislature website, so I can read the original legislation without leaving the conversation.

## Acceptance Criteria
1. `Bill` interface in `packages/types/index.ts` has a new optional field `billUrl?: string` with a comment explaining it is computed, not stored.
2. `rowToBill()` in `apps/mcp-server/src/cache/bills.ts` sets `billUrl` unconditionally for every row using the pattern `https://le.utah.gov/~<year>/bills/static/<id>.html` where `<year>` is the first 4 characters of `session`.
3. `writeBills()` is unchanged — no new DB column, no SQL changes.
4. Two new tests in `bills.test.ts` under `describe('billUrl computation', ...)`:
   - `{ id: 'HB0001', session: '2026GS' }` → `billUrl === 'https://le.utah.gov/~2026/bills/static/HB0001.html'`
   - `{ id: 'SB0013', session: '2025S1' }` → `billUrl === 'https://le.utah.gov/~2025/bills/static/SB0013.html'`
5. `pnpm --filter mcp-server typecheck` passes.
6. `pnpm --filter mcp-server test` passes.

## Implementation Notes
- `billUrl` flows through `searchBills` automatically via `rowToBill()` — no changes needed to `search-bills.ts` or its tests.
- The year is extracted with `row.session.slice(0, 4)` — works for both regular (`2026GS`) and special sessions (`2025S1`).

## File List
- `packages/types/index.ts` — added `billUrl?: string` to `Bill` interface
- `apps/mcp-server/src/cache/bills.ts` — added `billUrl` computation in `rowToBill()`
- `apps/mcp-server/src/cache/bills.test.ts` — added `describe('billUrl computation', ...)` block with 2 tests

## Dev Agent Record
- **Model:** claude-sonnet-4-6
- **Completed:** 2026-04-18
- **Notes:** Straightforward computed field. No DB changes, no SQL changes. All 201 tests pass, typecheck clean.
