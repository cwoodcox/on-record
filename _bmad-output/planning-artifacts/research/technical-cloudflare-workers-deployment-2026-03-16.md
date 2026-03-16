---
stepsCompleted: [1, 2, 3, 4, 5]
workflowType: 'research'
research_type: 'technical'
research_topic: 'Cloudflare Workers deployment platform for mcp-server'
research_goals: 'Validate the migration approach, fill gaps in the existing draft, and produce a complete web-verified research document'
user_name: 'Corey'
date: '2026-03-16'
web_research_enabled: true
source_verification: true
---

# Research Report: Cloudflare Workers Deployment Platform

**Date:** 2026-03-16
**Research Type:** Technical

---

## Technical Research Scope Confirmation

**Research Topic:** Cloudflare Workers deployment platform for mcp-server
**Research Goals:** Validate the migration approach, fill gaps in the existing draft, and produce a complete web-verified research document

**Technical Research Scope:**

- Architecture Analysis — design patterns, frameworks, system architecture
- Implementation Approaches — development methodologies, coding patterns
- Technology Stack — languages, frameworks, tools, platforms
- Integration Patterns — APIs, protocols, interoperability
- Performance Considerations — scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-16

---

## Technology Stack Analysis

### Programming Languages

TypeScript is the primary language for Cloudflare Workers and is first-class supported by Wrangler — the CLI transpiles TypeScript directly with no separate build step required. Wrangler generates runtime types via `wrangler types`, which is preferred over the static `@cloudflare/workers-types` package because it accounts for the specific compatibility date and flags in `wrangler.toml`. The on-record project's existing strict TypeScript config is compatible.

_Source: [Cloudflare Workers TypeScript docs](https://developers.cloudflare.com/workers/languages/typescript/)_

### Development Frameworks and Libraries

Hono is the **officially recommended** framework for Cloudflare Workers API development and has first-class coverage in Cloudflare's own documentation. The project already uses Hono 4.12.1 — the same `app` instance works on both Node.js (via `@hono/node-server`) and Workers (via `export default { fetch: app.fetch }`). No framework migration is required; only the entrypoint changes.

Cloudflare's own quickstart templates ship a **Hono + Chanfana + D1 + Vitest** stack, confirming it as the production-grade pattern. Testing in Workers uses `@cloudflare/vitest-pool-workers`.

_Source: [Hono — Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers), [Cloudflare Workers framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)_

### Database and Storage Technologies

**D1** is Cloudflare's managed SQLite database, fully supported as a Worker binding (`env.DB` typed as `D1Database`). Key characteristics relevant to this project:

- Full SQLite semantics including **FTS5** support — the `bill_fts` virtual table and existing JOIN query pattern work without modification
- Async API (`prepare().bind().all()`) rather than better-sqlite3's synchronous API — requires mechanical migration of `cache/` layer only
- Point-in-time recovery (30 days), 10 GB per database, replication across Cloudflare's network
- Free tier: 5M row reads/day, 100K row writes/day, 5 GB storage — ample for on-record's legislative cache

The D1 binding is injected through `env` passed to the `fetch(req, env)` handler, consistent with the project's existing dependency-injection pattern at the cache boundary.

_Source: [Cloudflare D1 Overview](https://developers.cloudflare.com/d1/), [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/)_

### Development Tools and Platforms

**Wrangler** (v4.x as of 2025) is the all-in-one CLI for Cloudflare Workers:
- `wrangler dev` — local dev server with D1 local simulation
- `wrangler deploy` — build + deploy to Workers
- `wrangler types` — generates `worker-configuration.d.ts` type declarations for bindings
- `wrangler.toml` — single config file for entrypoint, bindings, cron triggers, and environment variables

No separate bundler (webpack/esbuild) configuration is needed — Wrangler handles TypeScript compilation internally. The existing `tsconfig.json` is expected to be compatible with minor adjustments.

_Source: [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/), [Get started CLI](https://developers.cloudflare.com/workers/get-started/guide/)_

### Cloud Infrastructure and Deployment

Cloudflare Workers runs on **V8 isolates** (not containers or microVMs), which gives it a fundamentally different performance profile from AWS Lambda:

| Metric | Cloudflare Workers | AWS Lambda |
|---|---|---|
| Cold start | ~0ms (isolates pre-initialized) | 200–1000ms |
| p95 global response | ~40ms | ~882ms (single region) |
| Billing model | CPU time only | Wall-clock duration |
| Cost at 10M req/month | ~$5 | ~$17 (Lambda@Edge) |
| Free tier | 100K req/day | 1M req/month |
| Runtime | JS/TS/Wasm only | Any language |
| Global footprint | 310+ locations | 20–30 regions |

For on-record's MCP server — a lightweight API doing SQLite queries — Workers is an excellent fit: low CPU time, global low latency, and cost well within the free tier at MVP scale.

_Source: [Cloudflare Workers vs AWS Lambda (Jan 2026)](https://techpreneurr.medium.com/cloudflare-workers-vs-aws-lambda-why-edge-compute-quietly-killed-traditional-serverless-0237015a4ede), [Edge Functions vs Serverless 2025](https://byteiota.com/edge-functions-vs-serverless-the-2025-performance-battle/)_

### Technology Adoption Trends

As of early 2026, the Hono + Cloudflare Workers + D1 stack has reached production maturity:
- Cloudflare's own quickstart templates default to this combination
- Framework support for Hono, React Router v7, Astro, Vue, Nuxt, SvelteKit is production-ready
- Workers Containers (open beta, June 2025) expands the platform to containerized workloads
- "By 2026, edge is expected to be the default, not the exception" (per industry analysis)

The on-record migration targets the established, well-documented path — not a bleeding-edge bet.

_Source: [Cloudflare Workers complete platform overview](https://medium.com/@ltwolfpup/cloudflare-workers-the-complete-serverless-edge-computing-platform-40a113164ab6)_

---

## Integration Patterns Analysis

### MCP Transport — Streamable HTTP on Workers

The MCP specification switched from SSE to **Streamable HTTP** as its standard remote transport in **March 2025**. This is the transport the on-record mcp-server must implement.

Cloudflare has first-class support for both transports. Two implementation paths exist:

| Path | When to Use |
|---|---|
| `McpAgent` (Agents SDK) — Durable Object per session | Need per-session state, OAuth provider, or built-in SSE fallback |
| `createMcpHandler` + `@modelcontextprotocol/sdk` | Full control, stateless handlers, existing Hono app |

For on-record, the existing `@modelcontextprotocol/sdk` (already in the project) can be used directly with the `fetch(req, env)` entrypoint on Workers. The MCP handler becomes a route on the Hono app — no separate server process needed.

Testing: use `mcp-remote` adapter to connect Claude Desktop to the deployed Worker during development.

_Source: [Cloudflare Agents MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/), [Streamable HTTP blog post](https://blog.cloudflare.com/streamable-http-mcp-servers-python/), [Build a Remote MCP Server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)_

### Environment Bindings and Secrets

`process.env` is **not available** in Workers by default (though it is enabled automatically for compatibility dates ≥ 2025-04-01 when `nodejs_compat_populate_process_env` is set). The correct pattern is `c.env.MY_VAR` accessed via Hono's typed `Bindings` generic:

```ts
type Bindings = {
  DB: D1Database
  UGRC_API_KEY: string
  RATE_LIMITER: RateLimitBinding
}
const app = new Hono<{ Bindings: Bindings }>()
```

- **Secrets** (API keys, tokens) → `wrangler secret put KEY_NAME` — encrypted at rest, never visible in dashboard after creation
- **Local dev** → `.dev.vars` file (gitignored), same key/value format as production
- **D1 binding** → declared in `wrangler.toml` `[[d1_databases]]`, accessed as `env.DB`

The existing project pattern of passing dependencies through constructor injection at the `cache/` boundary maps cleanly onto the `env` bindings pattern — `env.DB` replaces the `better-sqlite3` Database instance.

_Source: [Bindings (env) docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/), [Secrets docs](https://developers.cloudflare.com/workers/configuration/secrets/), [Hono Cloudflare Workers guide](https://hono.dev/docs/getting-started/cloudflare-workers)_

### Rate Limiting Integration

The project already uses `hono-rate-limiter 0.4.2`. On Workers, it can be replaced with Cloudflare's **native Rate Limiting API** (zero-latency, backed by local counters):

```toml
# wrangler.toml
[[ratelimits]]
binding = "RATE_LIMITER"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

The `@elithrar/workers-hono-rate-limit` package wraps this binding as Hono middleware. Key point from docs: **do not rate limit by IP address** (shared NATs cause false positives) — rate limit by `Authorization` header or MCP session token instead.

_Source: [Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [workers-hono-rate-limit](https://github.com/elithrar/workers-hono-rate-limit)_

### Scheduled Tasks / Cron Triggers

The project uses `node-cron 4.2.1` for cache refresh. On Workers, this is replaced by **Cron Triggers** — no library needed:

```toml
# wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours UTC
```

```ts
export default {
  async fetch(req: Request, env: Env): Promise<Response> { ... },
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    // cache refresh logic
  }
}
```

- UTC timezone only — document the offset vs `node-cron` if the existing schedule is timezone-sensitive
- Multiple crons: use `controller.cron` string to branch logic
- Local testing: `wrangler dev --test-scheduled` exposes `/__scheduled` route
- Logs: 100 most recent invocations stored; Workers Logs for extended retention

_Source: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Scheduled Handler API](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)_

### Communication Protocols and Data Formats

No changes required to the MCP wire format — the SDK handles JSON-RPC 2.0 serialization. Streamable HTTP uses standard `Content-Type: application/json` for requests and `text/event-stream` for streaming responses; Workers supports both natively via the `Response` and `ReadableStream` APIs.

_Source: [MCP spec transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/)_

### Integration Security

- **API keys** → stored as Workers secrets (`wrangler secret put`), accessed via `c.env`
- **MCP auth** → OAuth 2.1 via Workers OAuth Provider library if needed; for internal/trusted use, a shared secret in the `Authorization` header is sufficient
- **UGRC GIS API key** → moves from env var to Workers secret — no code change, only deployment change
- **HTTPS everywhere** → Workers only serve over TLS; no HTTP-to-HTTPS redirect logic needed

_Source: [Secrets docs](https://developers.cloudflare.com/workers/configuration/secrets/)_

---

## Architectural Patterns and Design

### System Architecture Patterns

The migration from Node.js/better-sqlite3 to Cloudflare Workers/D1 follows a well-understood pattern: **serverless edge function with managed relational database binding**. The key architectural shift is:

- **Before:** Long-running Node.js process, synchronous SQLite via `better-sqlite3`, `node-cron` daemon
- **After:** Stateless isolate per request, async D1 binding, Cron Trigger for scheduled work

The `fetch` + `scheduled` dual-export pattern is the Workers equivalent of Express's `app.listen()` + cron:

```ts
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(req, env, ctx)  // existing Hono app, unchanged
  },
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await refreshCache(env.DB)       // replaces node-cron handler
  }
}
```

Critical Workers-specific rule: **never store mutable state in module-level variables** — isolates are reused across requests, causing cross-request data leaks. All state flows through `env` bindings or function arguments.

_Source: [Workers Best Practices (Feb 2026)](https://developers.cloudflare.com/changelog/post/2026-02-15-workers-best-practices/)_

### Design Principles and Best Practices

**Generated types, never hand-written:** Run `wrangler types` after every `wrangler.toml` change to regenerate `worker-configuration.d.ts`. The project's existing `Boundary 4` rule (better-sqlite3 confined to `cache/`) maps directly onto the D1 binding pattern — the boundary stays, only the implementation changes.

**Bindings over REST:** D1, rate limiting, and secrets are all accessed as in-process bindings (`env.DB`, `env.RATE_LIMITER`, `env.UGRC_API_KEY`) with zero network hop and no auth overhead. This is architecturally cleaner than the current approach of injecting a `Database` instance.

**`nodejs_compat` flag required:** `better-sqlite3` is a native C++ addon — it cannot run in Workers even with Node.js compatibility enabled. The flag is needed for other Node.js APIs the project may use, but it does not rescue `better-sqlite3`. The `cache/` layer must be rewritten against D1's async API.

_Source: [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Node.js in Workers 2025](https://blog.cloudflare.com/nodejs-workers-2025/)_

### Data Architecture Patterns — better-sqlite3 → D1 Migration

The synchronous → async API shift is the most significant mechanical change. Every `cache/` method changes from:

```ts
// Before (better-sqlite3, synchronous)
const row = db.prepare('SELECT * FROM bills WHERE id = ?').get(id)
```
to:
```ts
// After (D1, async)
const row = await env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(id).first()
```

**FTS5 preservation:** D1 is full SQLite, so the existing `bill_fts` virtual table and the JOIN query pattern documented in `CLAUDE.md` work without modification. The SQL is identical; only the calling convention changes.

**Schema migration strategy:**
1. Export the existing SQLite schema (no data — it's a cache, repopulated on first run)
2. Create `migrations/001-initial-schema.sql` in `apps/mcp-server/`
3. Apply locally: `wrangler d1 execute on-record-cache --local --file=./migrations/001-initial-schema.sql`
4. Apply remotely: `wrangler d1 execute on-record-cache --remote --file=./migrations/001-initial-schema.sql`
5. All future schema changes: sequential numbered migration files

**Sessions API for consistency:** After writes (cache refresh), use `env.DB.withSession("first-primary")` if subsequent reads in the same handler must see the write. Not needed for the read path (MCP tool calls).

_Source: [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 Import/Export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)_

### Monorepo Architecture

The existing pnpm workspaces structure is compatible with Cloudflare Workers deployment with one important caveat: **Cloudflare's automatic builder installs all workspace dependencies**, not just the Worker's. For a CI/CD-driven deploy (GitHub Actions), this is a non-issue — `wrangler deploy` runs directly from `apps/mcp-server/`.

Recommended monorepo placement:
```
apps/mcp-server/
├── src/
│   └── index.ts          # export default { fetch, scheduled }
├── wrangler.toml          # bindings, cron triggers, compatibility flags
├── worker-configuration.d.ts  # generated by `wrangler types`
├── migrations/
│   └── 001-initial-schema.sql
└── package.json
```

Wrangler should be installed at the **monorepo root** `package.json`, not per-workspace, to avoid permission issues. The `apps/mcp-server/package.json` script becomes `"deploy": "wrangler deploy"`.

_Source: [Advanced setups — Workers CI/CD](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)_

### Scalability and Performance Patterns

Workers' isolate model provides automatic global scale with zero configuration. For on-record's workload:

- **Read path (MCP tool calls):** Stateless, sub-10ms D1 reads — handled entirely by Workers autoscaling
- **Write path (cache refresh):** Single Cron Trigger → single Worker invocation → D1 batch writes
- **D1 latency improvement:** 40–60% request latency decrease in 2025 (per Cloudflare release notes)
- **Smart Placement:** If D1 read latency is a concern, enable `[placement] mode = "smart"` in `wrangler.toml` — Workers will colocate with the D1 primary

_Source: [D1 Overview](https://developers.cloudflare.com/d1/)_

### Deployment and Operations Architecture

```
GitHub Actions CI:
  pnpm install (root)
  pnpm test (apps/mcp-server)
  wrangler d1 migrations apply --remote  (schema only if changed)
  wrangler deploy                        (from apps/mcp-server/)

Local development:
  wrangler dev                           (local D1 sim, hot reload)
  wrangler dev --test-scheduled          (test cron handler via /__scheduled)
  wrangler d1 execute --local --file=... (apply schema locally)
```

Secrets set once via `wrangler secret put UGRC_API_KEY` — not in `wrangler.toml`, not in git.

_Source: [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)_

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategy — Strangler Fig, Not Big Bang

The recommended migration path is a **parallel-run strangler fig**: keep the existing Node.js MCP server operational while building the Workers version alongside it. The Workers version is functionally identical at the MCP protocol layer — only the runtime, database driver, and scheduler change.

**Concrete migration sequence:**

1. **Create D1 database** — `wrangler d1 create on-record-cache`
2. **Add binding to `wrangler.toml`** — `[[d1_databases]]` stanza with `binding = "DB"`
3. **Rewrite `cache/` layer** — replace `better-sqlite3` synchronous calls with D1 async equivalents; this is the bulk of the work
4. **Swap scheduler** — replace `node-cron` handler with `scheduled` export in `src/index.ts`
5. **Run `wrangler types`** — regenerate `worker-configuration.d.ts` from updated `wrangler.toml`
6. **Test locally** — `wrangler dev` with local D1 simulation
7. **Deploy** — `wrangler deploy`; decommission Node.js server

**Import path for existing data:** D1 can import directly from a SQLite dump:
```sh
sqlite3 existing-cache.db .dump > schema-and-data.sql
wrangler d1 execute on-record-cache --remote --file=schema-and-data.sql
```
Since the cache is ephemeral (repopulated by the refresh job), a clean schema-only migration is simpler and safer — no data import needed.

_Source: [D1 Import/Export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)_

### Development Workflows and Tooling

**Local development loop (wrangler dev):**
- `wrangler dev` uses Miniflare v3 under the hood — startup is ~10× faster than old remote dev mode
- Local D1 database lives in `.wrangler/state/` — persistent between runs, deleteable to reset
- Test the scheduled handler: `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` (with `wrangler dev --test-scheduled`)
- Hot reload on file save, sub-second iteration cycle

**Remote bindings (2025 beta):** `wrangler dev --x-remote-bindings` lets local Worker code query the real deployed D1 database. Useful for integration testing against production data without deploying.

**Schema migration workflow:**
```sh
# Create a new migration
wrangler d1 migrations create on-record-cache add-index-to-bills

# Apply locally (development)
wrangler d1 migrations apply on-record-cache --local

# Apply remotely (production)
wrangler d1 migrations apply on-record-cache --remote
```

The `d1_migrations` table in each database tracks which migrations have run, preventing double-application.

_Source: [Development & testing](https://developers.cloudflare.com/workers/development-testing/), [Improved local development with Wrangler v3](https://blog.cloudflare.com/wrangler3/)_

### Testing and Quality Assurance

The project's existing Vitest test suite integrates with Workers via `@cloudflare/vitest-pool-workers`:

```sh
pnpm add -D @cloudflare/vitest-pool-workers
```

Update `apps/mcp-server/vitest.config.ts`:
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

**Key behavioural difference from current setup:** Tests now run inside the actual Workers runtime (`workerd`), not Node.js. This means:
- `nodejs_compat` must be in `wrangler.toml` if the code uses Node.js built-ins
- D1 bindings available as `env.DB` in test context — no need to mock at the SQLite level
- The `CLAUDE.md` rule "mock at `LegislatureDataProvider` boundary" remains correct and unchanged

**Critical CLAUDE.md note preserved:** The existing Vitest rejection test pattern (`.rejects` before `vi.runAllTimersAsync()`) and `toContain` assertion style on `nature`/`action` fields carry over verbatim.

_Source: [Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/), [Workers Vitest blog post](https://blog.cloudflare.com/workers-vitest-integration/)_

### Deployment and Operations Practices

**GitHub Actions CI/CD pipeline:**
```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
- run: pnpm test          # runs vitest in workers pool
  working-directory: apps/mcp-server
- run: wrangler d1 migrations apply on-record-cache --remote
  working-directory: apps/mcp-server
  if: github.ref == 'refs/heads/main'
- run: wrangler deploy
  working-directory: apps/mcp-server
  if: github.ref == 'refs/heads/main'
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

**Secrets management:** `wrangler secret put UGRC_API_KEY` stores the secret in Cloudflare's encrypted secret store. It is never in `wrangler.toml` or the repo. Accessed in code as `env.UGRC_API_KEY`.

**Observability:** Workers logs stream to Cloudflare's Workers Observability dashboard. The project's Pino logger writes structured JSON — `console.log` in Workers produces structured JSON logs natively. The existing `console.error`-only rule in `apps/mcp-server/` is consistent with Workers best practices.

_Source: [Advanced setups — CI/CD](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/), [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)_

### Cost Optimization and Resource Management

For on-record's workload profile:

| Usage dimension | Estimate | Plan impact |
|---|---|---|
| Cache refresh (scheduled) | ~1 write/bill × ~2,000 bills × daily | ~60K rows written/month |
| MCP tool reads | ~100 searches/day × ~50 rows scanned | ~150K rows read/month |
| Storage | ~2,000 bills × ~2 KB avg = ~4 MB | Well within 5 GB free |

**Verdict: Free tier is sufficient indefinitely for this workload.** The paid plan ($5/month) is only needed if daily row-write limits (100K/day free) are approached — which requires >3,000 bills updated daily.

Workers free tier: 100K requests/day, 10 ms CPU/request. The MCP server's lightweight query handlers fit easily within these limits. The scheduled handler runs once daily and counts as 1 request.

_Source: [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)_

### Risk Assessment and Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| `better-sqlite3` sync→async API mismatch causes bugs | Medium | Write tests first; D1 behaviour is well-documented |
| FTS5 MATCH queries behave differently in D1 | Low | D1 is full SQLite 3.x; FTS5 is identical |
| 10ms CPU limit exceeded during cache refresh | Low | Refresh is a `scheduled` handler with 15-second CPU budget (not 10ms) |
| int64 precision loss in D1 | Low | Bill IDs and district numbers are small integers; not affected |
| Cron Trigger timing precision | Low | ±30 second accuracy is fine for a daily cache refresh |
| Cold start latency for MCP tool calls | Low | Workers cold starts are ~5ms; isolate reuse is common at normal MCP usage rates |

_Source: [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)_

## Technical Research Recommendations

### Implementation Roadmap

1. **Day 1 — Scaffold:** `wrangler d1 create`, update `wrangler.toml`, run `wrangler types`, install `@cloudflare/vitest-pool-workers`
2. **Day 2–3 — Cache layer rewrite:** Replace `cache/*.ts` sync DB calls with async D1 API; update all call sites in `tools/`
3. **Day 4 — Scheduler migration:** Replace `node-cron` setup with `scheduled` export; test via `wrangler dev --test-scheduled`
4. **Day 5 — Test suite migration:** Update `vitest.config.ts` to workers pool; verify all existing tests pass
5. **Day 6 — Deploy + smoke test:** `wrangler deploy`, verify via Claude Desktop MCP connection
6. **Day 7 — Cleanup:** Remove `better-sqlite3`, `node-cron`, and any Node.js-specific startup code; update `CLAUDE.md` boundary rules

### Technology Stack Recommendations

| Component | Current | Recommended |
|---|---|---|
| Runtime | Node.js 20 | Cloudflare Workers (workerd) |
| Database driver | better-sqlite3 (sync) | D1 binding (async) |
| Scheduler | node-cron | Cron Trigger (`scheduled` export) |
| HTTP framework | Hono 4.12 | Hono 4.12 (unchanged — Hono is Workers-native) |
| Testing | Vitest + Node | `@cloudflare/vitest-pool-workers` |
| Local dev | ts-node / tsx | `wrangler dev` |
| Secrets | Environment variables | `wrangler secret` |

### Success Metrics and KPIs

- All existing Vitest tests pass in the `vitest-pool-workers` environment
- `wrangler deploy` completes without errors on `main` branch push
- MCP tool calls return results within 500ms end-to-end (includes D1 query)
- Cache refresh Cron Trigger fires daily and populates D1 with current legislative data
- Zero `better-sqlite3` or `node-cron` references remain in `apps/mcp-server/src/`
- Monthly D1 usage stays within free tier limits

---

## Summary

Cloudflare Workers is the planned deployment target for `apps/mcp-server`. The migration is
**additive** — the existing Node.js / `@hono/node-server` path stays intact for local development
and testing. Workers support is layered on top.

---

## Pricing / Storage

| Tier | Workers | D1 reads | D1 writes | D1 storage |
|---|---|---|---|---|
| Free | 100K req/day | 5M rows/day | 100K rows/day | 5 GB |
| Paid ($5/mo) | unlimited* | 25B rows/month | 50M rows/month | 1 TB |

On Record's cache (legislators + bills for 1–2 sessions) is tiny — well within the free tier at MVP
scale. No egress charges on D1.

---

## Migration Analysis

### What stays the same
- All Hono route logic (`app.post('/mcp', ...)` etc.) — already Workers-compatible
- All SQLite schema DDL — D1 is SQLite-compatible
- All query SQL in `cache/` — same syntax, just async
- MCP tool registrations (`tools/legislator-lookup.ts`, `tools/search-bills.ts`)
- Middleware logic (CORS, logging)

### What changes

| Component | Current | Workers target | Effort |
|---|---|---|---|
| HTTP adapter | `@hono/node-server` `serve()` | Remove; export `{ fetch: app.fetch }` | Low |
| Database driver | `better-sqlite3` (sync, native addon) | D1 binding (async) | Medium |
| Cron scheduling | `node-cron` inside process | `wrangler.toml` Cron Triggers + `scheduled()` handler | Low |
| Rate limiting | `hono-rate-limiter` (in-memory) | Cloudflare Rate Limiting API binding | Low |
| MCP session state | `Map<sessionId, transport>` (in-memory) | Fine for stateless MCP; Durable Objects if persistent sessions needed later | Low |
| `process.*` refs | `process.on`, `process.exit` | Remove / replace with Worker error handling | Low |
| Env validation | `validateEnv()` reading `process.env` | Cloudflare `env` object passed to `fetch(req, env)` | Low |

### Key insight: additive, not replacement
The `@hono/node-server` entrypoint (`index.ts`) continues to work for local dev.
A separate Workers entrypoint file (`worker.ts`) exports `{ fetch, scheduled }` using the same
Hono `app` instance. Build tooling (`wrangler`) handles bundling only the Workers path.

### D1 async migration pattern
`better-sqlite3` is synchronous; D1 is async. The `cache/` boundary (Boundary 4 per CLAUDE.md)
is well-isolated — changes are contained to `cache/db.ts`, `cache/schema.ts`, `cache/bills.ts`,
`cache/legislators.ts`, `cache/sessions.ts`, and `cache/refresh.ts`. No tool or provider files
need changes.

Mechanical pattern for each query:
```ts
// before (better-sqlite3)
const rows = db.prepare('SELECT * FROM bills WHERE session = ?').all(session)

// after (D1)
const { results } = await env.DB.prepare('SELECT * FROM bills WHERE session = ?').bind(session).all()
```

### Cron Triggers
`node-cron` callbacks (`scheduleLegislatorsRefresh`, `scheduleBillsRefresh`) map directly to
Cloudflare Cron Triggers. The `scheduled()` Worker handler replaces the cron registration;
`warmUpLegislatorsCache` and `warmUpBillsCache` are called unchanged (they only depend on the
db/provider interface, not the scheduler).

```toml
# wrangler.toml
[triggers]
crons = ["0 6 * * *", "0 * * * *"]
```

---

## FTS5 Compatibility Note

D1 supports FTS5 — the `bill_fts` virtual table and the JOIN query pattern used in
`cache/bills.ts` will work without modification.

---

## Deferred Decisions

- **Durable Objects for MCP sessions**: the current in-memory `transports` Map is fine for
  stateless Streamable HTTP MCP. If persistent SSE sessions are needed post-MVP, Durable Objects
  provide the solution but add cost ($0.15/million requests + storage).
- **KV vs D1**: KV was considered for simple key-value caching but D1 is the better fit given
  the relational schema (FTS5, composite PKs, indexes).
- **Wrangler build setup**: `wrangler` + `esbuild` bundle Workers from TypeScript directly;
  the existing `tsconfig` should be compatible with minor adjustments.

---

## Recommended Story Scope (when ready)

1. Add `wrangler.toml` + Workers entrypoint (`worker.ts`) — no cache changes yet
2. Migrate `cache/` to D1 async API — inject `D1Database` via the same dependency-injection
   pattern already used for `better-sqlite3`
3. Replace `node-cron` with `scheduled()` handler + Cron Triggers
4. Replace `hono-rate-limiter` with Cloudflare Rate Limiting binding
5. CI/CD: add `wrangler deploy` to GitHub Actions workflow
