# Story 9.2: Migrate Cache Layer to D1 Async API

Status: ready-for-dev

## Story

As a **developer**,
I want the cache layer rewritten to use D1's async API with Miniflare local simulation,
so that mcp-server executes correctly in Cloudflare Workers with `wrangler dev` as the full local development loop.

## Acceptance Criteria

1. **Given** the existing SQLite schema in cache/schema.ts **when** `migrations/001-initial-schema.sql` is created in `apps/mcp-server/` **then** it contains all DDL: bills, legislators, sessions, events tables, all indexes, and the `bill_fts` FTS5 virtual table
2. **And** `wrangler d1 migrations apply on-record-cache --local` applies it without errors
3. **And** the migration file is committed to version control

4. **Given** the cache/ files: db.ts, schema.ts, bills.ts, legislators.ts, sessions.ts, refresh.ts **when** they are rewritten to use D1 **then** all `better-sqlite3` synchronous calls are replaced with D1 async equivalents using the pattern `await env.DB.prepare('...').bind(...).all()` / `.first()` / `.run()`
5. **And** the `D1Database` binding is injected as a parameter (same DI pattern as the existing `Database` parameter — no module-level DB singleton in the Workers path)
6. **And** no `better-sqlite3` imports remain in any `cache/*.ts` file
7. **And** `cache/db.ts` is removed or repurposed (the D1 binding replaces the connection singleton)

8. **Given** the existing FTS5 bill search query **when** a `search_bills` tool call executes **then** the JOIN pattern is preserved unchanged: `FROM bill_fts JOIN bills b ON b.rowid = bill_fts.rowid WHERE bill_fts MATCH ? ORDER BY bill_fts.rank`
9. **And** the empty MATCH string guard returns early before executing the query

10. **Given** worker.ts and app.ts are updated to pass `env.DB` to cache functions **when** `wrangler dev` is run and an MCP tool call is made **then** the tool call returns a result using the local D1 simulation
11. **And** cache refresh (called via the scheduled stub or manually) populates the local D1 database

12. **Given** the updated vitest.config.mts **when** `pnpm --filter mcp-server test` is run **then** all tests pass
13. **And** error-path tests use `toContain` on `nature` and `action` fields (not type-only checks)
14. **And** tests with `mockReturnValue` include `toHaveBeenCalledWith` assertions

15. **Given** index.ts still references better-sqlite3 and node-cron **when** `pnpm --filter mcp-server dev` is run (Node.js path) **then** mcp-server starts without compile-time errors (the Node.js path is preserved but earmarked for decommission)

## Tasks / Subtasks

- [ ] Task 1: Create `migrations/001-initial-schema.sql` (AC 1–3)
  - [ ] Create `apps/mcp-server/migrations/` directory
  - [ ] Extract all DDL from `cache/schema.ts` into `migrations/001-initial-schema.sql`: bills, legislators, sessions, events tables + bill_fts FTS5 virtual table + all 3 indexes
  - [ ] Do NOT include migration logic (composite PK migration, `floor_sponsor_id` ALTER) — the migration is a clean schema for D1 (no legacy data to preserve)
  - [ ] Verify `wrangler d1 migrations apply on-record-cache --local` exits 0
  - [ ] Commit the migrations/ directory to git

- [ ] Task 2: Rewrite `cache/sessions.ts` to use D1 async API (AC 4–7)
  - [ ] Change all function signatures from `db: Database.Database` → `db: D1Database`
  - [ ] Replace `db.prepare(...).get(...)` → `await db.prepare(...).bind(...).first()`
  - [ ] Replace `db.prepare(...).all(...)` → `await db.prepare(...).bind(...).all()`
  - [ ] Replace `db.transaction()()` pattern with sequential `await db.prepare(...).run()` calls (D1 has no transaction wrapper — use `db.batch([...])` for atomic multi-statement operations)
  - [ ] Make all functions `async` and return `Promise<T>` instead of `T`
  - [ ] Remove `import type Database from 'better-sqlite3'`
  - [ ] `getActiveSession`, `isInSession`, `getSessionsForRefresh`, `seedSessions` all become async

- [ ] Task 3: Rewrite `cache/legislators.ts` to use D1 async API (AC 4–7)
  - [ ] Change all function signatures from `db: Database.Database` → `db: D1Database`
  - [ ] Remove `import { db } from './db.js'` and `import type Database from 'better-sqlite3'`
  - [ ] `getLegislatorsByDistrict`, `getLegislatorById`, `getLegislatorsByName` all become async, accepting `db: D1Database` as first param
  - [ ] Replace `.prepare().all()` sync → `await db.prepare().bind().all()` async
  - [ ] Replace `.prepare().get()` sync → `await db.prepare().bind().first()`
  - [ ] `writeLegislators(db, legislators)` becomes async; replace transaction with `db.batch([...])`
  - [ ] D1 row results: `.results` property on `.all()` response; `.first()` returns `T | null`

- [ ] Task 4: Rewrite `cache/bills.ts` to use D1 async API (AC 4–9)
  - [ ] Change all function signatures from `db: Database.Database` → `db: D1Database`
  - [ ] Remove `import { db } from './db.js'` and `import type Database from 'better-sqlite3'`
  - [ ] `getBillsBySponsor`, `getBillsBySession`, `searchBillsByTheme`, `searchBills` all become async, accepting `db: D1Database` as first param
  - [ ] `getActiveSessionId` signature must accept `db: D1Database` and become async: `async getActiveSessionId(db: D1Database): Promise<string>`
  - [ ] Replace all `.prepare().get()/.all()` sync calls with D1 async equivalents
  - [ ] `writeBills(db, bills)` becomes async; replace transaction + FTS5 rebuild with `db.batch([...])` then a separate `db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()`
  - [ ] Preserve FTS5 JOIN pattern unchanged (AC 8)
  - [ ] Preserve empty MATCH string guard (AC 9)
  - [ ] `searchBills` returns `Promise<SearchBillsResult>` (was synchronous)

- [ ] Task 5: Remove or repurpose `cache/db.ts` (AC 6–7)
  - [ ] Remove `cache/db.ts` entirely (no DB singleton needed in the Workers path)
  - [ ] Verify no non-test file imports from `./db.js` or `../cache/db.js`
  - [ ] `index.ts` already imports `db` from `./cache/db.js` — update to create/use `better-sqlite3` instance inline in `index.ts` for the Node.js path (it's earmarked for decommission but must remain compilable)

- [ ] Task 6: Rewrite `cache/refresh.ts` to use D1 async API (AC 4–7, AC 11)
  - [ ] Remove `import type Database from 'better-sqlite3'`
  - [ ] `warmUpLegislatorsCache(db: D1Database, provider)` and `warmUpBillsCache(db: D1Database, provider)` — update parameter types and await all cache function calls (now async)
  - [ ] `scheduleLegislatorsRefresh` and `scheduleBillsRefresh` are node-cron callers — they remain in place for the Node.js path but will need to pass a `D1Database`-compatible param OR we keep them Node.js-only with `Database` type (see DI note in Dev Notes)
  - [ ] `getSessionsForRefresh(db)` call in `warmUpBillsCache` becomes `await getSessionsForRefresh(db)`

- [ ] Task 7: Wire D1 binding into app.ts and worker.ts (AC 10–11)
  - [ ] Update `setupMcpServer` signature in `app.ts` to accept `db: D1Database` and pass it to tool registrations
  - [ ] Update tool registration functions (`registerLookupLegislatorTool`, `registerResolveAddressTool`, `registerSearchBillsTool`) to accept and close over `db: D1Database` parameter
  - [ ] In `worker.ts`, pass `env.DB` into `setupMcpServer` and cache warm-up calls
  - [ ] Remove the `// Workers path: left undefined until Story 9.2` comment from app.ts

- [ ] Task 8: Update `index.ts` to remain compilable on the Node.js path (AC 15)
  - [ ] `index.ts` must open its own `better-sqlite3` Database instance inline (db.ts is removed)
  - [ ] All cache function signatures are now `(db: D1Database, ...)` — Node.js path uses the `better-sqlite3` Database which must satisfy D1's interface OR we maintain a dual-type union approach
  - [ ] See DI Design Note below for the recommended approach

- [ ] Task 9: Update tests for D1 async API (AC 12–14)
  - [ ] Cache tests (`src/cache/**/*.test.ts`) currently use in-memory better-sqlite3 + `vi.mock('./db.js', () => ({ db: testDb }))` — rewrite to use D1 in-process testing via `@cloudflare/vitest-pool-workers` env.DB binding (move cache tests to workers pool) OR use `env.DB` from vitest's Miniflare integration
  - [ ] All async cache functions require `await` in tests
  - [ ] Update `vitest.config.mts` to move cache tests from node pool to workers pool (since `better-sqlite3` is no longer used in cache tests)
  - [ ] Error-path tests: use `toContain('key phrase')` on `nature`/`action` fields
  - [ ] Tests with `mockReturnValue`: add `toHaveBeenCalledWith` assertions
  - [ ] Update `schema.test.ts` — `initializeSchema` no longer exists (replaced by migration file); schema tests should verify D1 via workers pool

- [ ] Task 10: Create `apps/mcp-server/.dev.vars` template and D1 local setup instructions (AC 10)
  - [ ] Create `apps/mcp-server/.dev.vars.example` with placeholder values for UGRC_API_KEY, UTAH_LEGISLATURE_API_KEY, PORT, NODE_ENV
  - [ ] Verify `.dev.vars` is in `.gitignore` (not `.dev.vars.example`)
  - [ ] Apply migration locally: `wrangler d1 migrations apply on-record-cache --local`
  - [ ] Verify `wrangler dev` starts and MCP tool calls return results from local D1

- [ ] Task 11: Run `wrangler types` to update `worker-configuration.d.ts` (AC 5)
  - [ ] After any `wrangler.toml` changes (if any), run `wrangler types` from `apps/mcp-server/`
  - [ ] Update `database_id` placeholder in `wrangler.toml` once D1 DB is created via `wrangler d1 create on-record-cache`
  - [ ] Commit updated `worker-configuration.d.ts`

- [ ] Task 12: Final verification
  - [ ] `pnpm --filter mcp-server test` — all tests pass
  - [ ] `pnpm --filter mcp-server typecheck` — zero errors
  - [ ] `pnpm --filter mcp-server lint` — zero errors (no `better-sqlite3` imports in cache/ per ESLint boundary rule)
  - [ ] `wrangler deploy --dry-run` from `apps/mcp-server/` — bundle compiles without errors
  - [ ] `pnpm --filter mcp-server dev` (Node.js path) — server starts

## Dev Notes

### Critical: DI Pattern — D1 vs better-sqlite3 Type Compatibility

This is the central design challenge of the story. The existing pattern passes `db: Database.Database` (better-sqlite3) to cache functions. After rewrite, cache functions accept `db: D1Database`.

**Problem:** `index.ts` (Node.js path) still uses `better-sqlite3`, which has a different interface from D1. Both need to compile cleanly.

**Recommended approach — dual type with union or separate adapters:**

The cleanest path is to keep the Node.js path (index.ts) separate and earmarked for full decommission. For 9.2, the approach is:

1. Cache functions use `D1Database` as their parameter type — this is the authoritative Workers type.
2. `index.ts` is the only file that still needs `better-sqlite3`. For the Node.js path, create a thin shim in index.ts only that wraps a `better-sqlite3` Database with a D1-compatible interface, OR simply cast the `better-sqlite3` instance as `unknown as D1Database` in index.ts with a comment that this is earmarked for decommission.
3. A pragmatic approach: keep `cache/db.ts` alive but have it export a wrapper — see below.

**Simplest approach that preserves Node.js compilability:**

Keep a minimal `cache/db.ts` that exports a `createNodeDb()` function (for index.ts only) and does NOT export the `db` singleton. All cache functions change to accept `D1Database`. In `index.ts`, import `createNodeDb()`, open the better-sqlite3 DB, and cast it as `unknown as D1Database` — with a `// TODO: decommission Node.js path (post 9.5)` comment. This is acceptable because the Node.js path is fully earmarked for removal after 9.5.

**Important:** `D1Database` is a Workers-only type. `index.ts` must import it from `worker-configuration.d.ts` types OR from `@cloudflare/workers-types`. Since `worker-configuration.d.ts` is already committed and includes the `D1Database` type (it's part of the runtime types), index.ts can reference it. If TypeScript in the Node.js compilation context can't resolve `D1Database`, declare it as `interface D1Database {}` in a local type declaration file for the Node.js path only.

### D1 API Reference — Exact Patterns

```ts
// Read one row:
const row = await db.prepare('SELECT * FROM bills WHERE id = ? AND session = ?')
  .bind(id, session)
  .first<BillRow>()
// Returns: T | null

// Read many rows:
const result = await db.prepare('SELECT * FROM bills WHERE sponsor_id = ?')
  .bind(sponsorId)
  .all<BillRow>()
// Returns: { results: T[], success: boolean, meta: ... }
// Access rows via: result.results

// Write (INSERT/UPDATE/DELETE):
await db.prepare('INSERT OR REPLACE INTO bills (...) VALUES (?,...)')
  .bind(val1, val2, ...)
  .run()

// Batch (atomic multi-statement — replaces db.transaction()):
await db.batch([
  db.prepare('INSERT INTO legislators (...) VALUES (?,...)').bind(...),
  db.prepare('INSERT INTO legislators (...) VALUES (?,...)').bind(...),
])
// Note: batch() takes an array of D1PreparedStatement objects (from .prepare().bind())
// Each statement must be bound BEFORE passing to batch()

// FTS5 rebuild after bulk insert:
await db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
```

### Cache Function Signature Changes

Before (better-sqlite3, synchronous):
```ts
export function getBillsBySponsor(sponsorId: string): Bill[]
export function getActiveSessionId(): string
export function writeBills(db: Database.Database, bills: Bill[]): void
export function seedSessions(db: Database.Database): void
```

After (D1, async):
```ts
export async function getBillsBySponsor(db: D1Database, sponsorId: string): Promise<Bill[]>
export async function getActiveSessionId(db: D1Database): Promise<string>
export async function writeBills(db: D1Database, bills: Bill[]): Promise<void>
export async function seedSessions(db: D1Database): Promise<void>
```

**Breaking change for tools/:** Tools currently call `getBillsBySponsor(sponsorId)` and `getActiveSessionId()` (no db param, uses singleton). After this story, tools must be updated to call `getBillsBySponsor(db, sponsorId)` — the `db` must be passed from the tool registration closure.

### How tools receive D1 binding

The tool registration functions are called inside `setupMcpServer()`. For the Workers path, `env.DB` must flow from `worker.ts` → `app.ts` → tool registration.

Current `setupMcpServer` signature in app.ts:
```ts
export function setupMcpServer(registerTools: (server: McpServer) => void): void
```

After this story, the approach must thread `env.DB` (a `D1Database`) to the tool registrations. Two patterns:

**Pattern A — pass db into setupMcpServer:**
```ts
// app.ts
export function setupMcpServer(db: D1Database, registerTools: (server: McpServer) => void): void

// worker.ts
setupMcpServer(env.DB, (server) => {
  registerLookupLegislatorTool(server, env.DB)
  registerResolveAddressTool(server, env.DB)
  registerSearchBillsTool(server, env.DB)
})
```

**Pattern B — call setupMcpServer from worker.ts with env:**
```ts
// worker.ts
fetch(request: Request, env: Env, ctx: ExecutionContext) {
  if (!_mcpSetupDone) {
    setupMcpServer((server) => {
      registerLookupLegislatorTool(server, env.DB)
      ...
    })
  }
  return app.fetch(request, env, ctx)
}
```

Pattern A is simpler. Pattern B has the issue that env.DB changes per-request in theory (though it's the same binding). Use **Pattern A** — update `setupMcpServer` to accept `db: D1Database` as a first parameter, then pass it to each tool registration function. Each tool registration function gains a `db: D1Database` parameter and closes over it for use in handlers.

**index.ts (Node.js path):** calls `setupMcpServer(db as unknown as D1Database, (server) => { ... })` where `db` is the better-sqlite3 instance opened locally.

### Tool Registration Changes

Each tool registration function needs a `db` parameter:

```ts
// Before
export function registerSearchBillsTool(server: McpServer): void

// After
export function registerSearchBillsTool(server: McpServer, db: D1Database): void
```

Inside the tool handler, instead of calling `searchBills(params)` (which used the singleton), it calls `await searchBills(db, params)`.

The `getActiveSessionId()` call inside tool handlers also becomes `await getActiveSessionId(db)`.

### Schema Migration File Format

D1 migrations use the `wrangler d1 migrations` command. The migration file goes in `apps/mcp-server/migrations/` (configured via `wrangler.toml` if needed, or use the default `migrations/` path).

```sql
-- migrations/001-initial-schema.sql
-- Clean schema for D1 (no migration logic — fresh install)

CREATE TABLE IF NOT EXISTS legislators (
  id          TEXT    PRIMARY KEY,
  chamber     TEXT    NOT NULL,
  district    INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  phone_label TEXT,
  session     TEXT    NOT NULL,
  cached_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id               TEXT    NOT NULL,
  session          TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  summary          TEXT    NOT NULL,
  status           TEXT    NOT NULL,
  sponsor_id       TEXT    NOT NULL,
  floor_sponsor_id TEXT,
  vote_result      TEXT,
  vote_date        TEXT,
  cached_at        TEXT    NOT NULL,
  PRIMARY KEY (id, session)
);

CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
USING fts5(
  title,
  summary,
  content='bills',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  year       INTEGER NOT NULL,
  type       TEXT    NOT NULL,
  start_date TEXT    NOT NULL,
  end_date   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT    NOT NULL,
  district    TEXT,
  timestamp   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_start_end ON sessions (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bills_session ON bills (session);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id ON bills (sponsor_id);
```

Note: The `wrangler d1 migrations` command (not `wrangler d1 execute`) is the correct command — it tracks which migrations have been applied via a `d1_migrations` table. Use:
```sh
wrangler d1 migrations apply on-record-cache --local
```

### D1 FTS5 Compatibility

D1 is full SQLite 3.x — FTS5 is supported. The existing FTS5 virtual table and the JOIN query pattern from CLAUDE.md work without modification:

```sql
-- This exact query is preserved unchanged:
FROM bill_fts
JOIN bills b ON b.rowid = bill_fts.rowid
WHERE bill_fts MATCH ?
ORDER BY bill_fts.rank
```

The `"INSERT INTO bill_fts(bill_fts) VALUES('rebuild')"` rebuild command also works on D1 FTS5.

### Test Strategy — Moving Cache Tests to Workers Pool

After this story, `cache/*.test.ts` no longer use `better-sqlite3` — they should use the D1 binding from the workers pool environment. Update `vitest.config.mts`:

```ts
// Move cache tests to workers pool
{
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.toml' } })],
  test: {
    name: 'workers',
    include: [
      'src/middleware/**/*.test.ts',
      'src/tools/**/*.test.ts',
      'src/providers/**/*.test.ts',
      'src/env.test.ts',
      'src/app.test.ts',
      'src/worker.test.ts',
      'src/cache/**/*.test.ts',  // moved here from node pool
    ],
  },
},
{
  test: {
    name: 'node',
    include: [
      'src/lib/**/*.test.ts',  // only lib tests remain in node pool
    ],
    pool: 'forks',
  },
},
```

In the workers pool, the vitest environment provides `env.DB` as a real Miniflare D1 binding. Tests access it via:

```ts
import { env } from 'cloudflare:test'
// env.DB is a live D1Database backed by Miniflare's local SQLite
```

Before each test, apply the migration and seed data:
```ts
beforeAll(async () => {
  // Apply schema migration to test D1
  await env.DB.exec(migrationSql) // or use wrangler migrations apply mechanism
})
```

**Alternative simpler approach:** Import the SQL migration file content directly and execute it in `beforeAll`:
```ts
import { readFileSync } from 'node:fs'
const schemaSql = readFileSync(new URL('../../../migrations/001-initial-schema.sql', import.meta.url), 'utf-8')
await env.DB.exec(schemaSql)
```

However, since the workers pool runs in Miniflare (not Node.js), `readFileSync` may not be available. A simpler approach: inline the schema SQL in a test fixture or import it as a raw string via a Vite plugin/import.

**Safest approach for test setup:** Call `env.DB.exec()` with the schema SQL inlined in the test file's `beforeAll`. Or create a shared `setupD1Schema(db: D1Database)` helper in `cache/schema.ts` that runs the DDL programmatically (calling `db.batch([...])`) — this can replace `initializeSchema(db: Database.Database)` and be callable from both tests and the migration script generator.

### ESLint Boundary Rule Compliance

After this story, no `better-sqlite3` imports remain in `cache/*.ts`. The ESLint boundary rule in CLAUDE.md says:

> better-sqlite3 imports confined to `apps/mcp-server/src/cache/` only (Boundary 4)

After migration, `better-sqlite3` only remains in `index.ts` (earmarked for decommission). This means the ESLint rule may need to be updated to allow `better-sqlite3` in `index.ts` OR the cast approach (`as unknown as D1Database`) eliminates the need for `better-sqlite3` type imports in any file other than `index.ts`. Verify the lint config doesn't block this.

### No console.log in apps/mcp-server/

CLAUDE.md enforces: `console.log` FORBIDDEN in `apps/mcp-server/` — only `console.error` is allowed (ESLint enforced). Use `logger.info`/`logger.warn`/`logger.error` from `./lib/logger.js`.

### wrangler d1 create — database_id placeholder

The `wrangler.toml` currently has `database_id = "placeholder-replace-in-9.2"`. This story must:
1. Create the D1 database: `wrangler d1 create on-record-cache`
2. Replace the placeholder with the real database_id from the command output
3. Re-run `wrangler types` to update `worker-configuration.d.ts`
4. Commit both files

For local dev, the `database_id` doesn't matter — Miniflare creates a local DB regardless. But the real ID is needed for `wrangler deploy` (Story 9.5). Get it now.

### D1 batch() for transactions

D1 does not support `db.transaction()()` (better-sqlite3 syntax). Use `db.batch([])` for atomic multi-statement operations:

```ts
// writeLegislators — atomic batch insert:
await db.batch(
  legislators.map((leg) =>
    db.prepare(`INSERT OR REPLACE INTO legislators (...) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(leg.id, leg.chamber, leg.district, leg.name, leg.email, leg.phone, leg.phoneLabel ?? null, leg.session, cachedAt)
  )
)

// writeBills — batch insert + FTS5 rebuild:
const stmts = bills.map((bill) =>
  db.prepare(`INSERT OR REPLACE INTO bills (...) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(bill.id, bill.session, ...)
)
// batch the inserts...
await db.batch(stmts)
// ...then rebuild FTS5 separately (must be after all inserts commit)
await db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
```

Note: `db.batch()` is atomic but has a maximum of 100 statements per batch. If `bills.length > 100`, split into chunks.

### 9.1 Completion Notes That Impact 9.2

Key learnings from Story 9.1 that this story must build on:

- **`setupMcpServer` DI pattern:** `app.ts` uses `_registerTools` callback set by `setupMcpServer()`. This story extends that pattern to thread `db: D1Database` through to tool registrations.
- **Tools transitively import `cache/db.ts`:** Story 9.1 noted that app.ts cannot statically import tools because they transitively import `cache/db.ts` which uses `__dirname`. After this story, `cache/db.ts` is removed/repurposed, so this restriction lifts. However, tool registration is still done via the `setupMcpServer` injection pattern — do not change that architecture.
- **worker.ts validates env.DB:** `worker.ts` already validates `env.DB` exists and returns 500 if missing. This validation remains correct.
- **Dual-pool vitest:** `vitest.config.mts` has workers pool + node pool. Cache tests must move from node pool to workers pool in this story.
- **ESLint: no console.log:** All new code must use `logger.*` from `./lib/logger.js`.

### Node.js Path Preservation Notes

The Node.js path (`index.ts` + `better-sqlite3`) must compile cleanly after this story. However, runtime correctness of the Node.js path is less critical — it's earmarked for decommission after Story 9.5. The acceptance criterion is "mcp-server starts without compile-time errors."

The key challenge: cache functions now accept `D1Database`. In index.ts, the better-sqlite3 `Database` instance must be cast or adapted. Use `as unknown as D1Database` in index.ts — acceptable for a decommission-bound code path. Add a prominent `// TODO: Node.js path — decommission after 9.5` comment.

## File List

| File | Action | Notes |
|------|--------|-------|
| `apps/mcp-server/migrations/001-initial-schema.sql` | CREATE | D1 migration — all DDL for fresh schema |
| `apps/mcp-server/src/cache/db.ts` | DELETE or MODIFY | Remove singleton export; may keep as thin Node.js helper for index.ts |
| `apps/mcp-server/src/cache/schema.ts` | MODIFY or REPLACE | Replace `initializeSchema(db: Database.Database)` with D1-compatible helper OR delete if migration file is the sole DDL authority |
| `apps/mcp-server/src/cache/sessions.ts` | MODIFY | All functions async, accept `db: D1Database`, remove better-sqlite3 import |
| `apps/mcp-server/src/cache/legislators.ts` | MODIFY | All functions async, accept `db: D1Database`, remove better-sqlite3 imports |
| `apps/mcp-server/src/cache/bills.ts` | MODIFY | All functions async, accept `db: D1Database`, remove better-sqlite3 imports |
| `apps/mcp-server/src/cache/refresh.ts` | MODIFY | Async cache calls, accept `D1Database`, remove better-sqlite3 type imports |
| `apps/mcp-server/src/app.ts` | MODIFY | `setupMcpServer` accepts `db: D1Database` parameter; tool registration wired with db |
| `apps/mcp-server/src/worker.ts` | MODIFY | Call `setupMcpServer(env.DB, ...)` and pass env.DB to warm-up calls; implement warm-up on first request or in scheduled handler |
| `apps/mcp-server/src/index.ts` | MODIFY | Open better-sqlite3 DB inline (db.ts gone); cast as `unknown as D1Database`; initializeSchema/seedSessions calls updated |
| `apps/mcp-server/src/tools/legislator-lookup.ts` | MODIFY | Accept `db: D1Database` param; await async cache calls |
| `apps/mcp-server/src/tools/resolve-address.ts` | MODIFY | Accept `db: D1Database` param if it uses cache functions; await async calls |
| `apps/mcp-server/src/tools/search-bills.ts` | MODIFY | Accept `db: D1Database` param; await `searchBills(db, params)`, `getActiveSessionId(db)` |
| `apps/mcp-server/src/cache/sessions.test.ts` | MODIFY | Use `env.DB` from workers pool; async test patterns |
| `apps/mcp-server/src/cache/legislators.test.ts` | MODIFY | Use `env.DB` from workers pool; async test patterns |
| `apps/mcp-server/src/cache/bills.test.ts` | MODIFY | Use `env.DB` from workers pool; async test patterns |
| `apps/mcp-server/src/cache/schema.test.ts` | MODIFY | Update for D1 — schema now applied via migration |
| `apps/mcp-server/src/cache/refresh.test.ts` | MODIFY | Use `env.DB` from workers pool; async patterns |
| `apps/mcp-server/vitest.config.mts` | MODIFY | Move cache tests from node pool to workers pool |
| `apps/mcp-server/wrangler.toml` | MODIFY | Replace `database_id` placeholder with real D1 database ID |
| `apps/mcp-server/worker-configuration.d.ts` | REGENERATED | Re-run `wrangler types` after wrangler.toml change |
| `apps/mcp-server/.dev.vars.example` | CREATE | Template for local secrets (gitignored `.dev.vars` is the real file) |
| `pnpm-lock.yaml` | MODIFIED (auto) | Updated if any new deps added |

## Dev Agent Record

### Completion Notes

_To be filled in by dev agent_

### Change Log

| Date | Change | Reason |
|------|--------|--------|
