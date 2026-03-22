---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'MCP Bill Search Interface Redesign for Flexible Legislative Content Search'
research_goals: 'Determine how to redesign the search_bills MCP tool to support searching any bill by topic or number with optional sponsor filtering, and identify best interface patterns for an atomic composable MCP tool design'
user_name: 'Corey'
date: '2026-03-21'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-21
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

## Technical Research Scope Confirmation

**Research Topic:** MCP Bill Search Interface Redesign for Flexible Legislative Content Search
**Research Goals:** Determine how to redesign the search_bills MCP tool to support searching any bill by topic or number with optional sponsor filtering, and identify best interface patterns for an atomic composable MCP tool design

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-21

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

### Programming Languages & Runtimes

The existing stack is **TypeScript 5.7 (strict mode)** on **Node.js 20+**. These are non-negotiable constraints — no language changes are in scope. TypeScript's strict mode with `z.infer<>` means the tool parameter types are derived directly from the Zod schema, so changing the Zod schema automatically updates the handler's TypeScript types.

_Source: [`apps/mcp-server/tsconfig.json`], [TypeScript 5.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)_

### Development Frameworks and Libraries

**@modelcontextprotocol/sdk 1.26.0** — The MCP SDK uses `server.tool(name, zodSchema, handler)` registration. The Zod schema is transformed into JSON Schema on the wire. Optional parameters use `.optional()` on individual Zod fields; `.default()` can supply fallback values. The SDK validates inputs before the handler runs.

**Known gotcha:** The SDK requires Zod v4 as a peer dependency. Mixing Zod v3 and v4 in a pnpm workspace causes type errors. The project currently uses `zod (latest)` — must verify this resolves to v4 to avoid `ZodType` property mismatch errors.

**Zod schema pattern for optional filters:**
```typescript
{
  query: z.string().min(1).describe('Freeform search term'),
  sponsorId: z.string().optional().describe('Filter to a specific legislator by ID'),
  billId:    z.string().optional().describe('Exact bill ID (e.g. "HB0001")'),
  session:   z.string().optional().describe('Legislative session (e.g. "2025GS")'),
  limit:     z.number().int().positive().max(20).default(5).describe('Max results to return'),
}
```

_Sources: [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), [Agentailor MCP guide](https://blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide), [Zod docs](https://zod.dev/)_

### Database and Storage Technologies

**SQLite via better-sqlite3 12.6.2** — All bill data lives in a local SQLite cache. Key schema facts:

| Table | Purpose |
|---|---|
| `bills` | Canonical store: composite PK `(id, session)`, indexed on `sponsor_id` and `session` |
| `bill_fts` | FTS5 virtual content table (content=`bills`) — indexes `title` + `summary` |

**FTS5 capabilities relevant to this redesign:**

- `MATCH` supports freeform terms, phrases, prefix search, and boolean operators (`OR`, `AND`, `NOT`)
- BM25 ranking via `ORDER BY bill_fts.rank` (lower = more relevant)
- Column weighting: `bm25(bill_fts, 2.0, 1.0)` weights title matches higher than summary matches
- **Optional SQL filters** combine cleanly with MATCH: add `AND b.sponsor_id = ?` only when sponsorId is provided
- Empty MATCH string throws SQLite syntax error — early-return guard is already established in the codebase and must be preserved
- Existing `idx_bills_sponsor_id` and `idx_bills_session` indexes make sponsor and session filters fast

**Bill number (ID) lookup** — bills have an `id` field (e.g., `HB0001`). This is a direct equality query on the indexed `id` column, not an FTS5 query. The two search modes (text search vs. bill ID lookup) are fundamentally different query paths:

```sql
-- Text/topic search path
SELECT b.* FROM bill_fts JOIN bills b ON b.rowid = bill_fts.rowid
WHERE bill_fts MATCH ?
  [AND b.sponsor_id = ?]   -- optional
  [AND b.session = ?]      -- optional
ORDER BY bill_fts.rank

-- Bill ID lookup path
SELECT * FROM bills
WHERE id = ?
  [AND session = ?]        -- optional, to disambiguate across sessions
```

_Sources: [SQLite FTS5 Docs](https://www.sqlite.org/fts5.html), [FTS5 ranking best practices](https://www.slingacademy.com/article/ranking-results-in-sqlite-full-text-search-best-practices/), [FTS5 in practice](https://thelinuxcode.com/sqlite-full-text-search-fts5-in-practice-fast-search-ranking-and-real-world-patterns/)_

### Development Tools and Platforms

- **Vitest 4.0.18** — unit tests mock at `LegislatureDataProvider`, never SQLite directly. New cache functions must follow same pattern.
- **ESLint 9 flat config** — `console.log` forbidden in `apps/mcp-server/`; `no-restricted-imports` rules for better-sqlite3 boundary enforcement
- **pnpm workspaces** — shared types live in `packages/types/`; `SearchBillsResult` and `Bill` are the public type contract

### Technology Adoption Trends

**MCP tool atomicity** is increasingly emphasized in the protocol community. The [arXiv paper on MCP tool description smells](https://arxiv.org/html/2602.14878) (Feb 2026) identifies several anti-patterns directly present in the current `search_bills` implementation:

1. **Enumerating valid values** — The `THEME_QUERIES` hard-coded map effectively treats a fixed taxonomy as the only valid input. Already flagged in the Epic 3 retrospective and CLAUDE.md.
2. **Overly constrained required parameters** — Forcing `legislatorId` as required conflates filtering with search mode, preventing the tool from being used for general bill discovery.
3. **Combining search modes** — A single tool that does both "find bills about topic X for legislator Y" and "find any bill about topic X" has different semantics; explicit optional parameters are cleaner than two tools.

The community consensus (MCP best practices, MCP spec 2025-11-25) favors **one tool per well-scoped operation** with optional filters over multiple narrow tools — consistent with a single redesigned `search_bills` tool that accepts optional `sponsorId` and optional `billId`.

_Sources: [MCP Official Spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25), [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/), [arXiv MCP Tool Description Smells](https://arxiv.org/html/2602.14878), [MikesBlog MCP Practices](https://oshea00.github.io/posts/mcp-practices/)_

---

## Integration Patterns Analysis

### MCP Tool ↔ Cache Layer Interface

The integration boundary between the MCP tool handler (`tools/search-bills.ts`) and the cache layer (`cache/bills.ts`) is a synchronous function call — better-sqlite3 is synchronous by design. The current function signature is:

```typescript
searchBillsByTheme(sponsorId: string, theme: string): Bill[]
```

For the redesigned tool, this function must change to accept optional filters. The integration contract needs to be renegotiated across three layers:

| Layer | Current | Redesigned |
|---|---|---|
| Tool parameter schema | `{ legislatorId: string, theme: string }` | `{ query?: string, billId?: string, sponsorId?: string, session?: string, limit?: number }` |
| Cache function signature | `searchBillsByTheme(sponsorId, theme)` | `searchBills(params: SearchBillsParams): Bill[]` |
| Response shape | `{ bills, legislatorId, session }` | `{ bills, session }` (legislatorId removed — not always applicable) |

The `SearchBillsResult` type lives in `packages/types/` and is part of the public contract with the system prompt. Changing `legislatorId` to optional (or removing it) requires updating both the type definition and `apps/web` if it consumes the field. This is a cross-package integration concern.

_Sources: [`apps/mcp-server/src/tools/search-bills.ts`], [`apps/mcp-server/src/cache/bills.ts`], [`packages/types/index.ts`]_

### Query Mode Dispatch Pattern

The redesigned tool must dispatch to one of two fundamentally different query modes based on which parameters are provided:

**Mode A — Bill ID lookup** (when `billId` is provided):
```typescript
// Direct equality query — no FTS5 involved
SELECT * FROM bills WHERE id = ? [AND session = ?]
```

**Mode B — Full-text search** (when `query` is provided):
```typescript
SELECT b.* FROM bill_fts JOIN bills b ON b.rowid = bill_fts.rowid
WHERE bill_fts MATCH ?
  [AND b.sponsor_id = ?]    -- only when sponsorId provided
  [AND b.session = ?]       -- only when session provided
ORDER BY bill_fts.rank
LIMIT ?
```

The dispatch logic in the cache function should be explicit and mutually exclusive:
```typescript
if (params.billId) {
  return lookupBillById(params.billId, params.session)
}
if (!params.query) {
  return []   // guard: nothing to search
}
return fullTextSearch(params)
```

This avoids a combined conditional-everything function that becomes unmaintainable. Two internal helper functions, one public entry point.

_Sources: [Arcade.dev 54 MCP Tool Patterns](https://www.arcade.dev/blog/mcp-tool-patterns), [`apps/mcp-server/src/cache/bills.ts`]_

### Dynamic WHERE Clause Construction

For the FTS5 search path, optional SQL filters must be appended conditionally using parameterized queries (never string interpolation):

```typescript
function buildSearchQuery(params: SearchBillsParams): { sql: string; args: unknown[] } {
  const conditions: string[] = ['bill_fts MATCH ?']
  const args: unknown[] = [params.query]

  if (params.sponsorId) {
    conditions.push('b.sponsor_id = ?')
    args.push(params.sponsorId)
  }
  if (params.session) {
    conditions.push('b.session = ?')
    args.push(params.session)
  }

  const where = conditions.join(' AND ')
  const sql = `
    SELECT b.id, b.session, b.title, b.summary, b.status,
           b.sponsor_id, b.vote_result, b.vote_date
    FROM bill_fts
    JOIN bills b ON b.rowid = bill_fts.rowid
    WHERE ${where}
    ORDER BY bill_fts.rank
    LIMIT ?
  `
  args.push(params.limit ?? 5)
  return { sql, args }
}
```

This pattern is validated by both the SQLite FTS5 docs and the Sling Academy dynamic query guide. It preserves parameterized safety, keeps the BM25 JOIN pattern (required per CLAUDE.md), and is idiomatic better-sqlite3.

**Critical guards that must be preserved:**
- Empty `query` string → early return `[]` before any SQL (empty MATCH throws SQLite syntax error)
- `billId` empty string → early return `[]` (prevents meaningless wildcard query)

_Sources: [SQLite FTS5 Docs](https://www.sqlite.org/fts5.html), [Sling Academy Dynamic Queries](https://www.slingacademy.com/article/filtering-data-dynamically-in-sqlite-queries/), [Sling Academy FTS5 Advanced](https://www.slingacademy.com/article/leveraging-advanced-fts5-features-for-dynamic-queries-in-sqlite/)_

### Response Shape & Type Contract Integration

The current `SearchBillsResult` shape is:
```typescript
{ bills: Bill[], legislatorId: string, session: string }
```

`legislatorId` at the top level is awkward when sponsor filtering is optional — it's not always meaningful. Two redesign options:

**Option A — Remove `legislatorId`** (breaking change to the type contract):
```typescript
{ bills: Bill[], session: string }
```
Requires updating `packages/types/index.ts`, `apps/web` consumers, and the system prompt.

**Option B — Make `legislatorId` optional** (backward-compatible):
```typescript
{ bills: Bill[], legislatorId?: string, session: string }
```
Safer migration path; existing consumers continue to work.

Both options still include `session` — this is important context for the LLM to know which session's bills are being returned, since bill IDs repeat across sessions.

The `session` value should come from `getActiveSessionId()` when not overridden by the caller (same as today), or from the `session` parameter when explicitly provided.

_Sources: [`packages/types/index.ts`], [MCP Spec - Tool Output Schemas](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)_

### LegislatureDataProvider Boundary & Test Integration

The test architecture mocks at the `LegislatureDataProvider` boundary — this is a codebase invariant (per CLAUDE.md). The cache layer is tested indirectly through the provider mock. The new `searchBills` cache function must follow the same pattern:

- Unit tests for `search-bills.ts` tool: mock `searchBillsByTheme` (or its replacement) at the module boundary
- Cache layer tests: use an in-memory SQLite instance with seed data (current pattern for `bills.ts` tests)
- No test should touch the production SQLite file directly

The `THEME_QUERIES` expansion map removal means existing tests that pass theme strings like `'healthcare'` will need updating — those tests currently assert on the expanded FTS5 query, not the raw theme. Removing the map simplifies both the implementation and the tests.

_Sources: [CLAUDE.md - Testing conventions], [`apps/mcp-server/src/cache/bills.ts`]_

### Tool Description ↔ LLM Behavior Integration

Tool descriptions are not just documentation — they shape LLM behavior. The [arXiv paper on tool description smells](https://arxiv.org/html/2602.14878) and MCP best practices both confirm this. The redesigned tool description must:

1. **Not enumerate** valid query patterns (avoids the current problem where `THEME_QUERIES` categories become the only valid inputs in the LLM's mental model)
2. **Clarify mode selection** — when to use `billId` vs `query`, without being prescriptive about categories
3. **Describe `sponsorId` as a filter**, not a required identifier — the LLM should understand it narrows results, not that it defines the search domain

Example description direction:
> "Search Utah legislative bills by topic or look up a specific bill by number. Use `query` for freeform topic searches (e.g. 'housing affordability', 'water rights'). Use `billId` to look up a specific bill (e.g. 'HB0042'). Optionally filter by `sponsorId` to limit results to a specific legislator's bills."

_Sources: [arXiv MCP Tool Description Smells](https://arxiv.org/html/2602.14878), [Klavis AI Less is More Patterns](https://www.klavis.ai/blog/less-is-more-mcp-design-patterns-for-ai-agents), [CLAUDE.md - LLM tool descriptions]_

---

## Architectural Patterns and Design

### System Architecture Patterns

The redesign touches three distinct layers of the system. Understanding their boundaries is critical to scoping the change correctly:

```
┌─────────────────────────────────────────┐
│  MCP Tool Layer (apps/mcp-server/tools/)│
│  search-bills.ts — parameter schema,    │
│  dispatch logic, error handling, retry  │
├─────────────────────────────────────────┤
│  Cache Layer (apps/mcp-server/cache/)   │
│  bills.ts — SQL query construction,     │
│  FTS5 access, row mapping, guards       │
├─────────────────────────────────────────┤
│  Type Contract (packages/types/)        │
│  SearchBillsResult, Bill — shared       │
│  between tool layer and consumers       │
└─────────────────────────────────────────┘
```

The MCP protocol mandates a **two-handler separation**: a `ListToolsRequestSchema` handler (returns tool definitions + schemas) and a `CallToolRequestSchema` handler (executes tool logic). The `server.tool()` registration in the TypeScript SDK encapsulates both. Changes to the Zod schema automatically update both what the SDK advertises to clients and what the handler validates.

**Architectural principle confirmed**: Each MCP server should have one clear purpose; each tool within it should have one well-scoped operation. The redesigned `search_bills` satisfies this — it is the single entry point for all bill discovery operations, with mode determined by which optional parameters the LLM provides.

_Sources: [MCP Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture), [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/), [Atlan MCP Server Guide](https://atlan.com/know/mcp-server-implementation-guide/)_

### Design Principles and Best Practices

**Parameter dispatch as internal routing, not API surface**: The Toolhost pattern (consolidating operations behind one dispatcher with an `op` parameter) is a recognized MCP pattern but has a UX cost — it pushes routing decisions to the caller. For our case, the mode is *inferred* from which optional parameters are populated, not explicitly named. This is cleaner for LLMs because:
- Providing `billId` naturally implies "look this up" — no explicit `mode` param needed
- Providing `query` naturally implies "search for this" — same
- The tool description guides the LLM to understand when to use each

**Function decomposition in the cache layer**: The current monolithic `searchBillsByTheme(sponsorId, theme)` should be decomposed into:
1. One public entry point: `searchBills(params: SearchBillsParams): Bill[]`
2. Two private helpers: `lookupBillById(id, session?)` and `runFtsSearch(params)`
3. Guards at the entry point before any SQL

This follows the repository pattern principle of a slim public interface with focused internal implementations. The cache layer is a "disposable read index" (not source of truth) — all writes go through `writeBills()`, all reads through `searchBills()` and `getBillsBySponsor()`.

**Better-sqlite3 architectural constraint**: All better-sqlite3 code is confined to `apps/mcp-server/src/cache/` (CLAUDE.md Boundary 4). The tool layer cannot import or instantiate the db directly. This is correctly enforced today via `getActiveSessionId()` being a wrapper in `cache/bills.ts` — the same pattern applies to `searchBills`.

_Sources: [Glassbead Toolhost Pattern](https://glassbead-tc.medium.com/design-patterns-in-mcp-toolhost-pattern-59e887885df3), [Sentry Atomic Repositories](https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript/), [DEV - SQLite as AI Cache](https://dev.to/queelius/the-mcp-pattern-sqlite-as-the-ai-queryable-cache-34g6)_

### FTS5 Content Table Architecture

The existing `bill_fts` is an **external content table** (`content='bills'`). Key architectural implications for the redesign:

- The FTS5 index stores tokens only; column text is retrieved by JOIN back to `bills` — the current JOIN query pattern (per CLAUDE.md) is architecturally correct, not just a preference
- The `rowid` mapping between `bill_fts` and `bills` is stable because `bills` uses a composite PK `(id, session)` with an implicit rowid that only changes on VACUUM — the hourly refresh uses `INSERT OR REPLACE` which creates new rowids on replace, making the FTS5 rebuild necessary after each write batch (already done)
- **No schema changes are needed** to the FTS5 table itself — the index already covers `title` and `summary`, which is the right content for topic search. Column weighting (`bm25(bill_fts, 2.0, 1.0)`) could be introduced as an optimization but is not required for correctness

The trigger-based sync pattern (INSERT/UPDATE/DELETE triggers) was not chosen for this project — the rebuild-after-bulk-write approach is correct for a batch-refresh model where all writes happen in a single scheduled transaction.

_Sources: [SQLite FTS5 Docs](https://www.sqlite.org/fts5.html), [FTS5 External Content Tables](https://sqlite.work/optimizing-fts5-external-content-tables-and-vacuum-interactions/), [FTS5 Structure Analysis](https://darksi.de/13.sqlite-fts5-structure/)_

### Scalability and Performance Patterns

This is an embedded SQLite cache on a single-process MCP server — horizontal scaling is not a concern. Performance considerations are:

| Query path | Expected scale | Bottleneck |
|---|---|---|
| FTS5 topic search (no sponsor filter) | ~1,000 bills/session, 1-2 sessions | FTS5 BM25 scan, effectively O(matching docs) |
| FTS5 topic search + sponsor filter | Same, filtered post-MATCH | Negligible — `idx_bills_sponsor_id` speeds the join |
| Bill ID lookup | Direct PK equality | O(1) — composite PK is indexed |

No new indexes are needed. The `idx_bills_sponsor_id` already serves the optional sponsor filter. Adding a `session` filter uses `idx_bills_session`.

The `LIMIT ?` parameter (defaulting to 5, max configurable) is applied at the SQL level, not in TypeScript `.slice()` — moving the limit into SQL is a correctness improvement: it prevents fetching 1,000 rows and discarding 995.

_Sources: [SQLite FTS5 Docs - bm25](https://www.sqlite.org/fts5.html), [Sling Academy FTS5 Ranking](https://www.slingacademy.com/article/ranking-results-in-sqlite-full-text-search-best-practices/)_

### Data Architecture Patterns

**`SearchBillsResult` redesign decision**: Based on integration pattern analysis (Step 3), the recommended approach is **Option B** — make `legislatorId` optional:

```typescript
// packages/types/index.ts
export interface SearchBillsResult {
  bills: Bill[]
  legislatorId?: string   // present only when sponsorId filter was applied
  session: string
}
```

Rationale:
- Backward-compatible: existing consumers (apps/web, system prompt) continue to work without change
- Semantically correct: `legislatorId` is only meaningful when sponsor filtering was applied
- The `session` field remains required — essential context since bill IDs repeat across sessions

**`SearchBillsParams` new type** (internal to mcp-server, or in packages/types if needed by tests):
```typescript
interface SearchBillsParams {
  query?: string      // FTS5 topic search term
  billId?: string     // exact bill ID lookup
  sponsorId?: string  // optional filter
  session?: string    // optional session override
  limit?: number      // defaults to 5
}
```

_Sources: [`packages/types/index.ts`], [MCP Spec Output Schema](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), [Repository Pattern TypeScript](https://www.abdou.dev/blog/the-repository-pattern-with-typescript)_

### Migration Architecture

The change is additive at the API surface (new optional params) with one breaking change (`legislatorId` required → optional in result). Migration approach:

**Phase 1 — Cache layer refactor** (internal, no interface change yet):
- Add `SearchBillsParams` type
- Implement `searchBills(params)` alongside existing `searchBillsByTheme` (keep old function until tool is updated)
- Remove `THEME_QUERIES` map inside new function

**Phase 2 — Tool layer update**:
- Change Zod schema: `legislatorId` → `sponsorId` (optional), add `query` (optional), add `billId` (optional)
- Update handler to call `searchBills(params)` instead of `searchBillsByTheme`
- Update `SearchBillsResult` construction: `legislatorId` populated only when `sponsorId` provided

**Phase 3 — Type contract update** (packages/types):
- Make `SearchBillsResult.legislatorId` optional
- Remove old `searchBillsByTheme` from cache layer

**Phase 4 — System prompt update**:
- Update `agent-instructions.md` to reflect new tool parameters and capabilities

This phased approach ensures each step is independently testable and reviewable.

_Sources: [CLAUDE.md - Architectural Rules], [MCP Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)_

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

The redesign adopts an **additive migration** strategy — new capabilities are added as optional parameters, and the existing required-parameter path remains functional until it is explicitly removed. This is the TypeScript community's recommended approach for evolving shared interfaces:

1. Add new optional fields (`field?: type`) — existing callers compile and run unchanged
2. Mark deprecated fields with `/** @deprecated */` JSDoc — surfaces warnings in IDEs without breaking builds
3. Remove deprecated fields in a subsequent story after all consumers have migrated

This approach avoids a "big bang" cutover and is particularly important here because `SearchBillsResult` is consumed by both `apps/mcp-server` (the tool itself) and potentially `apps/web` (if it renders search results). Both can be updated incrementally.

The `THEME_QUERIES` map removal is the one genuinely **breaking internal change** — it changes how the FTS5 query is constructed. Mitigation: the new `searchBills` function coexists with the old `searchBillsByTheme` until all callers are migrated (Phase 1 keeps both, Phase 2 removes the old one).

_Sources: [Michael's Coding Spot - TypeScript API Change](https://michaelscodingspot.com/typescript-api-change/), [Saleae - Versioning TypeScript Types](https://blog.saleae.com/versioning-typescript-types/), [Speakeasy - TypeScript Forward Compatibility](https://www.speakeasy.com/blog/typescript-forward-compatibility)_

### Development Workflows and Tooling

All changes stay within the pnpm workspace monorepo. No new packages or dependencies are required — the redesign uses only existing tools: TypeScript 5.7, Zod, better-sqlite3, Vitest 4.0.18.

**File-level deliverables per phase:**

| Phase | Files changed |
|---|---|
| 1 — Cache refactor | `apps/mcp-server/src/cache/bills.ts` |
| 2 — Tool update | `apps/mcp-server/src/tools/search-bills.ts` |
| 3 — Type contract | `packages/types/index.ts` |
| 4 — System prompt | `apps/mcp-server/src/system-prompt/agent-instructions.md` (path TBC) |

No new files need to be created. No barrel files. No new packages to install (no `pnpm install` run needed).

ESLint rules already enforce the architectural boundaries (no `console.log`, better-sqlite3 import confinement). The redesigned functions stay within `cache/` and `tools/` — no boundary violations.

_Sources: [CLAUDE.md - Coding Conventions], [pnpm workspaces docs](https://pnpm.io/workspaces)_

### Testing and Quality Assurance

**Tool layer tests (`search-bills.test.ts`):**

The test pattern mocks at the module boundary. With Vitest, `vi.mock` is hoisted — it replaces the cache module before any test code runs:

```typescript
vi.mock('../cache/bills', () => ({
  searchBills: vi.fn(),
  getActiveSessionId: vi.fn().mockReturnValue('2025GS'),
}))
```

Per CLAUDE.md: every `mockReturnValue` must be accompanied by `toHaveBeenCalledWith` to verify correct args — `mockReturnValue` returns the same thing regardless of args.

**Error-path test key phrases** (per CLAUDE.md, must be specified in story AC):
- When neither `query` nor `billId` provided → `nature` should contain `'no search criteria'` (or similar phrase TBD in AC)
- When FTS5 query fails → existing `'legislature-api'` source error handling applies

**Cache layer tests (`bills.test.ts`):**

Use `new Database(':memory:')` in `beforeEach`, run schema DDL (same SQL as `schema.ts`), seed with known bill rows, close in `afterEach`:

```typescript
let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.exec(CREATE_TABLES_SQL)           // same DDL as schema.ts
  db.exec(`INSERT INTO bill_fts(bill_fts) VALUES('rebuild')`)
  // seed known bills for query mode tests
})

afterEach(() => db.close())
```

FTS5 on `:memory:` works in better-sqlite3 if compiled with `ENABLE_FTS5` — this is already verified in the project (existing bills.ts tests pass). No change needed.

**Test coverage matrix for the redesigned tool:**

| Scenario | Test type | Mock target |
|---|---|---|
| `query` only → FTS5 search, no sponsor filter | Unit | `searchBills` mock |
| `query` + `sponsorId` → filtered FTS5 | Unit | `searchBills` mock |
| `billId` only → ID lookup | Unit | `searchBills` mock |
| `billId` + `session` → session-scoped lookup | Unit | `searchBills` mock |
| Neither `query` nor `billId` → error | Unit | No mock needed |
| Empty `query` string → error | Unit | No mock needed |
| FTS5 error → AppError response | Unit | `searchBills` throws |
| FTS5 with sponsor filter (SQL) | Cache unit | in-memory SQLite |
| Bill ID lookup (SQL) | Cache unit | in-memory SQLite |
| Empty MATCH guard | Cache unit | in-memory SQLite |

_Sources: [Vitest Mocking Guide](https://vitest.dev/guide/mocking), [MCPcat Unit Testing MCP Servers](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/), [DEV - Integration Testing SQLite In-Memory](https://dev.to/rukykf/integration-testing-with-nodejs-jest-knex-and-sqlite-in-memory-databases-2ila)_

### Deployment and Operations Practices

No deployment changes. The MCP server runs as a single Node.js process with stdio transport. The cache refresh schedule (hourly cron) is unchanged. The redesigned `searchBills` function is synchronous (better-sqlite3), so no async plumbing changes.

The retry logic in the tool handler (`retryWithDelay(fn, 2, 1000)`) wraps the cache call — unchanged. The cache function never throws on empty results (returns `[]`), so retry is only triggered by unexpected errors.

**Operational risk**: None introduced. All changes are within the MCP server process. No network calls added. Cache warm-up and refresh are unaffected.

_Sources: [CLAUDE.md - NFR17 stale cache], [`apps/mcp-server/src/cache/refresh.ts`]_

### Risk Assessment and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `THEME_QUERIES` removal breaks existing conversations mid-session | Medium | Low | Theme strings pass through as-is to FTS5 — most themes still match naturally |
| FTS5 syntax error on malformed `query` | Low | Medium | Empty-string guard already exists; catch block returns `[]` on FTS5 error |
| `legislatorId` optional breaks `apps/web` consumer | Low | Low | Make optional (backward-compatible); web still receives field when sponsor filter used |
| Zod version mismatch (`v3` vs `v4`) | Low | High | Verify `zod (latest)` resolves to v4 before implementing; check `pnpm why zod` |
| Test coverage gap on bill ID lookup path | Medium | Medium | Explicitly spec coverage matrix in story AC |

_Sources: [CLAUDE.md - Coding Conventions], [GitHub - Zod version mismatch MCP SDK issue #796](https://github.com/modelcontextprotocol/typescript-sdk/issues/796)_

## Technical Research Recommendations

### Implementation Roadmap

Based on all five research steps, the recommended implementation sequence is:

1. **Cache layer first** — implement `searchBills(params: SearchBillsParams)` with both query modes; write cache-layer unit tests with in-memory SQLite; keep `searchBillsByTheme` temporarily
2. **Tool layer second** — update Zod schema (optional params), update handler dispatch, update result construction, update tool tests with Vitest mocks
3. **Type contract third** — make `SearchBillsResult.legislatorId` optional in `packages/types/`; mark `@deprecated`; verify `apps/web` still compiles
4. **System prompt fourth** — update `agent-instructions.md` to describe new capabilities without enumerating query categories
5. **Cleanup** — remove `searchBillsByTheme`, remove `THEME_QUERIES` map, update frontmatter

This is a single story (not an epic) — all phases can be implemented and reviewed together in one PR.

### Technology Stack Recommendations

No changes to the technology stack. The existing stack (TypeScript, Zod, better-sqlite3, FTS5, Vitest) fully supports the redesigned interface. Specifically:

- **Zod `.optional()`** handles the schema changes
- **FTS5 + conditional WHERE** handles the query mode dispatch at SQL level
- **better-sqlite3 in-memory** handles cache-layer test isolation
- **Vitest `vi.mock`** handles tool-layer test isolation

### Success Metrics and KPIs

| Metric | Target |
|---|---|
| `search_bills` works without `sponsorId` | ✅ Verified by new unit tests |
| Bill ID lookup returns correct bill | ✅ Verified by cache-layer tests |
| No regressions on existing sponsor-filtered search | ✅ Verified by updated existing tests |
| `THEME_QUERIES` map removed | ✅ Code deleted |
| Tool description contains no enumerated categories | ✅ Code review checklist |
| All Vitest tests pass | ✅ CI green |
| `packages/types` compiles without errors across workspace | ✅ `pnpm build` clean |
