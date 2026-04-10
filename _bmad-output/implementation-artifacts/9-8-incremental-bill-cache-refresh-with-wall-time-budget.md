# Story 9.8: Incremental Bill Cache Refresh with Wall-Time Budget

Status: done

## Story

As an **operator**,
I want the bill cache warm-up to skip already-fresh bills and stop gracefully before hitting Cloudflare's wall-time limit,
So that each cron run makes forward progress without being killed mid-write, and the full bill list hydrates incrementally across runs.

## Background

The current `warmUpBillsCache` fetches and writes every bill on every run. In production, Cloudflare's 30-second wall-time limit for scheduled handlers kills the job partway through, leaving the cache partially populated. Because `writeBills` is a pure upsert (no delete), partially-completed runs don't corrupt data — but without skipping fresh bills, each run wastes its budget re-fetching bills it already has instead of making forward progress on the ones it doesn't.

The fix: add a staleness TTL so already-fresh bills are skipped, and a configurable wall-time budget so the warm-up stops cleanly before Cloudflare terminates it. The progress state is the `cached_at` timestamp already present in the `bills` table — no additional checkpoint table needed.

Legislators are excluded from this story (their 104-call warm-up completes in ~250ms CPU time and writes cleanly within budget).

## Acceptance Criteria

### Provider interface

1. **Given** `providers/types.ts` **then** `LegislatureDataProvider` declares a new method `getBillStubsForSession(session: string): Promise<string[]>` that returns bill IDs (e.g. `["HB0001", "HB0002", ...]`) for the given session.
2. **Given** `UtahLegislatureProvider` **then** `getBillStubsForSession` is implemented: fetches `/bills/<session>/billlist/<token>` (same endpoint as before) and returns the `number` field from each stub — no detail hydration.
3. **Given** `getBillsBySession` on `UtahLegislatureProvider` **then** it is refactored to call `getBillStubsForSession` internally rather than duplicating the stub fetch, so there is no repeated logic.

### Staleness config

4. **Given** the worker environment **then** two optional env vars control staleness TTLs, parsed as integers (seconds):
   - `BILL_STALE_SECONDS_IN_SESSION` — default `3600` (1 hour)
   - `BILL_STALE_SECONDS_OUT_OF_SESSION` — default `86400` (24 hours)
5. **Given** the sessions table is populated **then** the correct TTL is selected via `isInSession(db)`.
6. **Given** the sessions table is empty **then** the out-of-session TTL is used as a safe default.

### Wall-time budget

7. **Given** the worker environment **then** one optional env var controls the wall-time budget:
   - `CACHE_REFRESH_WALL_TIME_SECONDS` — default `0` (no limit; dev/test mode)
8. **Given** `CACHE_REFRESH_WALL_TIME_SECONDS` is `0` or unset **then** the warm-up runs to completion with no time check.
9. **Given** `CACHE_REFRESH_WALL_TIME_SECONDS` is a positive integer **then** before fetching each batch of bill details, elapsed wall time is checked; if `elapsed >= (wallTimeSeconds - 2) * 1000` ms the loop exits early without fetching that batch.
10. **Given** the warm-up exits early due to wall-time **then** all bills fetched so far in this run are written to D1 before returning (no partial batch is silently dropped).

### Incremental refresh logic (lives in `cache/refresh.ts`)

11. **Given** `warmUpBillsCache` is called **then** for each target session it:
    a. Calls `provider.getBillStubsForSession(session)` to get all bill IDs.
    b. Queries D1 for bill IDs in this session whose `cached_at > now - staleTtlMs`.
    c. Filters to stale/missing bills only (IDs not in the fresh set).
    d. Fetches details for stale/missing bills in batches of 20 using `provider.getBillDetail`, with wall-time check before each batch.
    e. Upserts fetched bills to D1 (same `writeBills` as before).
12. **Given** all bills in a session are fresh **then** `warmUpBillsCache` skips that session entirely (zero API calls, zero D1 writes for that session).
13. **Given** the warm-up completes a full run (no early exit) **then** it returns the list of session IDs refreshed (same contract as before).
14. **Given** the warm-up exits early **then** it still returns the list of session IDs that were at least partially processed.

### wrangler.toml

15. **Given** `wrangler.toml` **then** a `[vars]` section declares the three env vars with their default values:
    ```toml
    [vars]
    BILL_STALE_SECONDS_IN_SESSION = "3600"
    BILL_STALE_SECONDS_OUT_OF_SESSION = "86400"
    CACHE_REFRESH_WALL_TIME_SECONDS = "0"
    ```
16. **Given** `wrangler types` is run **then** `worker-configuration.d.ts` is regenerated to include the three new `string` fields on `Env`.

### Error handling

17. **Given** `getBillStubsForSession` throws (API down, parse failure) **then** `warmUpBillsCache` logs the error and skips that session — same behaviour as the current `getBillsBySession` failure path.
18. **Given** individual `getBillDetail` calls fail within a batch **then** they are skipped (logged, not thrown) — same `Promise.allSettled` behaviour as before.

### Tests

19. **Given** `getBillStubsForSession` on `UtahLegislatureProvider` **then** unit tests verify it returns bill IDs from a mocked stub list response.
20. **Given** `warmUpBillsCache` with all bills fresh **then** test verifies `getBillDetail` is never called and D1 writes are zero.
21. **Given** `warmUpBillsCache` with some stale and some fresh bills **then** test verifies only stale bills are fetched.
22. **Given** `warmUpBillsCache` with wall-time budget that expires after the first batch **then** test verifies the loop exits cleanly and only the first batch is written.
23. **Given** error-path tests **then** `nature` fields contain key phrases:
    - Stub fetch failure: `'fetch bill stubs'`
    - Wall-time exit log message: `'wall-time budget'`

### Verification

24. **Given** `pnpm --filter mcp-server test` **then** all tests pass.
25. **Given** `pnpm --filter mcp-server typecheck` **then** zero errors.
26. **Given** `pnpm --filter mcp-server lint` **then** zero errors.
27. **Given** `wrangler deploy --dry-run` **then** bundles successfully.

## Tasks / Subtasks

- [ ] Task 1: Extend provider interface and implement `getBillStubsForSession` (AC 1–3)
  - [ ] Add `getBillStubsForSession(session: string): Promise<string[]>` to `LegislatureDataProvider` in `providers/types.ts`
  - [ ] Implement in `UtahLegislatureProvider`: extract stub fetch from `getBillsBySession`, return `number` fields
  - [ ] Refactor `getBillsBySession` to call `getBillStubsForSession` internally
  - [ ] Add unit test for `getBillStubsForSession`

- [ ] Task 2: Add env vars to wrangler.toml and regenerate types (AC 15–16)
  - [ ] Add `[vars]` section to `wrangler.toml` with all three env vars and defaults
  - [ ] Run `wrangler types` to regenerate `worker-configuration.d.ts`

- [ ] Task 3: Implement incremental refresh logic in `refresh.ts` (AC 4–14, 17–18)
  - [ ] Add `BillRefreshConfig` interface: `{ staleSecondsInSession, staleSecondsOutOfSession, wallTimeSeconds }` with all optional (defaults applied inside)
  - [ ] Update `warmUpBillsCache` signature to accept optional `BillRefreshConfig`
  - [ ] Implement staleness TTL selection via `isInSession(db)`
  - [ ] Implement D1 freshness query: `SELECT id FROM bills WHERE session = ? AND cached_at > ?`
  - [ ] Implement wall-time guard: check elapsed time before each batch
  - [ ] Thread config from `worker.ts` `scheduled` handler: parse env vars, construct config, pass to `warmUpBillsCache`

- [ ] Task 4: Tests (AC 19–23)
  - [ ] All-fresh: verify zero `getBillDetail` calls
  - [ ] Partial stale: verify only stale bills fetched
  - [ ] Wall-time expiry after first batch: verify clean exit and partial write
  - [ ] Key phrases in error/log assertions per AC 23

- [ ] Task 5: Final verification (AC 24–27)
  - [ ] `pnpm --filter mcp-server test`
  - [ ] `pnpm --filter mcp-server typecheck`
  - [ ] `pnpm --filter mcp-server lint`
  - [ ] `wrangler deploy --dry-run`

## Dev Notes

### BillRefreshConfig and defaults

```ts
interface BillRefreshConfig {
  staleSecondsInSession?: number      // default: 3600
  staleSecondsOutOfSession?: number   // default: 86400
  wallTimeSeconds?: number            // default: 0 (no limit)
}
```

Parse from env in `worker.ts` scheduled handler:

```ts
const config: BillRefreshConfig = {
  staleSecondsInSession: env.BILL_STALE_SECONDS_IN_SESSION
    ? parseInt(env.BILL_STALE_SECONDS_IN_SESSION, 10) : undefined,
  staleSecondsOutOfSession: env.BILL_STALE_SECONDS_OUT_OF_SESSION
    ? parseInt(env.BILL_STALE_SECONDS_OUT_OF_SESSION, 10) : undefined,
  wallTimeSeconds: env.CACHE_REFRESH_WALL_TIME_SECONDS
    ? parseInt(env.CACHE_REFRESH_WALL_TIME_SECONDS, 10) : undefined,
}
```

### Wall-time guard pattern

```ts
const startTime = Date.now()
const wallTimeLimitMs = (config.wallTimeSeconds ?? 0) > 0
  ? (config.wallTimeSeconds! - 2) * 1000  // 2s buffer for D1 writes
  : Infinity

for (let i = 0; i < staleBillIds.length; i += BATCH_SIZE) {
  if (Date.now() - startTime >= wallTimeLimitMs) {
    logger.warn({ source: 'cache', elapsed: Date.now() - startTime }, 'wall-time budget reached — stopping early')
    break
  }
  // fetch batch ...
}
// write all fetched bills
await writeBills(db, fetchedBills)
```

### D1 freshness query

```ts
const cutoff = new Date(Date.now() - staleTtlMs).toISOString()
const freshRows = await db
  .prepare('SELECT id FROM bills WHERE session = ? AND cached_at > ?')
  .bind(session, cutoff)
  .all<{ id: string }>()
const freshIds = new Set(freshRows.results.map(r => r.id))
const staleIds = allStubIds.filter(id => !freshIds.has(id))
```

### Architecture constraint

All staleness and wall-time logic lives in `cache/refresh.ts`. The `LegislatureDataProvider` interface stays thin — `getBillStubsForSession` returns raw IDs only, no D1 awareness, no timing logic.

### Future compatibility note

This design intentionally keeps the orchestration (what to fetch, when to stop) separate from the data provider (how to fetch). A future on-demand cache strategy (fetch-on-lookup, evict-after-TTL) would replace `warmUpBillsCache` without touching the provider interface.

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/src/providers/types.ts` | MODIFY | Add `getBillStubsForSession` to `LegislatureDataProvider` |
| `apps/mcp-server/src/providers/utah-legislature.ts` | MODIFY | Implement `getBillStubsForSession`; refactor `getBillsBySession` to use it |
| `apps/mcp-server/src/providers/utah-legislature.test.ts` | MODIFY | Add `getBillStubsForSession` unit tests |
| `apps/mcp-server/src/cache/refresh.ts` | MODIFY | Add `BillRefreshConfig`; update `warmUpBillsCache` with staleness filter + wall-time guard |
| `apps/mcp-server/src/cache/refresh.test.ts` | MODIFY | Add tests for all-fresh, partial-stale, wall-time expiry scenarios |
| `apps/mcp-server/src/worker.ts` | MODIFY | Parse env vars; pass `BillRefreshConfig` to `warmUpBillsCache` |
| `apps/mcp-server/wrangler.toml` | MODIFY | Add `[vars]` section with three env var defaults |
| `apps/mcp-server/worker-configuration.d.ts` | REGENERATE | Run `wrangler types` after wrangler.toml change |
