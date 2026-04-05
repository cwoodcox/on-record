# Story 9.3: Replace node-cron with Cron Trigger Scheduler

Status: review

## Story

As an **operator**,
I want the cache refresh scheduler driven by a Cloudflare Cron Trigger,
So that legislators and bills data refreshes automatically without a long-lived Node.js process managing the schedule.

## Acceptance Criteria

1. **Given** wrangler.toml has a `[triggers]` section **when** it is updated **then** `crons = ["0 6 * * *", "0 * * * *"]` is set (daily legislators refresh at 06:00 UTC, hourly bills refresh)

2. **Given** worker.ts has a stub `scheduled` handler **when** it is implemented **then** `scheduled(event, env, ctx)` calls `warmUpLegislatorsCache` and `warmUpBillsCache` with the D1 binding from `env.DB`
3. **And** bills refresh runs on every cron invocation; legislators refresh runs **only** on the daily trigger (`event.cron === '0 6 * * *'`)
4. **And** the handler uses `ctx.waitUntil()` to prevent the Worker from terminating before refresh completes
5. **And** errors from warmUp functions are caught and logged (not propagated — a rejection inside `ctx.waitUntil` would terminate the isolate)

6. **Given** `wrangler dev --test-scheduled` is running **when** `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"` is called **then** the scheduled handler executes and populates the local D1 simulation
7. **And** the handler logs completion via the pino logger with a `source` field

8. **Given** node-cron is still present in index.ts (not yet decommissioned) **when** `pnpm --filter mcp-server dev` is run (Node.js path) **then** node-cron scheduled refresh still runs as before (index.ts and refresh.ts are untouched)

9. **Given** the Workers path after this story **when** inspected **then** zero `node-cron` references exist in `worker.ts` or `app.ts`

10. **Given** `pnpm --filter mcp-server test` is run **when** tests execute **then** all existing tests still pass and new scheduled handler tests pass
11. **And** `pnpm --filter mcp-server typecheck` passes with zero errors
12. **And** `pnpm --filter mcp-server lint` passes with zero errors

## Tasks / Subtasks

- [x] Task 1: Update `wrangler.toml` cron triggers (AC 1)
  - [x] Change `crons = []` to `crons = ["0 6 * * *", "0 * * * *"]`

- [x] Task 2: Add `initWorkerEnv` to `env.ts` (prerequisite for Tasks 3–4)
  - [x] Export `initWorkerEnv(workerEnv: Env): void` — sets `_env` from Workers bindings (idempotent — no-op if already set)
  - [x] Implementation: map Workers bindings to the internal `Env` shape; default `PORT` to `3001` if falsy; default `NODE_ENV` to `'production'` if not a valid enum value
  - [x] This enables `getEnv()` (used by logger and `UtahLegislatureProvider`) to work in the Workers runtime without `process.env`

- [x] Task 3: Implement the `scheduled` handler in `worker.ts` (AC 2–5, 7, 9)
  - [x] Add imports: `initWorkerEnv` from `./env.js`; `warmUpLegislatorsCache`, `warmUpBillsCache` from `./cache/refresh.js`; `UtahLegislatureProvider` from `./providers/utah-legislature.js`; `logger` from `./lib/logger.js`
  - [x] Call `initWorkerEnv(env)` at the start of the `scheduled` handler (sets up `_env` so logger + provider work)
  - [x] Also call `initWorkerEnv(env)` at the start of the `fetch` handler (fixes the same latent issue for the fetch path)
  - [x] Create provider: `const provider = new UtahLegislatureProvider()` (constructor calls `getEnv()` which now works after `initWorkerEnv`)
  - [x] Wrap all async work in `ctx.waitUntil(...)` using an IIFE async function
  - [x] Inside the IIFE: conditionally `await warmUpLegislatorsCache(env.DB, provider)` if `event.cron === '0 6 * * *'`, then always `await warmUpBillsCache(env.DB, provider)`
  - [x] Log success after each warmUp: `logger.info({ source: 'cache' }, 'Legislators cache refreshed via cron trigger')` / `logger.info({ source: 'cache', sessions }, 'Bills cache refreshed via cron trigger')`
  - [x] Catch errors at the IIFE level and log: `logger.error({ source: 'cache', err }, 'Scheduled cache refresh failed')`
  - [x] Change `scheduled` return type from `void` to `void` (no change needed — `ctx.waitUntil` accepts a Promise; the handler itself is synchronous)

- [x] Task 4: Add scheduled handler tests in `worker.test.ts` (AC 10–12)
  - [x] Add `vi.mock('./cache/refresh.js', ...)` with `warmUpLegislatorsCache: vi.fn().mockResolvedValue(undefined)` and `warmUpBillsCache: vi.fn().mockResolvedValue(['2026GS'])`
  - [x] Add `vi.mock('./providers/utah-legislature.js', ...)` with `UtahLegislatureProvider: vi.fn()`
  - [x] Add `vi.mock('./lib/logger.js', ...)` with logger stubs
  - [x] Import `warmUpLegislatorsCache`, `warmUpBillsCache` (cast as mocks) for assertions
  - [x] Hourly trigger test: call `worker.scheduled({ cron: '0 * * * *' } as ScheduledEvent, mockEnv, mockCtx)`, await waitUntil promise, assert `warmUpBillsCache` called with `mockEnv.DB`, assert `warmUpLegislatorsCache` NOT called
  - [x] Daily trigger test: call with `{ cron: '0 6 * * *' }`, assert BOTH `warmUpLegislatorsCache` AND `warmUpBillsCache` called with `mockEnv.DB`
  - [x] Error test: configure `warmUpBillsCache` to reject, await waitUntil, assert `logger.error` called with `expect.objectContaining({ source: 'cache' })` and message containing `'Scheduled cache refresh failed'`
  - [x] `ctx.waitUntil` test: create `mockCtx = { waitUntil: vi.fn() }`, verify `mockCtx.waitUntil` was called once

- [x] Task 5: Final verification
  - [x] `pnpm --filter mcp-server test` — all 218 tests pass (17/17 files)
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server lint` — zero errors
  - [x] `wrangler deploy --dry-run` from `apps/mcp-server/` — bundle compiles without errors
  - [x] `pnpm --filter mcp-server dev` (Node.js path) — index.ts and refresh.ts untouched; node-cron scheduling intact

## Dev Notes

### Critical: The `getEnv()` / Worker Env Problem

**Problem:** `UtahLegislatureProvider`, `gis.ts`, and `logger.ts` all call `getEnv()`. This function returns `_env` which is only set by `validateEnv()`. `validateEnv()` reads from `process.env` and is only called in `index.ts` (Node.js path). In the Workers path (`worker.ts`), `validateEnv()` is NEVER called — so `getEnv()` throws `'getEnv() called before validateEnv()'` on first use.

**Impact without fix:**
- `fetch` handler: logger middleware throws on every real request
- `scheduled` handler (this story): throws immediately when `UtahLegislatureProvider` is constructed

**The fix — `initWorkerEnv` in `env.ts`:**

```ts
// Add to env.ts after validateEnv():
export function initWorkerEnv(workerEnv: Env): void {
  if (_env) return  // idempotent — no-op if already initialized
  _env = {
    PORT: Number(workerEnv.PORT) || 3001,
    NODE_ENV: (['development', 'production', 'test'] as const).includes(
      workerEnv.NODE_ENV as 'development' | 'production' | 'test'
    )
      ? (workerEnv.NODE_ENV as 'development' | 'production' | 'test')
      : 'production',
    UTAH_LEGISLATURE_API_KEY: workerEnv.UTAH_LEGISLATURE_API_KEY ?? '',
    UGRC_API_KEY: workerEnv.UGRC_API_KEY ?? '',
  }
}
```

**Why `Env` (the Workers type) is available in `env.ts`:** The `Env` interface is declared globally in `worker-configuration.d.ts` — it's accessible everywhere without import.

**Call `initWorkerEnv` in worker.ts:**

```ts
fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
  initWorkerEnv(env)   // ← add this line (fixes logger + provider for all fetch requests)
  if (!env.DB) { ... }
  // ... rest unchanged
},
scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
  initWorkerEnv(env)   // ← required: logger and UtahLegislatureProvider need _env set
  // ... implementation
}
```

### `scheduled` Handler Implementation

```ts
scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
  initWorkerEnv(env)
  const provider = new UtahLegislatureProvider()
  ctx.waitUntil(
    (async () => {
      if (event.cron === '0 6 * * *') {
        await warmUpLegislatorsCache(env.DB, provider)
        logger.info({ source: 'cache' }, 'Legislators cache refreshed via cron trigger')
      }
      const sessions = await warmUpBillsCache(env.DB, provider)
      logger.info({ source: 'cache', sessions }, 'Bills cache refreshed via cron trigger')
    })().catch((err: unknown) => {
      logger.error({ source: 'cache', err }, 'Scheduled cache refresh failed')
    })
  )
}
```

**Why `.catch` outside the IIFE (not inside):** `ctx.waitUntil` receives a Promise. If that Promise rejects, it's an unhandled rejection in the Worker isolate. The `.catch` on the IIFE ensures the Promise always resolves (never rejects). `.catch` must be applied before passing to `ctx.waitUntil`.

**Cron discrimination logic:**
- `event.cron === '0 6 * * *'` → daily 6 AM UTC trigger: run legislators + bills
- `event.cron === '0 * * * *'` → hourly trigger: run bills only
- Both cron entries fire independently even at 6 AM — they are separate invocations with distinct `event.cron` strings

### Worker.ts Imports After This Story

```ts
import { app, setupMcpServer } from './app.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'
import { initWorkerEnv } from './env.js'
import { warmUpLegislatorsCache, warmUpBillsCache } from './cache/refresh.js'
import { UtahLegislatureProvider } from './providers/utah-legislature.js'
import { logger } from './lib/logger.js'
```

No `node-cron` import — that stays in `index.ts` only.

### Test Structure for `worker.test.ts`

The existing test file structure is a `describe('worker fetch handler', ...)` block. Add a new `describe('worker scheduled handler', ...)` block:

```ts
// Mocks — add to top of file (vi.mock calls must be at module top level)
vi.mock('./cache/refresh.js', () => ({
  warmUpLegislatorsCache: vi.fn().mockResolvedValue(undefined),
  warmUpBillsCache: vi.fn().mockResolvedValue(['2026GS']),
  // keep existing scheduler exports (scheduleLegislatorsRefresh etc.) as passthrough
  scheduleLegislatorsRefresh: vi.fn(),
  scheduleBillsRefresh: vi.fn(),
}))
vi.mock('./providers/utah-legislature.js', () => ({
  UtahLegislatureProvider: vi.fn().mockImplementation(() => ({})),
}))
vi.mock('./lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))
```

**Test env setup:**

```ts
// In the scheduled handler tests, use a minimal mock env
const mockDb = {} as D1Database
const mockEnv = {
  DB: mockDb,
  UTAH_LEGISLATURE_API_KEY: 'test-key',
  UGRC_API_KEY: 'test-ugrc-key',
  PORT: '3001',
  NODE_ENV: 'test',
} as Env
```

**ctx.waitUntil mock — capture and await the Promise:**

```ts
let capturedPromise: Promise<void> | undefined
const mockCtx = {
  waitUntil: vi.fn((p: Promise<void>) => { capturedPromise = p }),
} as unknown as ExecutionContext
```

After calling `worker.scheduled(event, mockEnv, mockCtx)`, do `await capturedPromise` to let the async work complete before asserting.

**Key assertions pattern:**
```ts
// Error path key phrase (for toContain assertions):
expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
  expect.objectContaining({ source: 'cache' }),
  expect.stringContaining('Scheduled cache refresh failed'),  // KEY PHRASE
)
```

**IMPORTANT:** In the tests, `vi.mock` calls hoist to the top of the file (Vitest behavior). Import the mocked functions AFTER the mock declarations to get the mock instances:
```ts
import { warmUpLegislatorsCache, warmUpBillsCache } from './cache/refresh.js'
// After vi.mock('./cache/refresh.js'), this gives you the vi.fn() mocks
```

### Node.js Path — Zero Changes

Do NOT modify any of these files:
- `src/index.ts` — node-cron scheduling remains at lines 104–105
- `src/cache/refresh.ts` — `scheduleLegislatorsRefresh` and `scheduleBillsRefresh` remain intact
- `src/app.ts` — unchanged
- `src/cache/*.ts` — unchanged
- `src/tools/*.ts` — unchanged

### Local Testing with wrangler dev

After implementation:
```sh
# Start dev server with scheduled endpoint enabled
cd apps/mcp-server
wrangler dev --test-scheduled

# In another terminal — trigger hourly bills refresh
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
# Expected: 200, D1 bills table populated

# Trigger daily legislators + bills refresh
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"
# Expected: 200, D1 legislators + bills tables populated
```

Note: `--test-scheduled` flag is required for `/__scheduled` endpoint to be active.

### Architecture Note — Existing ESLint Boundary Rules

CLAUDE.md rule: `console.log` FORBIDDEN in `apps/mcp-server/` — use `logger.*` only. All new log calls must use `logger.info` / `logger.error` from `./lib/logger.js`. The scheduled handler's error message must use `logger.error` (not `console.error`).

CLAUDE.md rule: No `node-cron` in `worker.ts` or `app.ts`. After this story, `node-cron` must be confined to `index.ts` only (via `refresh.ts` imports).

### `initWorkerEnv` Idempotency Guarantee

In Cloudflare Workers, a single isolate handles multiple requests sequentially. The `_env` module-level variable persists across requests within the same isolate. `initWorkerEnv` checks `if (_env) return` — so the second call on the same isolate is a no-op. This is safe because `env` bindings (secrets, vars) are constant within an isolate's lifetime.

### 9.2 Completion Notes That Impact 9.3

From Story 9.2 implementation:
- `warmUpLegislatorsCache(db, provider)` and `warmUpBillsCache(db, provider)` are both `async` functions accepting `D1Database` as first param — correct pattern for scheduled handler
- `UtahLegislatureProvider` constructor calls `getEnv().UTAH_LEGISLATURE_API_KEY` — will work after `initWorkerEnv(env)` is called
- `refresh.ts` has a `node-cron` import at line 6 — this is fine because `worker.ts` does NOT import `refresh.ts`; the scheduled handler only imports `warmUpLegislatorsCache` and `warmUpBillsCache` from it (tree-shaking ensures `node-cron` is not bundled into the Workers output because `schedule` is only used by the `scheduleLegislatorsRefresh`/`scheduleBillsRefresh` functions which the Workers path never calls)

### wrangler.toml — Expected Final State

```toml
name = "on-record-mcp"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "on-record-cache"
database_id = "877ea9f0-a442-4bbd-81a4-2701bc29a143"

[triggers]
crons = ["0 6 * * *", "0 * * * *"]
```

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/wrangler.toml` | MODIFY | `crons = ["0 6 * * *", "0 * * * *"]` |
| `apps/mcp-server/src/env.ts` | MODIFY | Add `initWorkerEnv(workerEnv: Cloudflare.Env): void` export |
| `apps/mcp-server/src/worker.ts` | MODIFY | Implement `scheduled` handler; call `initWorkerEnv` in both `fetch` and `scheduled`; add imports |
| `apps/mcp-server/src/worker.test.ts` | MODIFY | Add `describe('worker scheduled handler', ...)` block with hourly/daily/error/waitUntil tests |
| `apps/mcp-server/src/workers-pool-setup.ts` | CREATE | Global vitest setup: mocks `node-cron` for cloudflare pool to prevent miniflare crash on worker init |
| `apps/mcp-server/vitest.config.mts` | MODIFY | Add `setupFiles: ['src/workers-pool-setup.ts']` to workers pool project |
| `apps/mcp-server/src/cache/refresh.ts` | NO CHANGE | node-cron schedulers untouched |
| `apps/mcp-server/src/index.ts` | NO CHANGE | Node.js path untouched |
| `apps/mcp-server/src/app.ts` | NO CHANGE | |
| `apps/mcp-server/src/providers/utah-legislature.ts` | NO CHANGE | Constructor unchanged; works via `initWorkerEnv` |

## Dev Agent Record

### Completion Notes

Implemented Cloudflare Cron Trigger scheduler to replace the node-cron scheduled refresh for the Workers path.

Key implementation decisions:
- `initWorkerEnv(workerEnv: Cloudflare.Env)` added to `env.ts` using `Cloudflare.Env` (not the local `Env` type alias) to avoid type shadowing with the zod-inferred type.
- `initWorkerEnv` called in both `fetch` and `scheduled` handlers to ensure `getEnv()` works for logger and `UtahLegislatureProvider` constructor in the Workers runtime.
- `ctx.waitUntil` pattern: IIFE async function with `.catch()` applied before passing to `waitUntil` — ensures the promise always resolves (never rejects) even on error.
- **Test environment fix (non-obvious):** `cache/refresh.ts` imports `node-cron` at top level. When `worker.ts` statically imports `warmUpLegislatorsCache` from `refresh.ts`, the cloudflare test pool loads `node-cron` during worker initialization for every test file — crashing miniflare for `cache/bills.test.ts`, `cache/legislators.test.ts`, `cache/schema.test.ts`, and `cache/sessions.test.ts`. Solution: created `workers-pool-setup.ts` with a global `vi.mock('node-cron', ...)` registered via `vitest.config.mts` `setupFiles`, so `node-cron` is always mocked in the cloudflare workers pool without modifying any existing test files.
- `UtahLegislatureProvider` mock uses `vi.fn()` (not `vi.fn().mockImplementation(() => ({}))`) because arrow functions cannot be used as constructors with `new`.

Tests: 5 new scheduled handler tests (hourly/daily/error/waitUntil/logging). All 218 tests pass (213 existing + 5 new).

### Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-05 | Implemented scheduled handler, initWorkerEnv, cron triggers, tests | Story 9.3 implementation |
