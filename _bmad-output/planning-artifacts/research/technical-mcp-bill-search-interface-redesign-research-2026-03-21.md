---
stepsCompleted: [1]
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
