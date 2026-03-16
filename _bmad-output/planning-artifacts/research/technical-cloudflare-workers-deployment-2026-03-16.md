---
stepsCompleted: [1]
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
