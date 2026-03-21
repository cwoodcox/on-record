---
stepsCompleted: [1, 2, 3]
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
