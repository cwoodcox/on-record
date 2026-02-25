# Story 1.3: SQLite Cache Schema Initialization

Status: ready-for-dev

## Story

As a **developer**,
I want the SQLite database schema initialized automatically on server startup,
so that the cache infrastructure is ready to store legislators, bills, and analytics events before any tool is invoked.

## Acceptance Criteria

1. Given the MCP server starts for the first time, when the SQLite database initializes, then the `legislators` table exists with columns: `id`, `chamber`, `district`, `name`, `email`, `phone`, `phone_label`, `session`, `cached_at`
2. The `bills` table exists with columns: `id`, `session`, `title`, `summary`, `status`, `sponsor_id`, `vote_result`, `vote_date`, `cached_at`
3. The `bill_fts` FTS5 virtual table exists, built over `bills.title` and `bills.summary`
4. The `events` table exists with columns: `id`, `event_type`, `district`, `timestamp`
5. All column names are `snake_case`
6. Indexes exist: `idx_bills_session` on `bills(session)` and `idx_bills_sponsor_id` on `bills(sponsor_id)`
7. `data/on-record.db` is in `.gitignore` (already satisfied by Story 1.1 — verify it remains)
8. All direct `better-sqlite3` imports are confined to `apps/mcp-server/src/cache/` — no `better-sqlite3` imports in tool modules or anywhere else outside `cache/`
9. Schema initialization is idempotent — safe to call on every server restart (`CREATE TABLE IF NOT EXISTS`, `CREATE VIRTUAL TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)

## Tasks / Subtasks

- [ ] Task 1: Install better-sqlite3 and types (AC: 8)
  - [ ] Install `better-sqlite3` v12.6.2 as a production dependency in `apps/mcp-server`
  - [ ] Install `@types/better-sqlite3` as a dev dependency in `apps/mcp-server`
  - [ ] Verify installation: `pnpm --filter mcp-server typecheck` exits 0

- [ ] Task 2: Create the `apps/mcp-server/src/cache/` directory and `schema.ts` (AC: 1, 2, 3, 4, 5, 6, 8, 9)
  - [ ] Create directory `apps/mcp-server/src/cache/`
  - [ ] Create `apps/mcp-server/src/cache/schema.ts` with the `initializeSchema(db: Database)` function
  - [ ] Implement `legislators` table DDL with all 9 required columns, all `snake_case`
  - [ ] Implement `bills` table DDL with all 9 required columns, all `snake_case`
  - [ ] Implement `bill_fts` FTS5 virtual table DDL over `bills.title` and `bills.summary`
  - [ ] Implement `events` table DDL with all 4 required columns, all `snake_case`
  - [ ] Implement both indexes: `idx_bills_session` and `idx_bills_sponsor_id`
  - [ ] All DDL statements use `CREATE TABLE IF NOT EXISTS`, `CREATE VIRTUAL TABLE IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`
  - [ ] Wrap all statements in a single transaction for atomicity and performance
  - [ ] No `console.log` anywhere in `schema.ts` — use pino logger or no logging at schema level

- [ ] Task 3: Create `apps/mcp-server/src/cache/db.ts` — DB connection singleton (AC: 8)
  - [ ] Create `apps/mcp-server/src/cache/db.ts` that opens the SQLite database at `data/on-record.db`
  - [ ] Use `mkdirSync` with `{ recursive: true }` to ensure `data/` directory exists before opening DB
  - [ ] Export a singleton `db` instance of type `Database.Database`
  - [ ] WAL mode enabled: `db.pragma('journal_mode = WAL')` for read concurrency
  - [ ] No `better-sqlite3` import outside this file and other `cache/` modules

- [ ] Task 4: Integrate schema initialization into server startup (AC: 1–6, 9)
  - [ ] Import `initializeSchema` from `cache/schema.ts` in `apps/mcp-server/src/index.ts`
  - [ ] Import the `db` singleton from `cache/db.ts`
  - [ ] Call `initializeSchema(db)` at server startup, before Hono begins accepting requests (Story 1.2 sets up Hono — this integrates with that startup sequence)
  - [ ] Confirm the call is idempotent: stopping and restarting the server does not produce errors

- [ ] Task 5: Write `apps/mcp-server/src/cache/schema.test.ts` (AC: 1–6, 8, 9)
  - [ ] Create `apps/mcp-server/src/cache/schema.test.ts`
  - [ ] Open an in-memory SQLite database for tests: `new Database(':memory:')`
  - [ ] Test: all 4 tables are created after `initializeSchema(db)` is called
  - [ ] Test: `initializeSchema(db)` is idempotent — calling it twice does not throw
  - [ ] Test: `legislators` table has all required columns (`id`, `chamber`, `district`, `name`, `email`, `phone`, `phone_label`, `session`, `cached_at`)
  - [ ] Test: `bills` table has all required columns (`id`, `session`, `title`, `summary`, `status`, `sponsor_id`, `vote_result`, `vote_date`, `cached_at`)
  - [ ] Test: `events` table has all required columns (`id`, `event_type`, `district`, `timestamp`)
  - [ ] Test: `bill_fts` virtual table exists and can be queried
  - [ ] Test: `idx_bills_session` index exists
  - [ ] Test: `idx_bills_sponsor_id` index exists
  - [ ] Run `pnpm --filter mcp-server test` — all tests pass

- [ ] Task 6: Verify `.gitignore` and boundary enforcement (AC: 7, 8)
  - [ ] Confirm `data/on-record.db`, `*.db-shm`, and `*.db-wal` remain in root `.gitignore`
  - [ ] Confirm `data/on-record.db` does NOT exist in the repository (gitignored)
  - [ ] Audit: grep for `better-sqlite3` imports across `apps/mcp-server/src/` — confirm imports exist ONLY in `cache/` files
  - [ ] Run `pnpm --filter mcp-server typecheck` — zero TypeScript errors

## Dev Notes

### Scope — What Story 1.3 IS and IS NOT

**Story 1.3 scope:**
- Install `better-sqlite3` v12.6.2 and `@types/better-sqlite3`
- Create `apps/mcp-server/src/cache/schema.ts` — DDL for all 4 tables + 2 indexes
- Create `apps/mcp-server/src/cache/db.ts` — DB connection singleton with WAL mode
- Integrate schema initialization into server startup (`apps/mcp-server/src/index.ts`)
- Write `schema.test.ts` using in-memory SQLite
- Enforce cache/ module boundary (only `cache/` touches `better-sqlite3`)

**NOT in Story 1.3 (handled in subsequent stories):**
- Story 2.3: Writing legislators data to the `legislators` table (cache population)
- Story 3.2: Writing bills data to the `bills` and `bill_fts` tables (cache population)
- Story 3.2: Hourly node-cron refresh scheduler (`cache/refresh.ts`)
- Story 7.3: Writing analytics events to the `events` table (`routes/events.ts`)
- Any read queries from cache — those belong with the tools that consume them
- `cache/legislators.ts` and `cache/bills.ts` — created in Stories 2.3 and 3.2 respectively

This story creates the schema structure only. The `data/` directory and DB file are created at runtime; the file is gitignored.

### Package Installation

**Install exact pinned versions:**
```bash
# From monorepo root
pnpm --filter mcp-server add better-sqlite3@12.6.2
pnpm --filter mcp-server add -D @types/better-sqlite3
```

After installation, verify `apps/mcp-server/package.json` contains:
```json
{
  "dependencies": {
    "@on-record/types": "workspace:*",
    "better-sqlite3": "^12.6.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "..."
  }
}
```

**Note:** `better-sqlite3` requires a native addon build. pnpm will run `node-gyp` during installation. This requires Python and build tools available on the system. If the install fails with a build error, install build tools (`xcode-select --install` on macOS) and retry. The `pnpm.onlyBuiltDependencies` list in root `package.json` (established in Story 1.1) controls which packages are allowed to run post-install scripts — add `better-sqlite3` to this list if required.

### DB Connection Singleton — `cache/db.ts`

```typescript
// apps/mcp-server/src/cache/db.ts
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Resolve path relative to the package root (apps/mcp-server/data/on-record.db)
const dataDir = join(import.meta.dirname, '..', '..', 'data')
const dbPath = join(dataDir, 'on-record.db')

// Ensure the data/ directory exists before opening the DB
mkdirSync(dataDir, { recursive: true })

export const db: Database.Database = new Database(dbPath)

// WAL mode for read concurrency — required for multiple readers during cache warm-up
db.pragma('journal_mode = WAL')
```

**Important path notes:**
- `import.meta.dirname` is available in Node 20+ with `"module": "NodeNext"` in tsconfig
- The DB file lands at `apps/mcp-server/data/on-record.db` — this path is already in `.gitignore` at root as `data/on-record.db`
- In tests, this file is NOT used — tests pass their own in-memory Database instance directly to `initializeSchema(db)`

**Note on `import.meta.dirname`:** If `import.meta.dirname` is not available in the TypeScript target, use `fileURLToPath(new URL('.', import.meta.url))` as an alternative. Both patterns require `"moduleResolution": "NodeNext"` in tsconfig, which is already set in `packages/typescript-config/node.json`.

### Schema DDL — `cache/schema.ts`

```typescript
// apps/mcp-server/src/cache/schema.ts
import type Database from 'better-sqlite3'

export function initializeSchema(db: Database.Database): void {
  db.transaction(() => {
    // --- legislators table ---
    // Stores cached legislator data. Populated by cache/legislators.ts (Story 2.3).
    // Refreshed daily at 6 AM via node-cron (Story 2.3).
    db.exec(`
      CREATE TABLE IF NOT EXISTS legislators (
        id          TEXT    PRIMARY KEY,
        chamber     TEXT    NOT NULL,   -- 'house' | 'senate'
        district    INTEGER NOT NULL,
        name        TEXT    NOT NULL,
        email       TEXT    NOT NULL,
        phone       TEXT    NOT NULL,
        phone_label TEXT,               -- NULL when API provides no label (FR5)
        session     TEXT    NOT NULL,
        cached_at   TEXT    NOT NULL    -- ISO 8601 datetime
      )
    `)

    // --- bills table ---
    // Stores cached bill data. Populated by cache/bills.ts (Story 3.2).
    // Refreshed hourly via node-cron (Story 3.2).
    db.exec(`
      CREATE TABLE IF NOT EXISTS bills (
        id          TEXT    PRIMARY KEY,
        session     TEXT    NOT NULL,
        title       TEXT    NOT NULL,
        summary     TEXT    NOT NULL,
        status      TEXT    NOT NULL,
        sponsor_id  TEXT    NOT NULL,   -- FK-style reference to legislators.id
        vote_result TEXT,               -- NULL if no vote recorded
        vote_date   TEXT,               -- ISO 8601 date, NULL if no vote recorded
        cached_at   TEXT    NOT NULL    -- ISO 8601 datetime
      )
    `)

    // --- bill_fts virtual table ---
    // FTS5 virtual table for full-text search over bill titles and summaries.
    // Supports FR8 theme keyword search (healthcare, education, housing, etc.).
    // Populated and kept in sync by cache/bills.ts (Story 3.2) via FTS5 content table.
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
      USING fts5(
        title,
        summary,
        content='bills',
        content_rowid='rowid'
      )
    `)

    // --- events table ---
    // Anonymous analytics events. Written by routes/events.ts (Story 7.3).
    // Never contains PII — district_id only, no addresses (FR39, NFR7).
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type  TEXT    NOT NULL,   -- 'session_initiated' | 'draft_generated' | 'message_delivered'
        district    TEXT,               -- optional district_id for geographic analytics
        timestamp   TEXT    NOT NULL    -- ISO 8601 datetime
      )
    `)

    // --- indexes ---
    // idx_bills_session: used by bills cache queries scoped to a session
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bills_session
      ON bills (session)
    `)

    // idx_bills_sponsor_id: used by per-legislator sponsor index (FR11)
    // Enables sub-2-second bill lookups by legislator without a full session scan
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id
      ON bills (sponsor_id)
    `)
  })()
}
```

**Critical DDL details:**
- Every `CREATE TABLE` uses `IF NOT EXISTS` — idempotent, safe on restart
- `CREATE VIRTUAL TABLE IF NOT EXISTS` — idempotent FTS5 creation
- `CREATE INDEX IF NOT EXISTS` — idempotent index creation
- All column names are `snake_case` without exception
- The FTS5 `content='bills'` + `content_rowid='rowid'` configuration links the virtual table to the `bills` table as a content table — this means FTS5 reads from `bills` for indexing, reducing storage duplication. Story 3.2 must maintain FTS5 sync via triggers or explicit `INSERT INTO bill_fts(bill_fts) VALUES('rebuild')` after bulk loads
- All statements are wrapped in a single transaction for atomicity — if any statement fails, the transaction rolls back

### FTS5 Virtual Table Notes

The `bill_fts` table uses FTS5 (Full-Text Search, version 5) — SQLite's built-in full-text search engine. The configuration used here is a **content table** pattern:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
USING fts5(
  title,
  summary,
  content='bills',
  content_rowid='rowid'
)
```

- `content='bills'`: FTS5 reads document content from the `bills` table rather than storing its own copy
- `content_rowid='rowid'`: maps FTS5 rows to `bills.rowid`
- This avoids duplicating title/summary storage
- **Story 3.2 responsibility**: After populating or updating the `bills` table, Story 3.2 must rebuild the FTS5 index with `INSERT INTO bill_fts(bill_fts) VALUES('rebuild')`. This story only creates the virtual table structure.
- FTS5 supports prefix queries, phrase queries, and Boolean operators — Story 3.3 will use these for theme keyword search

### Integration with Hono Server Startup (Story 1.2)

Story 1.2 sets up the Hono server with environment validation, rate limiting, CORS, and pino logging. Story 1.3's schema initialization hooks into that startup sequence.

The `apps/mcp-server/src/index.ts` file (currently a placeholder from Story 1.1, replaced by Story 1.2) will include schema initialization before the server begins accepting requests:

```typescript
// apps/mcp-server/src/index.ts (illustrative — Story 1.2 owns this file)
// Story 1.3 adds these two lines to the startup sequence:
import { db } from './cache/db.js'
import { initializeSchema } from './cache/schema.js'

// Called once at startup, before Hono listens
initializeSchema(db)
logger.info({ source: 'cache' }, 'SQLite schema initialized')

// ... rest of Hono setup (rate limiting, CORS, MCP transport) from Story 1.2
```

**Startup order:**
1. Story 1.2: Environment validation (`env.ts` zod schema) — must run first; fails fast on missing vars
2. Story 1.3: DB connection opened (`cache/db.ts`) + schema initialized (`cache/schema.ts`)
3. Story 1.2: Hono app configured (middleware: rate-limit, CORS, pino request logging)
4. Story 1.2: MCP transport registered on Hono
5. Story 1.2: Hono listens on configured port

If Story 1.3 is implemented before Story 1.2 replaces `index.ts`, the agent may temporarily wire schema init into the Story 1.1 placeholder. That placeholder will be replaced when Story 1.2 is implemented. The important constraint is: schema initialization must complete before any MCP tool is invoked.

### `data/` Directory Creation

The `data/` directory does not exist in the repository (it is gitignored via `data/on-record.db`). The DB connection singleton (`cache/db.ts`) creates it at runtime using `mkdirSync` with `{ recursive: true }`:

```typescript
mkdirSync(dataDir, { recursive: true })
```

This is safe to call every time the process starts — if the directory already exists, `mkdirSync` with `recursive: true` does not throw. This eliminates the need for a pre-flight existence check.

The DB file path is: `apps/mcp-server/data/on-record.db`

After the server starts for the first time, the directory structure will be:
```
apps/mcp-server/
├── data/               ← created by mkdirSync at runtime
│   └── on-record.db    ← created by better-sqlite3 at first connection
├── src/
│   ├── cache/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   └── schema.test.ts
│   └── index.ts
```

### Cache/ Module Boundary Enforcement

**Architecture rule (Boundary 4 from architecture.md):**
> Only `cache/` modules touch the database directly. No direct `better-sqlite3` imports outside `cache/`.

This rule must be enforced by the developer and verified during code review. The ESLint config from Story 1.1 does not yet have an import restriction rule for `better-sqlite3` — that can be added in Story 1.5 if desired. For now, enforcement is by convention and audit.

**How to audit:**
```bash
# From monorepo root — should ONLY show files in apps/mcp-server/src/cache/
grep -r "from 'better-sqlite3'" apps/mcp-server/src/
grep -r "require('better-sqlite3')" apps/mcp-server/src/
```

Expected output: only lines in `apps/mcp-server/src/cache/db.ts` and `apps/mcp-server/src/cache/schema.ts` (and test files in `cache/`).

**Why this matters:** Tool modules (`tools/legislator-lookup.ts`, `tools/bill-search.ts`) must never import `better-sqlite3` directly. They call functions from `cache/legislators.ts` and `cache/bills.ts` (created in Stories 2.3 and 3.2). This keeps the data layer swappable and unit tests mockable at the `LegislatureDataProvider` boundary.

### Testing Approach

Tests use an **in-memory SQLite database** — they do NOT use the `db` singleton from `cache/db.ts`. This ensures tests are isolated, fast, and never write to `data/on-record.db`.

```typescript
// apps/mcp-server/src/cache/schema.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'

describe('initializeSchema', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')  // fresh in-memory DB per test
  })

  it('creates the legislators table', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='legislators'"
    ).get()
    expect(result).toBeDefined()
  })

  it('creates the bills table', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bills'"
    ).get()
    expect(result).toBeDefined()
  })

  it('creates the bill_fts virtual table', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bill_fts'"
    ).get()
    expect(result).toBeDefined()
  })

  it('creates the events table', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
    ).get()
    expect(result).toBeDefined()
  })

  it('is idempotent — calling twice does not throw', () => {
    expect(() => {
      initializeSchema(db)
      initializeSchema(db)
    }).not.toThrow()
  })

  it('creates idx_bills_session index', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_session'"
    ).get()
    expect(result).toBeDefined()
  })

  it('creates idx_bills_sponsor_id index', () => {
    initializeSchema(db)
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_sponsor_id'"
    ).get()
    expect(result).toBeDefined()
  })

  it('legislators table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(legislators)').all() as Array<{ name: string }>
    const names = columns.map(c => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'chamber', 'district', 'name', 'email', 'phone', 'phone_label', 'session', 'cached_at'])
    )
  })

  it('bills table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(bills)').all() as Array<{ name: string }>
    const names = columns.map(c => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'session', 'title', 'summary', 'status', 'sponsor_id', 'vote_result', 'vote_date', 'cached_at'])
    )
  })

  it('events table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(events)').all() as Array<{ name: string }>
    const names = columns.map(c => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'event_type', 'district', 'timestamp'])
    )
  })
})
```

**Note on mock boundary:** This is the one place where `better-sqlite3` is used directly in tests — `schema.test.ts` is a `cache/` test and is explicitly testing the schema DDL. This is correct. Unit tests for `tools/` and `providers/` must NOT import `better-sqlite3`; they mock at the `LegislatureDataProvider` interface boundary instead.

### Column Type Reference

| Table | Column | SQLite Type | Notes |
|---|---|---|---|
| `legislators` | `id` | `TEXT PRIMARY KEY` | Legislator ID from Utah Legislature API |
| `legislators` | `chamber` | `TEXT NOT NULL` | `'house'` or `'senate'` |
| `legislators` | `district` | `INTEGER NOT NULL` | District number |
| `legislators` | `name` | `TEXT NOT NULL` | Full name |
| `legislators` | `email` | `TEXT NOT NULL` | Contact email |
| `legislators` | `phone` | `TEXT NOT NULL` | Phone number |
| `legislators` | `phone_label` | `TEXT` | Nullable — `NULL` when type unknown (FR5) |
| `legislators` | `session` | `TEXT NOT NULL` | e.g. `'2025GS'` |
| `legislators` | `cached_at` | `TEXT NOT NULL` | ISO 8601 datetime |
| `bills` | `id` | `TEXT PRIMARY KEY` | Bill ID (e.g. `'HB0234'`) |
| `bills` | `session` | `TEXT NOT NULL` | e.g. `'2025GS'` |
| `bills` | `title` | `TEXT NOT NULL` | Bill title (indexed by FTS5) |
| `bills` | `summary` | `TEXT NOT NULL` | Bill summary (indexed by FTS5) |
| `bills` | `status` | `TEXT NOT NULL` | e.g. `'Enrolled'`, `'Failed'` |
| `bills` | `sponsor_id` | `TEXT NOT NULL` | Legislator ID — FK-style to `legislators.id` |
| `bills` | `vote_result` | `TEXT` | Nullable — `NULL` if no vote recorded |
| `bills` | `vote_date` | `TEXT` | Nullable ISO 8601 date |
| `bills` | `cached_at` | `TEXT NOT NULL` | ISO 8601 datetime |
| `events` | `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Auto-generated |
| `events` | `event_type` | `TEXT NOT NULL` | Closed enum: `session_initiated`, etc. |
| `events` | `district` | `TEXT` | Nullable — geographic analytics only |
| `events` | `timestamp` | `TEXT NOT NULL` | ISO 8601 datetime |

### TypeScript/better-sqlite3 Import Pattern

better-sqlite3 is a CommonJS module. With `"moduleResolution": "NodeNext"` in tsconfig, import it as:

```typescript
import Database from 'better-sqlite3'
```

Use the type `Database.Database` for the instance type:
```typescript
import type Database from 'better-sqlite3'

function initializeSchema(db: Database.Database): void { ... }
```

Or combined:
```typescript
import Database from 'better-sqlite3'
// Database is both the constructor and the namespace
const db: Database.Database = new Database(':memory:')
```

### WAL Mode

The `db.ts` singleton enables WAL (Write-Ahead Logging) mode:
```typescript
db.pragma('journal_mode = WAL')
```

WAL mode is recommended for this application because:
- It allows concurrent readers while a write is in progress
- Cache warm-up (Story 2.3, 3.2) writes to SQLite while MCP tools read from it simultaneously
- WAL mode is persistent — once set, it stays for the DB file lifetime
- It produces two additional files (`data/on-record.db-shm`, `data/on-record.db-wal`) — both are in `.gitignore` already from Story 1.1

### Critical Constraints — DO NOT VIOLATE

1. **No `console.log` in `apps/mcp-server/`** — ESLint enforces `no-console: ['error', { allow: ['error'] }]`. Schema initialization is silent (no logging needed at this level) or uses pino if the logger is available. Do not add any `console.log` calls.

2. **`better-sqlite3` imports confined to `cache/`** — Tool modules, provider modules, middleware, routes, and `index.ts` must never import `better-sqlite3`. They call functions from `cache/` modules.

3. **All DDL uses `IF NOT EXISTS`** — Schema init runs on every restart. Without `IF NOT EXISTS`, the server would crash on every restart after the first.

4. **TypeScript strict mode** — `initializeSchema(db: Database.Database): void` must be explicitly typed. No `any`. `PRAGMA table_info()` query results should be typed as `Array<{ name: string }>` (or a more complete PRAGMA result type).

5. **`data/on-record.db` must remain gitignored** — Do not commit the DB file. The `.gitignore` entry from Story 1.1 handles this; do not remove it.

6. **In-memory DB for tests** — `schema.test.ts` uses `new Database(':memory:')`. Never import or use the `db` singleton from `cache/db.ts` in tests.

### Project Structure Notes

**Files created by Story 1.3:**
```
apps/mcp-server/
├── src/
│   ├── cache/                    ← new directory
│   │   ├── db.ts                 ← DB singleton, WAL mode, data/ mkdir
│   │   ├── schema.ts             ← initializeSchema(db) — DDL for 4 tables + 2 indexes
│   │   └── schema.test.ts        ← in-memory DB tests
│   └── index.ts                  ← modified: schema init added to startup
└── data/                         ← created at runtime, gitignored
    └── on-record.db              ← created at runtime, gitignored
```

**Files created in future stories that build on this schema:**
```
apps/mcp-server/src/cache/
├── legislators.ts    ← Story 2.3: writes to legislators table
├── legislators.test.ts
├── bills.ts          ← Story 3.2: writes to bills + bill_fts tables
├── bills.test.ts
├── refresh.ts        ← Story 3.2: node-cron scheduler
└── refresh.test.ts
```

**Alignment with architecture.md:**
- `apps/mcp-server/src/cache/schema.ts` — matches architecture.md "Complete Project Directory Structure"
- Boundary 4 enforced: only `cache/` modules touch `better-sqlite3`
- WAL mode + `data/` mkdir matches architecture.md "Data Architecture" guidance

### References

- Architecture: SQLite cache decision and rationale [Source: `_bmad-output/planning-artifacts/architecture.md` → "Data Architecture"]
- Architecture: SQLite schema (logical) [Source: `architecture.md` → "Data Architecture" → "Schema (logical)"]
- Architecture: Index naming conventions [Source: `architecture.md` → "Naming Patterns" → "Database Naming (SQLite)"]
- Architecture: Boundary 4 — only cache/ modules touch DB [Source: `architecture.md` → "Architectural Boundaries"]
- Architecture: complete directory structure [Source: `architecture.md` → "Complete Project Directory Structure"]
- Architecture: no-console rule [Source: `architecture.md` → "MCP Server Logging Rule"]
- Architecture: test mock boundary at LegislatureDataProvider [Source: `architecture.md` → "Testing Pyramid & Mock Boundary"]
- Architecture: WAL mode and concurrent readers [Source: `architecture.md` → "Data Architecture" rationale]
- Architecture: date format (ISO 8601 strings) [Source: `architecture.md` → "Format Patterns"]
- Architecture: null vs undefined (SQLite NULL → `null` in results) [Source: `architecture.md` → "Format Patterns"]
- Epics: Story 1.3 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md` → "Story 1.3"]
- Story 1.1: `.gitignore` entries (`data/on-record.db`, `*.db-shm`, `*.db-wal`) [Source: `_bmad-output/implementation-artifacts/1-1-initialize-pnpm-workspaces-monorepo.md` → "Dev Notes" → ".gitignore"]
- Story 1.2: Hono server startup sequence — schema init hooks in before listening [Source: `epics.md` → "Story 1.2"]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
