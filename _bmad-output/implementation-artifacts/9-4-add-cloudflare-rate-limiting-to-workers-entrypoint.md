# Story 9.4: Add Cloudflare Rate Limiting to Workers Entrypoint

Status: done

## Story

As an **operator**,
I want the Workers path protected by Cloudflare's globally-consistent Rate Limiting binding,
So that the /mcp endpoint is rate-limited across all edge PoPs without relying on per-isolate in-memory state.

## Acceptance Criteria

1. **Given** wrangler.toml has the D1 binding configured **when** the Cloudflare Rate Limiting binding is added **then** `wrangler.toml` includes a `[[ratelimits]]` stanza with `name = "RATE_LIMITER"`, a `namespace_id`, and a `[ratelimits.simple]` block defining `limit` and `period`

2. **Given** the `[[ratelimits]]` binding is added to wrangler.toml **when** `wrangler types` is run from `apps/mcp-server/` **then** `worker-configuration.d.ts` is regenerated and `Env` includes `RATE_LIMITER: RateLimit`

3. **Given** worker.ts uses app.fetch **when** a middleware is added for rate limiting in the Workers path **then** a new `src/middleware/cf-rate-limit.ts` is created that exports a function using `env.RATE_LIMITER` to perform the rate limit check
4. **And** the rate limit check is applied to the `/mcp` route in `worker.ts`'s `fetch` handler (Workers path only — NOT in app.ts)
5. **And** on limit breach it returns a 429 response: `{ source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' }`
6. **And** it logs the rate limit event via pino logger: `logger.warn({ source: 'rate-limiter', ip }, '...')`

7. **Given** the Node.js index.ts path **when** this story is complete **then** `src/middleware/rate-limit.ts` (hono-rate-limiter) is completely unchanged
8. **And** `hono-rate-limiter` remains in `package.json` dependencies
9. **And** `index.ts` still registers `rateLimitMiddleware` on `/mcp` as before

10. **Given** the updated workers path **when** `pnpm --filter mcp-server test` is run **then** all existing rate-limit tests pass unchanged
11. **And** new tests for `src/middleware/cf-rate-limit.ts` pass
12. **And** `pnpm --filter mcp-server typecheck` passes with zero errors
13. **And** `pnpm --filter mcp-server lint` passes with zero errors

## Tasks / Subtasks

- [x] Task 1: Add `[[ratelimits]]` binding to `wrangler.toml` (AC 1)
  - [x] Add `[[ratelimits]]` stanza with `name = "RATE_LIMITER"`, `namespace_id = "1001"` (unique integer — choose any, e.g. 1001), `[ratelimits.simple]` block with `limit = 60` and `period = 60`
  - [x] Run `wrangler types` from `apps/mcp-server/` to regenerate `worker-configuration.d.ts`
  - [x] Commit `worker-configuration.d.ts` (generated file, intentionally versioned — see Story 9.1 precedent)

- [x] Task 2: Create `src/middleware/cf-rate-limit.ts` (AC 3–6)
  - [x] Export `applyCfRateLimit(rateLimiter: RateLimit, request: Request): Promise<Response | null>`
  - [x] Extract IP key from `cf-connecting-ip` header (Cloudflare edge header) with fallback to `x-forwarded-for`, then `'unknown'`
  - [x] Call `await rateLimiter.limit({ key: ip })`
  - [x] If `success === false`: `logger.warn({ source: 'rate-limiter', ip }, 'CF rate limit exceeded — returning 429')` and return `Response.json({ source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' }, { status: 429 })`
  - [x] If `success === true`: return `null` (caller continues to `app.fetch`)
  - [x] Use `import { logger } from '../lib/logger.js'` — no console.log (ESLint enforced)

- [x] Task 3: Apply CF rate limiting in `worker.ts`'s fetch handler (AC 4)
  - [x] Import `applyCfRateLimit` from `./middleware/cf-rate-limit.js`
  - [x] In the `fetch` handler, after the `env.DB` guard and before `setupMcpServer`, check if `new URL(request.url).pathname === '/mcp'`
  - [x] If true: `const blocked = await applyCfRateLimit(env.RATE_LIMITER, request)` — if `blocked` is non-null, return it immediately
  - [x] Guard: if `env.RATE_LIMITER` is falsy (binding misconfigured), skip rate limiting and continue (fail-open) — log a warn
  - [x] Restructure the `fetch` handler to return a `Promise<Response>` (already the case — no change needed)

- [x] Task 4: Write tests for `src/middleware/cf-rate-limit.test.ts` (AC 10–11)
  - [x] Mock `logger`: `vi.mock('../lib/logger.js', () => ({ logger: { warn: vi.fn() } }))`
  - [x] **Allowed test:** `rateLimiter.limit` returns `{ success: true }` → `applyCfRateLimit` returns `null`
  - [x] **Blocked test:** `rateLimiter.limit` returns `{ success: false }` → returns `Response` with status 429 and body `{ source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' }`
  - [x] **Logging test:** On limit breach, `logger.warn` called with `expect.objectContaining({ source: 'rate-limiter' })` and message containing `'429'` (key phrase)
  - [x] **Key extraction test (cf-connecting-ip):** `rateLimiter.limit` called with `{ key: '1.2.3.4' }` when `cf-connecting-ip: 1.2.3.4` header is set — use `toHaveBeenCalledWith` to verify correct key
  - [x] **Fallback test:** falls back to `x-forwarded-for` when `cf-connecting-ip` absent; falls back to `'unknown'` when both absent
  - [x] Mock `rateLimiter` as `{ limit: vi.fn().mockResolvedValue({ success: true }) }` cast as `RateLimit`

- [x] Task 5: Final verification
  - [x] `pnpm --filter mcp-server test` — all tests pass (existing 218 + new cf-rate-limit.test.ts = 224)
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server lint` — zero errors
  - [x] `wrangler deploy --dry-run` from `apps/mcp-server/` — bundle compiles without errors
  - [x] Verify `src/middleware/rate-limit.ts` is byte-for-byte unchanged (no edits)
  - [x] Verify `src/index.ts` is unchanged

### Review Findings

- [x] [Review][Patch] Duplicated `setupMcpServer` and tool registration block [worker.ts:25-50]
- [x] [Review][Patch] Insecure and incorrect IP extraction for rate limiting [cf-rate-limit.ts:9-15]
- [x] [Review][Patch] Fragile route matching allows rate limit bypass [worker.ts:30]
- [x] [Review][Patch] 429 response missing `Retry-After` header [cf-rate-limit.ts:20]
- [x] [Review][Defer] Rate limiting implemented in entrypoint instead of Hono middleware [worker.ts:30] — by design per AC 4 (Workers-path-only, NOT in app.ts)
- [x] [Review][Patch] Missing exception guard for `rateLimiter.limit` [cf-rate-limit.ts:15]
- [x] [Review][Patch] Diverging request lifecycles (async IIFE path) [worker.ts:33]
- [x] [Review][Defer] Rate limiting is Workers-only, causing environment drift [worker.ts:30] — deferred, pre-existing (Story 9.4 scope)

## Dev Notes

### Cloudflare Workers Rate Limiting API (GA as of September 2025)

**wrangler.toml stanza:**
```toml
[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 60
  period = 60
```

- `namespace_id`: A unique positive integer you choose (e.g., 1001). Identifies the rate limit counter namespace within your Cloudflare account. No dashboard pre-creation needed for `wrangler dev`.
- `limit`: Max requests within the period (use 60 — matches the hono-rate-limiter limit in rate-limit.ts)
- `period`: Window duration in seconds. **Only 10 or 60 are valid.** Use 60.
- `name = "RATE_LIMITER"` → binding name in `Env` after `wrangler types`

**TypeScript API:**
```ts
const { success } = await env.RATE_LIMITER.limit({ key: clientIp })
// success: true  → request allowed
// success: false → rate limit exceeded → return 429
```

**`RateLimit` type** (from regenerated `worker-configuration.d.ts`):
- The `wrangler types` command adds `RATE_LIMITER: RateLimit` to the `Env` interface in `worker-configuration.d.ts`
- `RateLimit.limit(options: { key: string }): Promise<{ success: boolean }>`

**Regenerate `worker-configuration.d.ts`:**
```sh
cd apps/mcp-server
wrangler types
```
Commit the updated file (same as the Story 9.1 precedent).

**Important limitations:**
- Rate limits are **local to the Cloudflare PoP** (not globally synchronized) — by design, permissive/eventually consistent. This is acceptable for MVP.
- The period constraint (only 10 or 60 seconds) is a Cloudflare API limitation — 60 seconds is our choice.
- Local `wrangler dev` simulates the `RATE_LIMITER` binding using a local counter — `wrangler dev --test-scheduled` still works.

### IP Key Strategy

In Cloudflare Workers, use `cf-connecting-ip` as the primary IP header — it is set by Cloudflare's edge and cannot be spoofed by clients (unlike `x-forwarded-for` which can be injected). This is more reliable than the `x-forwarded-for` approach used by the existing hono-rate-limiter middleware in `rate-limit.ts`.

```ts
const ip =
  request.headers.get('cf-connecting-ip') ??
  request.headers.get('x-forwarded-for') ??
  'unknown'
```

### `cf-rate-limit.ts` — Implementation Pattern

Use a **plain async function** (not a Hono `MiddlewareHandler`) to keep the design testable and decoupled from Hono's Context object:

```ts
// src/middleware/cf-rate-limit.ts
import { logger } from '../lib/logger.js'

export async function applyCfRateLimit(
  rateLimiter: RateLimit,
  request: Request,
): Promise<Response | null> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'unknown'
  const { success } = await rateLimiter.limit({ key: ip })
  if (!success) {
    logger.warn({ source: 'rate-limiter', ip }, 'CF rate limit exceeded — returning 429')
    return Response.json(
      { source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' },
      { status: 429 },
    )
  }
  return null
}
```

### `worker.ts` — Applying CF Rate Limiting

Apply `applyCfRateLimit` in the `fetch` handler BEFORE routing to `app.fetch`. The `/mcp` route check uses `URL.pathname`:

```ts
fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
  initWorkerEnv(env)

  if (!env.DB) {
    return Response.json({ source: 'worker', nature: 'D1 binding missing', action: '...' }, { status: 500 })
  }

  // CF rate limiting for /mcp route (Workers path only)
  const url = new URL(request.url)
  if (url.pathname === '/mcp') {
    if (!env.RATE_LIMITER) {
      logger.warn({ source: 'rate-limiter' }, 'RATE_LIMITER binding not configured — skipping rate limiting')
    } else {
      return (async () => {
        const blocked = await applyCfRateLimit(env.RATE_LIMITER, request)
        if (blocked) return blocked
        setupMcpServer(...)
        return app.fetch(request, env, ctx)
      })()
    }
  }

  setupMcpServer(env.DB, (server) => { ... })
  return app.fetch(request, env, ctx)
},
```

**Important:** Avoid mutable module-level state. The `applyCfRateLimit` function is stateless — safe to call on every request.

**Do NOT** modify `app.ts` — the CF rate limit is Workers-path-only. The shared app already has `rateLimitMiddleware` on `/mcp` for the Node.js path; do not add CF rate limiting there.

### Node.js Path — Zero Changes

Do NOT modify any of these files:
- `src/middleware/rate-limit.ts` — hono-rate-limiter stays unchanged
- `src/index.ts` — still registers `rateLimitMiddleware` on `/mcp`
- `src/app.ts` — unchanged
- `package.json` — `hono-rate-limiter` stays in dependencies

### Architecture Boundary Rules (CLAUDE.md)

- `console.log` FORBIDDEN — use `logger.warn` / `logger.error` from `./lib/logger.js`
- No barrel files — `cf-rate-limit.ts` is a standalone file in `middleware/` (not re-exported via an index)
- AppError format: `{ source, nature, action }` — use this exact shape for 429 body
- No `any`, no `@ts-ignore`

### Testing `cf-rate-limit.test.ts`

The middleware is a plain async function — test directly without Hono app setup:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockWarn = vi.fn()
vi.mock('../lib/logger.js', () => ({ logger: { warn: mockWarn } }))

import { applyCfRateLimit } from './cf-rate-limit.js'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/mcp', { headers })
}

describe('applyCfRateLimit', () => {
  let mockRateLimiter: { limit: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockRateLimiter = { limit: vi.fn().mockResolvedValue({ success: true }) }
    mockWarn.mockClear()
  })

  it('returns null when rate limit is not exceeded', async () => {
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result).toBeNull()
  })

  it('returns 429 Response when rate limit is exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue({ success: false })
    const result = await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
    const body = await result!.json() as Record<string, string>
    expect(body).toMatchObject({ source: 'app', nature: 'Rate limit exceeded', action: 'Wait before retrying' })
  })

  it('logs warn with source: rate-limiter when limit exceeded', async () => {
    mockRateLimiter.limit.mockResolvedValue({ success: false })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rate-limiter' }),
      expect.stringContaining('429'),  // KEY PHRASE
    )
  })

  it('uses cf-connecting-ip as the rate limit key', async () => {
    const req = makeRequest({ 'cf-connecting-ip': '1.2.3.4' })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, req)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '1.2.3.4' })
  })

  it('falls back to x-forwarded-for when cf-connecting-ip absent', async () => {
    const req = makeRequest({ 'x-forwarded-for': '5.6.7.8' })
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, req)
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '5.6.7.8' })
  })

  it('falls back to unknown when both IP headers absent', async () => {
    await applyCfRateLimit(mockRateLimiter as unknown as RateLimit, makeRequest())
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: 'unknown' })
  })
})
```

### 9.3 Implementation State (what exists now in worker.ts)

```ts
// Current worker.ts structure (after 9.3):
fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
  initWorkerEnv(env)
  if (!env.DB) { return Response.json({ source: 'worker', nature: 'D1 binding missing', ... }, { status: 500 }) }
  setupMcpServer(env.DB, (server) => { ... })
  return app.fetch(request, env, ctx)
},
scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void { ... }
```

The `fetch` handler is currently synchronous for non-DB-missing cases (returns `app.fetch` promise directly). Adding CF rate limiting for `/mcp` requires an async branch — use IIFE async for that path.

### Current Test Count

218 tests pass after Story 9.3 (all files). New tests in `cf-rate-limit.test.ts` will increase this count.

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

[triggers]
crons = ["0 6 * * *", "0 * * * *"]
```

### worker-configuration.d.ts — Expected Env Interface After Regeneration

```ts
interface Env extends Cloudflare.Env {}
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    RATE_LIMITER: RateLimit;
    PORT: string;
    NODE_ENV: string;
    UTAH_LEGISLATURE_API_KEY: string;
    UGRC_API_KEY: string;
  }
}
```

(Order may differ — `wrangler types` generates this automatically.)

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/wrangler.toml` | MODIFY | Add `[[ratelimits]]` stanza |
| `apps/mcp-server/worker-configuration.d.ts` | REGENERATE | Run `wrangler types` — adds `RATE_LIMITER: RateLimit` to Env |
| `apps/mcp-server/src/middleware/cf-rate-limit.ts` | CREATE | `applyCfRateLimit(rateLimiter: RateLimit, request: Request): Promise<Response \| null>` |
| `apps/mcp-server/src/middleware/cf-rate-limit.test.ts` | CREATE | Tests for allowed/blocked/logging/IP-key-extraction |
| `apps/mcp-server/src/worker.ts` | MODIFY | Import `applyCfRateLimit`; add `/mcp` rate limit check in `fetch` handler |
| `apps/mcp-server/src/middleware/rate-limit.ts` | NO CHANGE | hono-rate-limiter stays unchanged |
| `apps/mcp-server/src/index.ts` | NO CHANGE | Node.js path untouched |
| `apps/mcp-server/src/app.ts` | NO CHANGE | CF rate limit is Workers-path-only |

## Dev Agent Record

claude-sonnet-4-6

### Debug Log References

- vi.hoisted required for mockWarn in cf-rate-limit.test.ts — vi.mock factory is hoisted before variable initialization, so mockWarn must be declared via vi.hoisted() to be available in the factory closure.

### Completion Notes List

- Created `src/middleware/cf-rate-limit.ts` — plain async function `applyCfRateLimit(rateLimiter, request)` using CF Rate Limiting binding; IP key from cf-connecting-ip → x-forwarded-for → 'unknown'; returns 429 JSON on breach, null on allow.
- Modified `worker.ts` — added CF rate limit check for `/mcp` path in fetch handler using IIFE async pattern; fail-open guard if RATE_LIMITER binding missing.
- Added `[[ratelimits]]` stanza to `wrangler.toml`; regenerated `worker-configuration.d.ts` (RATE_LIMITER: RateLimit now in Env interface).
- 6 new tests in `cf-rate-limit.test.ts` covering: allow, block (429 body), logging (key phrase '429'), cf-connecting-ip key, x-forwarded-for fallback, unknown fallback. Total: 224 tests pass.
- `rate-limit.ts`, `index.ts`, `app.ts` unchanged — Node.js path unaffected.
- ✅ Resolved review finding [Patch]: Duplicated setupMcpServer block — made fetch async, removed IIFE, single call site
- ✅ Resolved review finding [Patch]: Insecure IP extraction — sanitize x-forwarded-for with optional chain + split(',')[0]?.trim()
- ✅ Resolved review finding [Patch]: Fragile route matching — added startsWith('/mcp/') alongside exact '=== /mcp' check
- ✅ Resolved review finding [Patch]: 429 missing Retry-After header — added { 'Retry-After': '60' } to Response.json options
- ✅ Resolved review finding [Patch]: Missing exception guard — wrapped rateLimiter.limit() in try/catch; fail-open on error
- ✅ Resolved review finding [Patch]: Diverging request lifecycles — addressed by making fetch fully async (no IIFE branch)
- ✅ Deferred review finding [Patch→Defer]: Rate limiting in entrypoint vs Hono middleware — by design per AC 4 (Workers-path-only)
- 3 new tests added: multi-IP x-forwarded-for, Retry-After header, fail-open on exception. Total: 227 tests pass.

### Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-05 | Story created | Story 9.4 — add Cloudflare Rate Limiting to Workers entrypoint |
| 2026-04-05 | Implementation complete | Added CF rate limiting binding, middleware, worker.ts integration, and tests |
| 2026-04-05 | Addressed code review findings — 6 items resolved (Gemini review) | IP sanitization, Retry-After header, exception guard, async fetch, deduplicated setupMcpServer, route matching; 1 deferred by design |
