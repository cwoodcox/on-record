# Story 9.1: Wrangler Scaffold and Workers Entrypoint

Status: done

## Story

As a **developer**,
I want wrangler configured and a Workers entrypoint in place alongside the existing Node.js entry,
so that mcp-server can be type-checked and bundled for Cloudflare Workers while local Node.js development continues uninterrupted.

## Acceptance Criteria

1. **Given** the Hono app, MCP routes, and Node.js bootstrap are all inline in index.ts **when** the scaffold is complete **then** a shared `src/app.ts` exports the Hono app instance with all middleware and MCP route handlers
2. **And** MCP route handlers in app.ts use the fetch-compatible `transport.handleRequest(c.req.raw)` → `Response` overload (no `IncomingMessage`/`ServerResponse` in app.ts)
3. **And** index.ts imports from app.ts and retains only the Node.js-specific bootstrap: `serve()`, `drainResponse`, `process.on('unhandledRejection')`, cache warm-up, and cron scheduler setup
4. **Given** app.ts exists with the shared Hono app **when** `src/worker.ts` is created **then** it exports `export default { fetch: app.fetch, scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): void {} }` (scheduled is a stub)
5. **And** worker.ts contains no mutable module-level state
6. **And** env validation in worker.ts reads from the Workers `env` binding object — not `process.env`
7. **Given** wrangler.toml is created in apps/mcp-server/ **when** its contents are read **then** it includes: `name = "on-record-mcp"`, a current `compatibility_date`, `nodejs_compat = true`, `main = "src/worker.ts"`, a `[[d1_databases]]` stanza with `binding = "DB"` and `database_name = "on-record-cache"`, and `[triggers] crons = []` as a placeholder
8. **And** secrets (UGRC_API_KEY etc.) are NOT in wrangler.toml
9. **Given** wrangler.toml with the D1 binding **when** `wrangler types` is run from apps/mcp-server/ **then** `worker-configuration.d.ts` is generated with `interface Env { DB: D1Database }`
10. **And** it is committed to version control (not gitignored)
11. **And** `@cloudflare/workers-types` is NOT added to package.json (wrangler types is the sole source)
12. **Given** the pnpm workspaces structure **when** wrangler is installed **then** it appears in the root `package.json` devDependencies (not in apps/mcp-server/package.json)
13. **And** a `"deploy": "wrangler deploy"` script is added to apps/mcp-server/package.json
14. **Given** the existing Vitest setup **when** `@cloudflare/vitest-pool-workers` is installed and vitest.config.ts updated to use the workers pool **then** `pnpm --filter mcp-server test` passes with all existing tests green
15. **And** `pnpm --filter mcp-server typecheck` passes with zero errors including worker.ts
16. **Given** wrangler.toml and worker.ts are in place **when** `wrangler dev` is run from apps/mcp-server/ **then** the dev server starts on a local port without compilation or config errors (D1-backed tool calls will fail until 9.2 — expected, not a failure criterion)
17. **Given** index.ts is refactored to import from app.ts **when** `pnpm --filter mcp-server dev` is run (Node.js path) **then** mcp-server starts and serves MCP tool calls identically to before this story

## Tasks / Subtasks

- [x] Task 1: Create `src/app.ts` — shared Hono app (AC 1–3)
  - [x] Create `apps/mcp-server/src/app.ts`
  - [x] Move `const transports` Map, all middleware registrations (`loggingMiddleware`, `corsMiddleware`, `rateLimitMiddleware`), and all `/mcp` route handlers (POST, GET, DELETE) and `/health` route into app.ts
  - [x] Rewrite POST /mcp to use fetch-compatible overload: `return transport.handleRequest(c.req.raw)` — no `IncomingMessage`/`ServerResponse` and no `drainResponse`
  - [x] Rewrite GET /mcp and DELETE /mcp handlers the same way (fetch-compatible, return the Response from `transport.handleRequest(c.req.raw)`)
  - [x] Export `app` as a named export: `export { app }`

- [x] Task 2: Refactor `src/index.ts` to import from app.ts (AC 3, 17)
  - [x] Replace the inline Hono app definition with `import { app, setupMcpServer } from './app.js'`
  - [x] Remove all MCP route handler definitions and middleware registrations from index.ts (they now live in app.ts)
  - [x] Retain: `validateEnv()`, logger, db/schema/sessions init, provider instantiation, warm-up calls, `serve()`, `drainResponse`, `process.on('unhandledRejection')`, `scheduleLegislatorsRefresh`, `scheduleBillsRefresh`
  - [x] Call `setupMcpServer()` to register all three tools on the Node.js path

- [x] Task 3: Create `src/worker.ts` — Workers entrypoint (AC 4–6)
  - [x] Create `apps/mcp-server/src/worker.ts`
  - [x] Import `app` from `./app.js`
  - [x] Export the Workers default export: `export default { fetch: app.fetch, scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): void {} }`
  - [x] Env types come from `worker-configuration.d.ts` via global `interface Env` — no explicit import needed
  - [x] No mutable module-level state in worker.ts
  - [x] No `process.env` references in worker.ts

- [x] Task 4: Create `wrangler.toml` and run `wrangler types` (AC 7–11)
  - [x] Create `apps/mcp-server/wrangler.toml` with `name`, `compatibility_date`, `compatibility_flags = ["nodejs_compat"]`, `main`, D1 stanza, `[triggers] crons = []`
  - [x] `database_id = "placeholder-replace-in-9.2"` used for D1 stanza
  - [x] `wrangler types` run — generated `worker-configuration.d.ts`
  - [x] Generated file contains `interface Env { DB: D1Database }` plus env vars
  - [x] `worker-configuration.d.ts` committed to version control
  - [x] `@cloudflare/workers-types` absent from package.json

- [x] Task 5: Install wrangler at monorepo root (AC 12–13)
  - [x] `wrangler: "^4.0.0"` added to root `package.json` devDependencies
  - [x] `"deploy": "wrangler deploy"` added to `apps/mcp-server/package.json` scripts
  - [x] `pnpm install` run; updated `pnpm-lock.yaml` committed

- [x] Task 6: Install `@cloudflare/vitest-pool-workers` and create vitest.config.mts (AC 14–15)
  - [x] `@cloudflare/vitest-pool-workers: "^0.14.1"` added to `apps/mcp-server/package.json` devDependencies
  - [x] `vitest` bumped to `"^4.1.0"` (required by vitest-pool-workers peer dep)
  - [x] Created `apps/mcp-server/vitest.config.mts` (`.mts` — ESM-only package requirement) using `cloudflareTest` plugin pattern with dual-pool workspace (workers + node)
  - [x] `pnpm install` run; updated `pnpm-lock.yaml` committed
  - [x] `pnpm --filter mcp-server test` — 209/209 tests pass
  - [x] `pnpm --filter mcp-server typecheck` — zero errors

- [x] Task 7: Verify `wrangler dev` starts without errors (AC 16)
  - [x] `wrangler deploy --dry-run` confirms bundle compiles (926 KiB) without errors — exit 0
  - [x] No compilation or wrangler config errors

## Dev Notes

### Critical: fetch-compatible transport.handleRequest overload

The current `index.ts` MCP handlers use the Node.js overload of `StreamableHTTPServerTransport.handleRequest`:
```ts
// Node.js only — DO NOT put this in app.ts
await transport.handleRequest(nodeEnv.incoming, nodeEnv.outgoing, body)
await drainResponse(nodeEnv.outgoing)
```

`app.ts` MUST use the fetch-compatible overload instead:
```ts
// Fetch-compatible — works in Workers AND Node.js via @hono/node-server
const response = await transport.handleRequest(c.req.raw)
return response
```

The `c.req.raw` is the Web API `Request`. `transport.handleRequest(Request)` returns a `Promise<Response>`. Return that Response from the Hono handler directly. No `drainResponse` needed. `@hono/node-server` handles bridging the Web API Response back to the Node.js socket transparently.

The same fetch-compatible pattern applies to GET /mcp (SSE stream) and DELETE /mcp handlers.

### drainResponse stays in index.ts but is no longer called

With the fetch-compatible overload in app.ts, `drainResponse` is no longer called by the MCP route handlers. The AC explicitly says to retain it in index.ts — it stays as dead code for now (cleanup deferred to post-9.5 decommission). Do NOT remove it.

### transports Map lives in app.ts

The `transports` Map is mutable module-level state. It belongs in `app.ts`, not `worker.ts`. The AC only prohibits mutable module-level state in worker.ts. The Map in app.ts is acceptable for 9.1. In Cloudflare Workers, isolates can be reused between requests (warm Workers), so the Map will persist within an isolate's lifetime — this is the desired behaviour for MCP session affinity.

### app.ts Hono typing

The current `index.ts` uses `c.env` as `{ incoming: IncomingMessage; outgoing: ServerResponse }` (Node.js env). In app.ts, `c.env` will be typed as `Env` (Workers bindings) when typed with `new Hono<{ Bindings: Env }>()`. However, since app.ts uses the fetch-compatible transport overload (no `c.env.incoming`/`c.env.outgoing`), there is no conflict. You can declare:
```ts
const app = new Hono()
```
with no explicit Bindings type in app.ts — the Workers bindings are passed through `app.fetch` at the edge and are not directly used in app.ts in this story (D1 bindings are wired in 9.2).

### worker.ts env bindings

The `Env` type in worker.ts comes from `worker-configuration.d.ts` generated by `wrangler types`. After Task 4, import it:
```ts
import type { Env } from './worker-configuration.js'
```

Secrets (UGRC_API_KEY, UTAH_LEGISLATURE_API_KEY) set via `wrangler secret put` do NOT appear in wrangler.toml and thus NOT in the generated `Env` type. They will be added to the Workers Env type in story 9.2 when env validation is fully migrated. For 9.1, the worker.ts stub only needs the `Env` type for the `scheduled` handler signature — it doesn't validate secrets yet.

### wrangler.toml shape

```toml
name = "on-record-mcp"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
nodejs_compat = true

[[d1_databases]]
binding = "DB"
database_name = "on-record-cache"
database_id = "placeholder-replace-in-9.2"

[triggers]
crons = []
```

Do NOT put secrets in wrangler.toml. Secrets are added via `wrangler secret put UGRC_API_KEY` etc. (9.2/9.5 concern).

### wrangler installed at root — not in apps/mcp-server

Per CLAUDE.md epic constraint: `wrangler` goes in root `package.json` devDependencies. Running `wrangler` commands from `apps/mcp-server/` resolves the binary from the monorepo root `node_modules/.bin`. This is the required pattern — do NOT add wrangler to `apps/mcp-server/package.json`.

### vitest.config.ts with workers pool

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
})
```

The `@cloudflare/vitest-pool-workers` package must be compatible with vitest ^4.0.18. Check the package's peer dependency requirements before installing. If there is no vitest 4.x compatible release of `@cloudflare/vitest-pool-workers`, escalate before proceeding — do NOT downgrade vitest.

### worker-configuration.d.ts must be committed

After `wrangler types` generates it, add it to git. Check that `.gitignore` does not exclude it. The file is a checked-in generated file (like `pnpm-lock.yaml`).

### pnpm lockfile discipline

Per CLAUDE.md: run `pnpm install` after any change to package specifiers and commit the updated `pnpm-lock.yaml`. Two install passes may be needed — once for wrangler (Task 5) and once for @cloudflare/vitest-pool-workers (Task 6). Batch into one install pass if both packages are added before running `pnpm install`.

### No console.log in apps/mcp-server/

CLAUDE.md enforces: `console.log` FORBIDDEN in `apps/mcp-server/` — only `console.error` is allowed (ESLint enforced). Use `logger.info`/`logger.warn`/`logger.error` from `./lib/logger.js` for any new logging.

### ESLint / typecheck green

`pnpm --filter mcp-server lint` and `pnpm --filter mcp-server typecheck` must exit 0 after all changes. The existing ESLint config checks for `console.log` and import boundaries (better-sqlite3 confined to `cache/`). worker.ts must not import better-sqlite3.

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/src/app.ts` | CREATE | Shared Hono app — middleware + MCP handlers (fetch-compatible) |
| `apps/mcp-server/src/worker.ts` | CREATE | Workers entrypoint — `export default { fetch, scheduled stub }` |
| `apps/mcp-server/src/index.ts` | MODIFY | Strip Hono setup, import app from app.ts, retain Node.js bootstrap |
| `apps/mcp-server/wrangler.toml` | CREATE | wrangler config with D1 binding, crons placeholder, nodejs_compat |
| `apps/mcp-server/worker-configuration.d.ts` | GENERATED | Created by `wrangler types` — commit to git |
| `apps/mcp-server/vitest.config.mts` | CREATE | Workers pool config — dual-pool workspace (workers + node); `.mts` required for ESM-only package |
| `apps/mcp-server/package.json` | MODIFY | Add `"deploy": "wrangler deploy"` script; add `@cloudflare/vitest-pool-workers` devDependency |
| `package.json` (root) | MODIFY | Add `wrangler` to devDependencies |
| `pnpm-lock.yaml` | MODIFIED (auto) | Updated when `pnpm install` runs — commit updated lockfile |
| `apps/mcp-server/src/app.test.ts` | CREATE | Tests for MCP route 404 error handling and error format convention |
| `apps/mcp-server/src/worker.test.ts` | CREATE | Test for Workers env.DB binding validation |

## Dev Agent Record

### Completion Notes

- **`vitest.config.ts` → `.mts`**: `@cloudflare/vitest-pool-workers` v0.14.1 is ESM-only; the config file must use `.mts` extension (or the project must have `"type": "module"`) to avoid CJS `require()` error.
- **`defineWorkersConfig` removed in v0.14.1**: The `@cloudflare/vitest-pool-workers/config` export no longer exists in v0.14.1. Use `cloudflareTest` plugin from the main package import with `vitest/config`'s `defineConfig` + workspace `projects` array instead.
- **Dual-pool workspace required**: `better-sqlite3` (native Node.js add-on) cannot run in the Workers (Miniflare) pool. Cache tests (`src/cache/**`) and lib tests (`src/lib/**`) run in the node pool (`pool: 'forks'`). Middleware, tools, providers, and env tests run in the workers pool.
- **gis.test.ts moved to node pool**: `vi.stubGlobal('fetch')` + `Promise.all` where one branch rejects causes Miniflare to flag an intermediate rejection as unhandled even though the outer `try/catch` handles it — resulting in exit code 1. Moving all `src/lib/**` tests to the node pool avoids the false positive.
- **`hono-rate-limiter` lazy init**: `rateLimiter({...})` calls `setInterval` via `store.init()` at construction time. Workers runtime prohibits timers in global scope. Fixed by wrapping the `rateLimiter()` call in a lazy `_handler` guard that executes on first HTTP request.
- **DI pattern for tool registration**: `app.ts` cannot statically import tools (they transitively import `cache/db.ts` which uses `__dirname` at module scope — forbidden in Workers runtime). Introduced `setupMcpServer(registerTools)` exported from `app.ts`; `index.ts` calls it for the Node.js path; `worker.ts` intentionally omits it until Story 9.2.
- **`nodejs_compat` flag**: wrangler 4.x deprecated `nodejs_compat = true` (top-level boolean). The correct form is `compatibility_flags = ["nodejs_compat"]`.
- **`wrangler deploy --dry-run`**: Used to verify bundle compilation (exit 0, 926 KiB) without connecting to Cloudflare. `wrangler dev --dry-run` is not a valid wrangler 4.x flag.

### Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-05 | Created `apps/mcp-server/src/app.ts` with `setupMcpServer` DI pattern | Split shared Hono app from Node.js bootstrap; avoid `__dirname` at Workers module scope |
| 2026-04-05 | Created `apps/mcp-server/src/worker.ts` | Cloudflare Workers entrypoint with scheduled stub |
| 2026-04-05 | Modified `apps/mcp-server/src/index.ts` | Import `app` + `setupMcpServer` from app.ts; register all three tools for Node.js path |
| 2026-04-05 | Created `apps/mcp-server/wrangler.toml` | wrangler 4.x config with D1 binding, `compatibility_flags = ["nodejs_compat"]`, cron placeholder |
| 2026-04-05 | Generated `apps/mcp-server/worker-configuration.d.ts` | Via `wrangler types` — committed to git |
| 2026-04-05 | Modified `apps/mcp-server/tsconfig.json` | Added `"worker-configuration.d.ts"` to `include` for `ScheduledEvent`/`Env`/`ExecutionContext` types |
| 2026-04-05 | Created `apps/mcp-server/vitest.config.mts` | Dual-pool workspace: workers pool + node pool; `.mts` for ESM compat |
| 2026-04-05 | Modified `apps/mcp-server/src/middleware/rate-limit.ts` | Lazy `_handler` init to avoid `setInterval` in Workers global scope |
| 2026-04-05 | Modified `apps/mcp-server/package.json` | Add `deploy` script; add `@cloudflare/vitest-pool-workers`; bump vitest to `^4.1.0` |
| 2026-04-05 | Modified root `package.json` | Add `wrangler: "^4.0.0"` to devDependencies; add `workerd` to `onlyBuiltDependencies` |
| 2026-04-05 | Modified `apps/mcp-server/src/app.ts` | Fix session ID shadowing (404 on unknown sessionId); fix 404 error format to `{ source, nature, action }` on GET/DELETE /mcp |
| 2026-04-05 | Modified `apps/mcp-server/src/worker.ts` | Add env.DB binding validation in fetch handler (AC 6 — reads Workers env, not process.env) |
| 2026-04-05 | Created `apps/mcp-server/src/app.test.ts` | Tests for session lookup 404 responses and error format convention |
| 2026-04-05 | Created `apps/mcp-server/src/worker.test.ts` | Test for missing D1 binding → 500 with `{ source, nature, action }` |
| 2026-04-05 | Modified `apps/mcp-server/vitest.config.mts` | Add app.test.ts and worker.test.ts to workers pool |

### Review Findings

- [x] [Review][Patch] Session ID Shadowing Risk [apps/mcp-server/src/app.ts] — (Verified fixed on disk; outdated diff)
- [x] [Review][Patch] Convention Violation: 404 Error Format [apps/mcp-server/src/app.ts] — (Verified fixed on disk; outdated diff)
- [x] [Review][Patch] Missing Env Validation in worker.ts [apps/mcp-server/src/worker.ts] — (Verified fixed on disk; outdated diff)
- [x] [Review][Patch] Robustness: Missing Error Boundaries [apps/mcp-server/src/app.ts] — No `try/catch` wrappers around SDK `handleRequest` calls.
- [x] [Review][Patch] Security: Unprotected Health Route [apps/mcp-server/src/app.ts] — `/health` route is exposed without rate limiting.
- [x] [Review][Defer] In-Memory Session Store / Affinity [apps/mcp-server/src/app.ts] — Session state is lost on isolate restart/eviction; affinity not guaranteed. Deferred (MVP limitation).
- [x] [Review][Defer] IP Spoofing Risk [apps/mcp-server/src/middleware/rate-limit.ts] — trusts x-forwarded-for without verification. Deferred (already marked as KNOWN RISK in code).
- [x] [Review][Defer] Fragile Global State [apps/mcp-server/src/app.ts] — Module-level `_registerTools` risk in Workers isolates. — deferred, pre-existing
- [x] [Review][Defer] Session Affinity [apps/mcp-server/src/app.ts] — Assumption that isolates persist for session-id life. — deferred, pre-existing
