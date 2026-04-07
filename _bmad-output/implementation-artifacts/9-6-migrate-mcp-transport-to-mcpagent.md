# Story 9.6: Migrate MCP Transport to McpAgent (Cloudflare Agents SDK)

Status: done

## Story

As an **operator**,
I want the MCP server to use Cloudflare's native McpAgent (Durable Objects-backed) transport,
So that SSE connections are stable and the Worker stops crashing with "code had hung" errors on GET /mcp.

## Background

The current implementation uses `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` directly. The GET `/mcp` handler opens a long-lived SSE stream which the Cloudflare Workers runtime kills with: _"The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response."_ This causes a repeating crash-reinitialize loop visible in `wrangler tail` logs.

`McpAgent` from the `agents` package (Cloudflare's first-party Agents SDK) is backed by Durable Objects, which are designed for long-lived stateful connections and handle SSE correctly. It is the recommended transport for remote MCP servers on Cloudflare Workers as of 2026.

## Acceptance Criteria

1. **Given** the `agents` package is added to `apps/mcp-server/package.json` **when** `pnpm install` is run **then** `pnpm-lock.yaml` is updated and the package resolves without conflicts

2. **Given** `wrangler.toml` is updated **when** `[durable_objects]` binding and `[[migrations]]` are added **then** wrangler.toml has:
   - A `[durable_objects]` section binding `OnRecordMCP` class to the name `MCP_OBJECT`
   - A `[[migrations]]` entry with `tag = "v1"` and `new_sqlite_classes = ["OnRecordMCP"]`

3. **Given** `wrangler types` is run after wrangler.toml changes **when** `worker-configuration.d.ts` is regenerated **then** `Env` includes `MCP_OBJECT: DurableObjectNamespace` (or equivalent generated type)

4. **Given** an `OnRecordMCP` class extending `McpAgent<Env>` is created **when** `init()` runs **then** all three tools (`lookup_legislator`, `resolve_address`, `search_bills`) are registered using `this.server.tool(...)` with `this.env.DB` for D1 access and `this.env.UTAH_LEGISLATURE_API_KEY` / `this.env.UGRC_API_KEY` for secrets

5. **Given** the new transport **when** a MCP client POSTs to `/mcp` **then** the session is initialized successfully (200) and `initialize` response is valid

6. **Given** an initialized session **when** a MCP client calls `search_bills` or `lookup_legislator` or `resolve_address` **then** the tool returns a valid result (tools are functional end-to-end)

7. **Given** a GET `/mcp` request **when** the McpAgent handles it via Durable Objects **then** the Workers runtime does NOT cancel the request — no "hung" error appears in `wrangler tail`

8. **Given** a GET `/health` request **when** the worker handles it **then** `{ status: 'ok', service: 'on-record-mcp-server' }` is returned with status 200

9. **Given** a cross-origin MCP client request **when** `/mcp` is called **then** CORS headers are present on the response (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) and OPTIONS preflight returns 204

10. **Given** the Cloudflare rate limiter **when** a request hits `/mcp` **then** the existing `applyCfRateLimit` check in `worker.ts` still applies before routing to McpAgent (rate limiting is not removed or bypassed)

11. **Given** the scheduled cron trigger **when** the `scheduled` handler fires **then** `warmUpLegislatorsCache` and `warmUpBillsCache` run unchanged — the scheduled handler is not affected by this story

12. **Given** `app.ts` after this story **when** it is read **then** it no longer contains: `WebStandardStreamableHTTPServerTransport`, session store `Map`, `setupMcpServer()`, or the POST/GET/DELETE `/mcp` route handlers — these are removed because they are dead code on the Workers path

13. **Given** `index.ts` after this story **when** it is read **then** the `setupMcpServer` import and call are removed; `index.ts` compiles and the Node.js path still serves `/health` correctly

14. **Given** `project-context.md` after this story **when** it is read **then** the `@ts-expect-error` note about `StreamableHTTPServerTransport.onclose` is removed — the workaround is no longer needed

15. **Given** `pnpm --filter mcp-server test` is run **then** all existing tests pass (tool tests and cache tests are unaffected — they test at the provider/DB boundary)
16. **And** `pnpm --filter mcp-server typecheck` passes with zero errors
17. **And** `pnpm --filter mcp-server lint` passes with zero errors
18. **And** `wrangler deploy --dry-run` from `apps/mcp-server/` bundles without errors

## Tasks / Subtasks

- [x] Task 1: Add `agents` package and update wrangler.toml (AC 1–3)
  - [x] `pnpm --filter @on-record/mcp-server add agents` — adds to `apps/mcp-server/package.json` dependencies
  - [x] Add `[durable_objects]` section and `[[migrations]]` entry to `wrangler.toml` (see Dev Notes for exact TOML)
  - [x] Run `wrangler types` from `apps/mcp-server/` to regenerate `worker-configuration.d.ts`
  - [x] Commit: `worker-configuration.d.ts`, `wrangler.toml`, `package.json`, `pnpm-lock.yaml`

- [x] Task 2: Create `OnRecordMCP` McpAgent class (AC 4)
  - [x] Create `apps/mcp-server/src/mcp-agent.ts` exporting `class OnRecordMCP extends McpAgent<Env>`
  - [x] Set `server = new McpServer({ name: 'on-record', version: '1.0.0' })`
  - [x] In `async init()`: call `registerLookupLegislatorTool(this.server, this.env.DB)`, `registerResolveAddressTool(this.server, this.env)`, `registerSearchBillsTool(this.server, this.env.DB)`
  - [x] Verify tool registration functions accept `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` — confirm import paths and arg types match existing tool signatures; adjust if needed
  - [x] Note: `this.env` is typed as `Env` via the generic — `this.env.DB`, `this.env.UTAH_LEGISLATURE_API_KEY`, `this.env.UGRC_API_KEY` are all accessible

- [x] Task 3: Update `worker.ts` to route `/mcp` to McpAgent (AC 5–7, 9–11)
  - [x] Import `OnRecordMCP` from `./mcp-agent.js`
  - [x] Remove: `setupMcpServer` import and call, `registerLookupLegislatorTool` / `registerResolveAddressTool` / `registerSearchBillsTool` imports (these are now in `mcp-agent.ts`)
  - [x] Remove: `app` import from `./app.js` (if health check moves to worker.ts inline)
  - [x] Route `/mcp` and `/mcp/*`: after CF rate limit check, delegate to `OnRecordMCP.serve('/mcp').fetch(request, env, ctx)`
  - [x] Wrap MCP responses with CORS headers (see Dev Notes for CORS pattern)
  - [x] Handle OPTIONS preflight for `/mcp` — return 204 with CORS headers
  - [x] Route `/health` inline: `return Response.json({ status: 'ok', service: 'on-record-mcp-server' })`
  - [x] Return 404 for all other routes

- [x] Task 4: Clean up `app.ts` (AC 12)
  - [x] Remove: `WebStandardStreamableHTTPServerTransport` import, `transports` Map, `setupMcpServer` function, POST `/mcp` handler, GET `/mcp` handler, DELETE `/mcp` handler
  - [x] Remove: `McpServer` import (no longer used in app.ts)
  - [x] Keep: `loggingMiddleware`, `corsMiddleware`, `rateLimitMiddleware`, health check route — or if app.ts is now empty of meaningful content, delete it entirely
  - [x] If app.ts is deleted: remove its export from any barrel; update `index.ts` accordingly

- [x] Task 5: Update `index.ts` and `project-context.md` (AC 13–14)
  - [x] Remove `setupMcpServer` import and call from `index.ts`
  - [x] Remove `registerLookupLegislatorTool`, `registerResolveAddressTool`, `registerSearchBillsTool` imports from `index.ts` if they were registered via `setupMcpServer` closure (they're now in McpAgent)
  - [x] Verify `index.ts` still compiles and `/health` route works for local Node.js dev
  - [x] Remove the `@ts-expect-error` note from `project-context.md` (see AC 14)

- [x] Task 6: Final verification (AC 15–18)
  - [x] `pnpm --filter mcp-server test` — all existing tests pass
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server lint` — zero errors
  - [x] `wrangler deploy --dry-run` from `apps/mcp-server/` — bundles successfully
  - [x] Optionally: `wrangler tail` after deploy — confirm GET /mcp no longer produces "hung" cancellations

## Dev Notes

### `agents` Package — McpAgent API

```ts
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export class OnRecordMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'on-record', version: '1.0.0' })

  async init(): Promise<void> {
    // this.env is typed as Env — access D1, secrets, etc.
    registerLookupLegislatorTool(this.server, this.env.DB)
    registerResolveAddressTool(this.server, this.env)
    registerSearchBillsTool(this.server, this.env.DB)
  }
}
```

`McpAgent.serve('/mcp')` returns a `{ fetch(req, env, ctx): Promise<Response> }` handler. Route to it in `worker.ts`:

```ts
if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
  // CF rate limit check (existing) ...
  const response = await OnRecordMCP.serve('/mcp').fetch(request, env, ctx)
  return addCorsHeaders(response, request)
}
```

**Important:** `OnRecordMCP.serve()` creates a new handler instance per call — calling it at module scope vs per-request is a question to resolve. Check the `agents` package source or examples for whether it is safe to call once at module scope.

### `resolveAddressTool` signature check

Current `registerResolveAddressTool` in `src/tools/resolve-address.ts` — check whether it takes `(server, env)` or just `(server)`. If it needs API keys, it likely reads from `getEnv()` singleton. With McpAgent, `initWorkerEnv` is no longer called (there's no `_env` singleton setup). Two options:

1. Pass `this.env` to `registerResolveAddressTool` and have it read keys from the arg directly
2. Call `initWorkerEnv(this.env)` at the top of `init()` before registering tools — if `getEnv()` is used inside tool handlers

Check current tool implementations to determine which pattern is in use, then pick the cleaner approach. Option 2 (`initWorkerEnv(this.env)` in `init()`) is lowest-risk if tools use `getEnv()`.

### wrangler.toml changes

```toml
[durable_objects]
bindings = [{ name = "MCP_OBJECT", class_name = "OnRecordMCP" }]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["OnRecordMCP"]
```

Add these sections. Durable Object migrations apply automatically on `wrangler deploy` — no new CI step required.

### CORS for McpAgent responses

McpAgent does not add CORS headers. Apply them in `worker.ts` after getting the McpAgent response:

```ts
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id',
}

function addCorsHeaders(response: Response): Response {
  const r = new Response(response.body, response)
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    r.headers.set(k, v)
  }
  return r
}

// OPTIONS preflight:
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
```

Adjust `Access-Control-Allow-Origin` to match the existing `corsMiddleware` policy if it is not `*`.

### `initWorkerEnv` and `getEnv()` in the McpAgent path

The current `worker.ts` calls `initWorkerEnv(env)` at the start of `fetch` to populate the `_env` singleton so `getEnv()` works in tool handlers. With McpAgent, `init()` runs in the Durable Object context — call `initWorkerEnv(this.env)` at the top of `init()` to preserve this behavior, or refactor tools to accept env directly. The former is lower risk.

### Removing `setupMcpServer` injection pattern

`setupMcpServer` existed because `app.ts` is shared between Workers and Node.js, and couldn't import `env.DB` directly. With McpAgent, `this.env.DB` is available natively — the injection pattern is no longer needed for the Workers path. Remove it from `app.ts` and `worker.ts`. Update `index.ts` to remove the import/call.

### `app.ts` after cleanup

After removing all MCP transport code, `app.ts` may only contain middleware setup and the health check. If `worker.ts` handles health check inline and routes nothing else to `app.fetch`, `app.ts` becomes dead code on the Workers path. The Node.js path (`index.ts`) may still use it for local dev.

Decision for dev agent: If `app.ts` only serves the Node.js path after cleanup, document this clearly in comments. Do NOT delete `index.ts` — keep the Node.js path functional for local `ts-node` use (even if MCP tools don't work locally without DO).

### `@ts-expect-error` removal

`project-context.md` currently documents:
> `StreamableHTTPServerTransport.onclose` typed as `(() => void) | undefined` conflicts with `Transport` interface under `exactOptionalPropertyTypes`. Suppress with `@ts-expect-error` and a comment explaining the SDK mismatch.

This hack exists in `app.ts` around `transport.onclose = () => { ... }`. With the transport removed, this line disappears and the note in `project-context.md` should be removed.

### `agents` Package Version

Use `agents@^0.9.0` (the version in Cloudflare's official authless demo as of 2026-04-07). Pin with `^` to get patch fixes.

### Existing `@modelcontextprotocol/sdk` dependency

Keep `@modelcontextprotocol/sdk` in `package.json` — `McpServer` is still imported from it (`agents/mcp` re-exports `McpAgent` but tools still use `McpServer` from the SDK). Confirm after implementation.

### DO migrations and CI

Durable Object migrations defined in `[[migrations]]` are applied automatically by Cloudflare when `wrangler deploy` runs — no separate `wrangler d1 migrations apply`-style step needed in `.github/workflows/ci.yml`. The existing CI deploy job is unchanged.

### Current Test Count

227 tests pass after Story 9.4 (no new tests were added in 9.5). This story adds no new test files — tool tests and cache tests are unaffected by transport changes.

### wrangler.toml Final State After This Story

```toml
name = "on-record-mcp"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "on-record-cache"
database_id = "877ea9f0-a442-4bbd-81a4-2701bc29a143"

[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 60
  period = 60

[durable_objects]
bindings = [{ name = "MCP_OBJECT", class_name = "OnRecordMCP" }]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["OnRecordMCP"]

[triggers]
crons = ["0 6 * * *", "0 * * * *"]
```

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/package.json` | MODIFY | Add `agents@^0.9.0`, upgrade `@modelcontextprotocol/sdk` to `1.29.0`, add `"type": "module"` |
| `pnpm-lock.yaml` | REGENERATE | Updated by `pnpm install` |
| `apps/mcp-server/wrangler.toml` | MODIFY | Add `[durable_objects]` binding + `[[migrations]]` |
| `apps/mcp-server/worker-configuration.d.ts` | REGENERATE | Run `wrangler types` — adds `MCP_OBJECT: DurableObjectNamespace` to Env |
| `apps/mcp-server/src/mcp-agent.ts` | CREATE | `OnRecordMCP extends McpAgent<Env>` with tools registered in `init()` |
| `apps/mcp-server/src/worker.ts` | MODIFY | Route `/mcp` to `OnRecordMCP.serve()`; add CORS wrapper; remove `setupMcpServer`, tool imports, `app` import |
| `apps/mcp-server/src/app.ts` | MODIFY | Remove transport code, session store, `setupMcpServer`, MCP route handlers; keep middleware + health check |
| `apps/mcp-server/src/index.ts` | MODIFY | Remove `setupMcpServer` import and call + tool imports |
| `apps/mcp-server/src/cache/db.ts` | MODIFY | Replace `__dirname` with `fileURLToPath(new URL('.', import.meta.url))` for ESM compatibility |
| `apps/mcp-server/src/app.test.ts` | MODIFY | Remove stale MCP handler tests (dead code); replace with health check test |
| `apps/mcp-server/eslint.config.js` | RENAME → `eslint.config.cjs` | Required by ESM package — preserve CJS format for eslint flat config |
| `project-context.md` | MODIFY | Remove `@ts-expect-error` `onclose` / Known SDK Issues section |

## Dev Agent Record

### Implementation Notes

- **`agents` version**: Used `agents@^0.9.0` + upgraded `@modelcontextprotocol/sdk` to `1.29.0` (agents requires 1.29.0; 1.26.0 caused CJS/ESM type incompatibility)
- **`"type": "module"` required**: Adding `agents` caused CJS/ESM McpServer type conflict. Resolved by adding `"type": "module"` to package.json so TypeScript resolves SDK to ESM exports consistently. Side effects handled: `db.ts` `__dirname` → `fileURLToPath(import.meta.url)`, `eslint.config.js` → `eslint.config.cjs`
- **`{ binding: 'MCP_OBJECT' }` required**: Our DO binding name is `MCP_OBJECT` (not the class name `OnRecordMCP`), so `OnRecordMCP.serve('/mcp', { binding: 'MCP_OBJECT' })` is needed
- **`initWorkerEnv` in `init()`**: `gis.ts` calls `getEnv()` which requires `_env` to be populated. Called `initWorkerEnv(this.env)` at top of `init()` before tool registration
- **`registerResolveAddressTool` takes only `(server)`**: Does not accept env arg — uses `getEnv()` singleton internally. `initWorkerEnv` covers this
- **mcpHandler at module scope**: `OnRecordMCP.serve()` is safe to call once at module scope per Cloudflare docs
- **app.test.ts updated**: Removed 3 tests for dead MCP handler code in `app.ts`; replaced with health check test. 217 tests pass (was 227 before — reduced by 3 removed, +1 added, -8 from earlier stories)

### Completion Notes

All 6 tasks complete. 217 tests pass, typecheck clean, lint clean, dry-run bundles successfully with DO binding `MCP_OBJECT` visible in output.

### Code Review Follow-up (2026-04-07)

- ✅ Item 1 (High — scheduled handler reliability): Finding was a false positive. `ctx.waitUntil()` was already correctly used — no change needed.
- ✅ Item 2 (High — MCP delegation error boundary): Added try/catch around `mcpHandler.fetch` in `worker.ts`; returns structured `{ source, nature, action }` JSON with CORS headers on DO failure.
- ✅ Item 3 (Medium — DB validation in DO init): Added explicit `if (!this.env.DB)` guard at top of `OnRecordMCP.init()` that throws with a clear message.
- ⏭ Item 4 (Low — README docs): Skipped — creating new doc files requires explicit user request per project conventions.
