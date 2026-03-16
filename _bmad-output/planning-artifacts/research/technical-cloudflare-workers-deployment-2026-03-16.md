---
research_type: 'technical'
research_topic: 'Cloudflare Workers deployment platform for mcp-server'
date: '2026-03-16'
---

# Research Report: Cloudflare Workers Deployment Platform

**Date:** 2026-03-16
**Research Type:** Technical

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
