# Story 9.7: Remove Node.js Entrypoint and Legacy Server Artifacts

Status: done

**Depends on:** Story 9.6 complete (McpAgent migration)

## Story

As an **operator**,
I want all Node.js-specific code removed from the mcp-server,
So that the codebase has a single entrypoint (`worker.ts`), no Node.js-runtime dependencies, and no `process.env`-based singleton bridging that was only needed for the dual-runtime era.

## Background

Before the Cloudflare Workers migration (Epic 9), the mcp-server ran as a Node.js/Hono HTTP server. To support both runtimes, a `getEnv()`/`validateEnv()`/`initWorkerEnv()` singleton was built in `env.ts` to bridge `process.env` (Node.js) and Cloudflare bindings (Workers). Story 9.6 completed the McpAgent migration, making `worker.ts` the sole production entrypoint. This story removes all artifacts that existed solely for the Node.js path, and refactors the remaining code to use `this.env` (via McpAgent) and explicit parameter passing — eliminating the singleton.

## Acceptance Criteria

### Files Deleted

1. **Given** story 9.6 is done **when** this story completes **then** the following files are deleted:
   - `src/index.ts` — Node.js entrypoint
   - `src/env.ts` — `validateEnv`/`getEnv`/`initWorkerEnv` singleton
   - `src/env.test.ts` — tests for deleted `env.ts`
   - `src/app.ts` — shared Hono app (only served the Node.js path after 9.6)
   - `src/app.test.ts` — tests for deleted `app.ts`
   - `src/middleware/rate-limit.ts` — `hono-rate-limiter` middleware (Node.js path only)

2. **Given** `src/middleware/logging.ts` and `src/middleware/cors.ts` **when** they are only used by the deleted `app.ts` **then** they are also deleted; if any code in the Workers path still uses them, they remain

### Package Removals

3. **Given** `apps/mcp-server/package.json` **when** this story completes **then** the following are removed from `dependencies`:
   - `@hono/node-server` — Node.js HTTP adapter for Hono
   - `better-sqlite3` — synchronous SQLite (D1 replaced this in story 9.2)
   - `hono-rate-limiter` — Hono middleware-based rate limiter (CF Rate Limiting replaced this in story 9.4)
   - `hono` — if no remaining code in `worker.ts` or `mcp-agent.ts` imports it after app.ts is deleted

4. **Given** `devDependencies` **when** this story completes **then** the following are removed:
   - `@types/better-sqlite3` — types for removed package
   - `tsx` — used only by the deleted `dev` script

5. **Given** `pnpm install` is run after package.json changes **then** `pnpm-lock.yaml` is updated and CI produces no `ERR_PNPM_OUTDATED_LOCKFILE` error

### Scripts Updated

6. **Given** `package.json` scripts **when** this story completes **then**:
   - `"dev"` is changed from `"tsx watch --env-file=.env src/index.ts"` to `"wrangler dev"`
   - `"start"` is removed (was `"node dist/index.js"`)
   - `"build"` is removed (was `"tsc"` — `typecheck` script covers type checking; wrangler bundles for deploy)

### `getEnv()` Eliminated

7. **Given** `src/lib/gis.ts` **when** this story completes **then**:
   - `getEnv()` import is removed
   - `resolveAddressToDistricts` (or whichever exported function uses `UGRC_API_KEY`) accepts `apiKey: string` as an explicit parameter
   - The function does NOT call `getEnv()` internally

8. **Given** `src/providers/utah-legislature.ts` **when** this story completes **then**:
   - `getEnv()` import is removed
   - The constructor accepts `apiKey: string` as an explicit parameter: `constructor(apiKey: string)`
   - `this.apiKey` is set from the parameter, not from `getEnv()`

9. **Given** `src/lib/logger.ts` **when** this story completes **then**:
   - `getEnv()` import is removed
   - The logger is always initialized with `level: 'info'` and no pino-pretty transport (Workers runtime does not support pino-pretty's transform stream; `wrangler tail` handles log viewing)

10. **Given** `src/mcp-agent.ts` **when** this story completes **then**:
    - `initWorkerEnv(this.env)` import and call are removed
    - `new UtahLegislatureProvider()` is replaced with `new UtahLegislatureProvider(this.env.UTAH_LEGISLATURE_API_KEY)`
    - API keys are passed explicitly to tool registration functions that need them

11. **Given** `src/worker.ts` **when** this story completes **then**:
    - `initWorkerEnv` import and call are removed from both `fetch` and `scheduled` handlers
    - `new UtahLegislatureProvider()` in `scheduled` is replaced with `new UtahLegislatureProvider(env.UTAH_LEGISLATURE_API_KEY)`

### Tests Updated

12. **Given** tests that mocked `getEnv` (`resolve-address.test.ts`, `gis.test.ts`, `utah-legislature.test.ts`) **when** this story completes **then**:
    - `vi.mock('../env.js', ...)` or `vi.mock('../../env.js', ...)` blocks are removed
    - Tests pass API keys as direct constructor/function arguments instead
    - No test references `getEnv`, `validateEnv`, or `initWorkerEnv`

### Quality Gates

13. **Given** all changes are applied **when** `pnpm --filter mcp-server test` is run **then** all tests pass
14. **And** `pnpm --filter mcp-server typecheck` passes with zero errors
15. **And** `pnpm --filter mcp-server lint` passes with zero errors
16. **And** `wrangler deploy --dry-run` from `apps/mcp-server/` bundles successfully with no errors

## Tasks / Subtasks

- [x] Task 1: Refactor `gis.ts` to accept explicit `apiKey` parameter (AC 7)
  - [x] Read `src/lib/gis.ts` and `src/tools/resolve-address.ts` to understand the full call chain
  - [x] Add `apiKey: string` parameter to whichever exported function currently calls `getEnv().UGRC_API_KEY`
  - [x] Remove `getEnv` import from `gis.ts`
  - [x] Update `resolve-address.ts` tool registration to pass `env.UGRC_API_KEY` through (it already receives `env` or `env.DB` from `mcp-agent.ts` — confirm the signature)
  - [x] Update `gis.test.ts`: remove `vi.mock('../env.js', ...)`, pass apiKey directly as test string

- [x] Task 2: Refactor `UtahLegislatureProvider` constructor (AC 8)
  - [x] Change `constructor()` → `constructor(apiKey: string)` and set `this.apiKey = apiKey`
  - [x] Remove `getEnv` import from `utah-legislature.ts`
  - [x] Update `src/mcp-agent.ts`: `new UtahLegislatureProvider(this.env.UTAH_LEGISLATURE_API_KEY)`
  - [x] Update `src/worker.ts` scheduled handler: `new UtahLegislatureProvider(env.UTAH_LEGISLATURE_API_KEY)`
  - [x] Check `src/cache/refresh.ts` — if it constructs `UtahLegislatureProvider`, update those call sites too
  - [x] Update `utah-legislature.test.ts`: remove `vi.mock('../env.js', ...)`, pass test apiKey to constructor

- [x] Task 3: Simplify `logger.ts` (AC 9)
  - [x] Remove `getEnv` import
  - [x] Replace dynamic level/transport logic with: `level: 'info'`, no `transport` block
  - [x] Keep lazy Proxy pattern (it's still correct for ESM import ordering)
  - [x] Check if `pino-pretty` is imported anywhere else; if not, remove from devDependencies

- [x] Task 4: Remove `initWorkerEnv` from `mcp-agent.ts` and `worker.ts` (AC 10–11)
  - [x] `mcp-agent.ts`: delete `initWorkerEnv(this.env)` call and its import
  - [x] `worker.ts`: delete `initWorkerEnv(env)` calls in `fetch` and `scheduled`, delete its import

- [x] Task 5: Delete Node.js-only files (AC 1–2)
  - [x] Delete `src/index.ts`
  - [x] Delete `src/env.ts`
  - [x] Delete `src/env.test.ts`
  - [x] Delete `src/app.ts` (confirm it's not imported anywhere after 9.6)
  - [x] Delete `src/app.test.ts`
  - [x] Delete `src/middleware/rate-limit.ts`
  - [x] Evaluate `src/middleware/logging.ts` and `src/middleware/cors.ts` — delete if no remaining imports

- [x] Task 6: Remove packages and update scripts (AC 3–6)
  - [x] Remove from `dependencies`: `@hono/node-server`, `better-sqlite3`, `hono-rate-limiter`
  - [x] Determine if `hono` is still imported anywhere in the remaining Workers-path code — if not, remove it too
  - [x] Remove from `devDependencies`: `@types/better-sqlite3`, `tsx`
  - [x] Optionally remove `pino-pretty` from devDependencies if logger.ts no longer uses it
  - [x] Update `scripts.dev` → `"wrangler dev"`
  - [x] Remove `scripts.start` and `scripts.build`
  - [x] Run `pnpm install` from monorepo root and commit updated `pnpm-lock.yaml`

- [x] Task 7: Final verification (AC 13–16)
  - [x] `pnpm --filter mcp-server test` — all tests pass
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server lint` — zero errors (ESLint should flag no unused imports, no `getEnv` references)
  - [x] `wrangler deploy --dry-run` — bundles without errors

## Dev Notes

### Execution order matters

Do refactors (Tasks 1–4) before deletions (Task 5). Deleting `env.ts` while code still imports it will break typecheck. Refactor all callers first, confirm typecheck passes, then delete.

### `@types/node` — evaluate don't assume

After removing `@hono/node-server`, `tsx`, and `index.ts`, `@types/node` may still be needed by `pino`, `vitest`, or other deps. Run `pnpm --filter mcp-server typecheck` after removing it to check — if errors appear, keep it.

### Hono — confirm before removing

After 9.6, check the actual final state of `worker.ts` and `mcp-agent.ts` for any Hono imports. If zero Hono imports remain, remove it. If `worker.ts` still uses `Hono` for health check routing, keep it — but this seems unlikely given 9.6's Task 3 routes `/health` inline.

### `resolve-address.ts` tool signature

The `registerResolveAddressTool` function signature after 9.6 likely accepts `(server: McpServer, env: Cloudflare.Env)` or `(server: McpServer, apiKey: string)`. Confirm before modifying `gis.ts`. The goal is: `UGRC_API_KEY` comes from an explicit argument, not from a module-level singleton call.

### `UtahLegislatureProvider` constructor change — cache tests

Cache-layer tests (`legislators.test.ts`, `bills.test.ts`) that construct `UtahLegislatureProvider` directly will need the `apiKey` argument added. These tests should be mocking at the `LegislatureDataProvider` interface boundary (per CLAUDE.md), so they may already use the interface mock instead of the concrete class. Verify and update as needed.

### `logger.ts` — pino-pretty in Workers

pino-pretty uses Node.js streams (`stream.Transform`) which are not available in the Cloudflare Workers runtime. Even with `nodejs_compat`, this transport fails. The logger should unconditionally use `level: 'info'` with no `transport` block in the Workers-only world. `wrangler tail` and Cloudflare observability dashboard provide log access in production. `wrangler dev` surfaces logs in the terminal.

### `env.ts` type conflict resolved

`env.ts` exported its own `Env` type (from zod schema) which conflicted with `Cloudflare.Env` from `worker-configuration.d.ts`. After deleting `env.ts`, the canonical `Env` / `Cloudflare.Env` from `worker-configuration.d.ts` is the only one — no renaming needed in `worker.ts` or `mcp-agent.ts`.

### Workers-pool-setup.ts

Check `src/workers-pool-setup.ts` — it was previously used to set up Vitest Workers pool. After the full cleanup, verify it doesn't reference any deleted modules and that Vitest config still references it correctly.

### `better-sqlite3` was already functionally dead

Story 9.2 migrated all cache queries to D1. `better-sqlite3` was kept in `package.json` because `index.ts` (Node.js path) still imported and used it for local dev. With `index.ts` deleted, `better-sqlite3` has no importers — safe to remove.

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/src/index.ts` | DELETED | Node.js entrypoint |
| `apps/mcp-server/src/env.ts` | DELETED | `validateEnv`/`getEnv`/`initWorkerEnv` singleton |
| `apps/mcp-server/src/env.test.ts` | DELETED | Tests for deleted env.ts |
| `apps/mcp-server/src/app.ts` | DELETED | Shared Hono app (Node.js path only after 9.6) |
| `apps/mcp-server/src/app.test.ts` | DELETED | Tests for deleted app.ts |
| `apps/mcp-server/src/middleware/rate-limit.ts` | DELETED | hono-rate-limiter middleware |
| `apps/mcp-server/src/middleware/rate-limit.test.ts` | DELETED | Tests for deleted rate-limit.ts |
| `apps/mcp-server/src/middleware/logging.ts` | DELETED | Only used by deleted app.ts |
| `apps/mcp-server/src/middleware/logging.test.ts` | DELETED | Tests for deleted logging.ts |
| `apps/mcp-server/src/middleware/cors.ts` | DELETED | Only used by deleted app.ts |
| `apps/mcp-server/src/middleware/cors.test.ts` | DELETED | Tests for deleted cors.ts |
| `apps/mcp-server/src/cache/db.ts` | DELETED | better-sqlite3 helper, only used by deleted index.ts |
| `apps/mcp-server/src/lib/gis.ts` | MODIFIED | Accept `apiKey: string` param; remove `getEnv` |
| `apps/mcp-server/src/lib/gis.test.ts` | MODIFIED | Remove `getEnv` mock; pass apiKey directly |
| `apps/mcp-server/src/lib/logger.ts` | MODIFIED | Remove `getEnv`; hardcode `level: 'info'`, no pino-pretty |
| `apps/mcp-server/src/providers/utah-legislature.ts` | MODIFIED | `constructor(apiKey: string)` |
| `apps/mcp-server/src/providers/utah-legislature.test.ts` | MODIFIED | Remove `getEnv` mock; pass apiKey to constructor |
| `apps/mcp-server/src/tools/resolve-address.ts` | MODIFIED | Accept `apiKey` param; pass to gis.ts |
| `apps/mcp-server/src/tools/resolve-address.test.ts` | MODIFIED | Remove `getEnv` mock; pass apiKey to registration |
| `apps/mcp-server/src/mcp-agent.ts` | MODIFIED | Remove `initWorkerEnv`; pass `UGRC_API_KEY` to `registerResolveAddressTool` |
| `apps/mcp-server/src/worker.ts` | MODIFIED | Remove `initWorkerEnv`; pass `UTAH_LEGISLATURE_API_KEY` to `UtahLegislatureProvider` |
| `apps/mcp-server/package.json` | MODIFIED | Removed 6 packages; updated/removed scripts |
| `pnpm-lock.yaml` | REGENERATED | Updated after `pnpm install` |

## Dev Agent Record

### Completion Notes

Implemented story 9.7 in order: refactors (Tasks 1–4) before deletions (Task 5), as specified in Dev Notes.

**Task 1** — `gis.ts`: Added `apiKey: string` as third parameter to `resolveAddressToDistricts`. Removed `getEnv` import. Updated `resolve-address.ts` to accept `apiKey: string` and pass it through. Updated `mcp-agent.ts` to pass `this.env.UGRC_API_KEY`. Removed `vi.mock('../env.js', ...)` from both `gis.test.ts` and `resolve-address.test.ts`.

**Task 2** — `utah-legislature.ts`: Changed `constructor()` to `constructor(apiKey: string)`. Removed `getEnv` import. `cache/refresh.ts` uses `LegislatureDataProvider` interface so no changes needed there. Updated `worker.ts` scheduled handler to pass `env.UTAH_LEGISLATURE_API_KEY`. Removed `vi.mock('../env.js', ...)` from `utah-legislature.test.ts`; updated `new UtahLegislatureProvider()` to `new UtahLegislatureProvider('testapikey123')`.

**Task 3** — `logger.ts`: Removed `getEnv` import. Replaced conditional level/transport logic with unconditional `level: 'info'`, no `transport` block. Lazy Proxy pattern retained.

**Task 4** — Removed `initWorkerEnv` import and calls from both `mcp-agent.ts` and `worker.ts`.

**Task 5** — Deleted: `index.ts`, `env.ts`, `env.test.ts`, `app.ts`, `app.test.ts`, `middleware/rate-limit.ts`, `middleware/rate-limit.test.ts`, `middleware/logging.ts`, `middleware/logging.test.ts`, `middleware/cors.ts`, `middleware/cors.test.ts`. Also deleted `cache/db.ts` (discovered: only imported by deleted `index.ts`, still had `better-sqlite3` import causing typecheck error).

**Task 6** — Removed from `dependencies`: `@hono/node-server`, `better-sqlite3`, `hono-rate-limiter`, `hono` (no imports remain). Removed from `devDependencies`: `@types/better-sqlite3`, `tsx`, `pino-pretty`. Updated `scripts.dev` → `"wrangler dev"`. Removed `scripts.start` and `scripts.build`. Ran `pnpm install` — lockfile updated, -49/+18 packages.

**Task 7** — All quality gates pass: 192 tests pass, typecheck zero errors, lint zero errors, `wrangler deploy --dry-run` bundles successfully (1564 KiB / 276 KiB gzip).

### Change Log

- Removed Node.js entrypoint (`index.ts`) and `env.ts` singleton — 2026-04-07
- Deleted Hono Node.js middleware (`app.ts`, `middleware/logging.ts`, `middleware/cors.ts`, `middleware/rate-limit.ts`) and their tests — 2026-04-07
- Deleted `cache/db.ts` (better-sqlite3 Node.js helper) — 2026-04-07
- Refactored `gis.ts`, `utah-legislature.ts`, `logger.ts` to remove `getEnv` dependency — 2026-04-07
- Removed `initWorkerEnv` calls from `mcp-agent.ts` and `worker.ts` — 2026-04-07
- Removed 6 Node.js-only packages from `package.json`; updated scripts — 2026-04-07
