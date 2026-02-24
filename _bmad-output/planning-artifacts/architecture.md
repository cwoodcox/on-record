---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowType: 'architecture'
project_name: 'write-your-legislator'
user_name: 'Corey'
date: '2026-02-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
40 FRs across 8 categories: Constituent Identification (FR1–5), Legislative Research (FR6–11), Guided Issue Discovery (FR12–16), Message Composition (FR17–21), Message Delivery (FR22–24), Chatbot Platform Integration / BYOLLM (FR25–28, FR40), Onboarding & Public Discovery (FR29–33), and Operator & System (FR34–39).

Architecturally, the system divides into two primary domains: the MCP backend (GIS integration, legislative data caching, bill search with per-legislator indexing, rate limiting, structured logging) and the React SPA frontend (progress-driven UI, conversational flow, delivery actions). The LLM inference layer is explicitly external at MVP via BYOLLM.

**Non-Functional Requirements:**
- Performance: GIS lookup <3s (NFR2); bill lookups <1s from cache (NFR3); landing page Lighthouse ≥90 (NFR1)
- Security: HTTPS/TLS everywhere (NFR5); API token server-side only (NFR6); no persistent PII (NFR7); rate limiting 60 req/IP/min (NFR8)
- Scalability: 100 concurrent sessions (NFR9); upstream API call efficiency at scale (NFR10) — caching is a scalability requirement
- Accessibility: WCAG 2.1 AA (NFR11); 44×44px touch targets (NFR12)
- Integration: MCP spec compliance (NFR13); swappable data provider interface (NFR14)
- Reliability: 99% uptime 30-day rolling (NFR16); cache serves during API outage (NFR17)

**Scale & Complexity:**
- Primary domain: Full-stack web + AI tooling backend (MCP server)
- Complexity level: High
- Estimated architectural components: 6 (SPA frontend, MCP backend service, GIS integration, Legislature API integration + cache, system prompt / agent instructions, hosting/CI layer)

### Technical Constraints & Dependencies

- **Utah Legislature API** (`glen.le.utah.gov`): Experimental — can be removed without notice. Developer token required. Cache refresh rate limits: bills ≤hourly, legislators ≤daily, committees ≤3×/day. No direct "bills by legislator" query — per-legislator sponsor index must be built from full session bill lists.
- **UGRC GIS API** (`api.mapserv.utah.gov`): Street geocoding + SGID political layer query for district resolution. No documented rate limits — usage must be instrumented.
- **MCP Protocol**: Backend must conform to MCP specification and serve over public HTTPS. Behavior must be consistent across Claude.ai and ChatGPT tool invocation models.
- **BYOLLM**: System prompt is an architectural artifact — the 4-step constituent flow lives in agent instructions, not application code.
- **Framework already decided**: React + Tailwind CSS + shadcn/ui (from UX spec)
- **No persistent session storage**: PII (addresses, personal stories) must not outlive the session

### Cross-Cutting Concerns Identified

1. **Caching Strategy** — mandatory for resilience and performance; per-legislator sponsor index is a pre-computed ETL product; cache must serve stale data during API outages; refresh scheduling must respect rate limits
2. **Error Resilience** — auto-retry with increasing delay; every user-facing error names source + nature + next action; operator errors must be categorized (API vs. logic) in structured logs
3. **Stateless Session Model** — no session store; address and personal details are transient in MCP request/response cycle; analytics (FR39) must be anonymous
4. **Data Provider Abstraction** — NFR14 requires swappable legislature data provider interface; OpenStates and LegiScan identified as fallbacks
5. **MCP Protocol Compliance** — shapes the entire backend service contract; governs tool schema, invocation behavior, and HTTPS endpoint requirements
6. **AI Disclosure Accommodation** — message output structure must support future unobtrusive disclosure without layout changes
7. **Mobile-First Performance** — 375px primary viewport; no hover-dependent interactions; Lighthouse ≥90 on mobile

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web + AI tooling backend (MCP server). Two distinct services requiring a monorepo structure for contributor-friendly co-location.

### Starter Options Considered

- **Turborepo**: Full build orchestration — appropriate for teams, premature for solo MVP
- **pnpm workspaces**: Lightweight monorepo, shared config, no pipeline overhead ← selected
- **Two separate repos**: Defeats Journey 4 contributor experience

### Selected Approach: pnpm Workspaces Monorepo (two apps)

**Rationale:** Solo MVP with open-source contributor goals. pnpm workspaces provide monorepo co-location and shared TypeScript/ESLint config without Turborepo's pipeline complexity. Turborepo can be added later if build times warrant it.

**Monorepo Structure:**

```
on-record/
├── apps/
│   ├── web/               # Next.js 16 frontend
│   └── mcp-server/        # TypeScript MCP server
├── packages/
│   └── typescript-config/ # Shared tsconfig
├── package.json           # pnpm workspace root
└── pnpm-workspace.yaml
```

**Initialization Commands:**

```bash
# Root workspace setup
corepack enable pnpm

# Frontend
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --turbopack

# shadcn/ui (run after Next.js init)
npx shadcn@latest init

# MCP Server
cd apps/mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript throughout (frontend and backend) — consistency for contributors, type-safe MCP tool schemas via zod

**Styling Solution:** Tailwind v4 (CSS-first, `@theme` directive) + shadcn/ui CSS variable system — exact match to UX spec color tokens and dark mode requirement

**Build Tooling:** Turbopack (stable, default in Next.js 16) for frontend dev; standard `tsc` for MCP server; no shared build pipeline at MVP

**Testing Framework:** Not included in either starter — to be decided in architecture decisions step

**Code Organization:**
- `apps/web/src/` — Next.js App Router structure
- `apps/mcp-server/src/` — flat TypeScript source, tool modules per concern

**Development Experience:** Turbopack dev server (fast refresh); separate MCP server process run alongside; pnpm workspace commands from root

**Note:** Project initialization is the first implementation story.

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

9 categories where AI agents will make different choices without explicit rules: naming conventions (DB, code, files), MCP tool structure, MCP response format, error format, date/null handling, test co-location, logging discipline, component organization, and async patterns.

### Naming Patterns

**Database Naming (SQLite):**
- Tables: `snake_case` plural nouns — `legislators`, `bills`, `events`, `bill_fts`
- Columns: `snake_case` — `legislator_id`, `cached_at`, `vote_date`
- Foreign keys: `{table_singular}_id` — `legislator_id`, `bill_id`
- Indexes: `idx_{table}_{column}` — `idx_bills_session`, `idx_bills_sponsor_id`

**MCP Tool Names:**
- `snake_case` per MCP convention — `lookup_legislator`, `search_bills`
- Tool names are part of the public API; never rename without a migration

**TypeScript Code:**
- Variables and functions: `camelCase` — `getLegislatorsByDistrict`, `billId`
- Types, interfaces, classes, components: `PascalCase` — `LegislatureDataProvider`, `LegislatorCard`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_RETRY_ATTEMPTS`, `CACHE_REFRESH_INTERVAL`
- Zod schemas: `camelCase` with `Schema` suffix — `legislatorSchema`, `billSearchInputSchema`

**File Naming:**
- Next.js App Router pages/layouts: framework-enforced lowercase (`page.tsx`, `layout.tsx`)
- React components: `PascalCase.tsx` — `LegislatorCard.tsx`, `DraftCard.tsx`
- Utilities and helpers: `camelCase.ts` — `retryWithDelay.ts`, `parseDistrict.ts`
- MCP tool modules: `kebab-case.ts` — `legislator-lookup.ts`, `bill-search.ts`
- Test files: `{filename}.test.ts` co-located with source

**API/Route Naming (Hono):**
- Endpoints: `kebab-case` — `/api/events`, `/mcp`
- URL params: `camelCase` in TypeScript, `kebab-case` in URLs — `/legislator/[districtId]`
- Query params: `camelCase` — `?sessionId=2024GS`

### Structure Patterns

**Monorepo Organization:**

```
apps/
  web/src/
    app/                  # Next.js App Router (framework-enforced)
    components/
      ui/                 # shadcn/ui primitives (auto-generated, do not edit directly)
      {ComponentName}.tsx # Custom components — PascalCase, one component per file
    lib/                  # Shared utilities (formatters, helpers)
    hooks/                # Custom React hooks (useXxx.ts)
  mcp-server/src/
    tools/                # One file per MCP tool (kebab-case)
    providers/            # LegislatureDataProvider implementations
    cache/                # SQLite cache layer (schema, queries, refresh scheduler)
    middleware/           # Hono middleware (rate-limit, cors, logging)
    index.ts              # Server entry point only — no business logic here
packages/
  typescript-config/      # Shared tsconfig base
  types/                  # Shared TypeScript interfaces used by both apps (MCP tool response types, etc.)
```

**Shared Type Rule:** Types used by more than one app live in `packages/types/` only. No cross-workspace imports from `apps/web` into `apps/mcp-server` or vice versa. Violations break pnpm workspace isolation.

**Test Co-location Rule:** Tests live next to source files — `bill-search.test.ts` next to `bill-search.ts`. No separate `__tests__/` directories. E2E tests live in `e2e/` at monorepo root.

**No barrel files (`index.ts` re-exports) in `components/` or `tools/`.** Import directly from the file. Barrel files cause circular dependency issues and make tree-shaking harder to reason about.

### Format Patterns

**MCP Tool Response Format:**
Tool responses return structured JSON as the text content — never prose strings. The MCP client (Claude.ai/ChatGPT) reads JSON reliably; prose strings require LLM text parsing that drifts across runs and breaks citation accuracy.

```typescript
// Correct — LLM reads clean fields, citations are exact
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ legislators: [...], session: '2025GS' })
  }]
}

// Wrong — LLM parses prose, bill numbers and vote dates become approximate
return { content: [{ type: 'text', text: 'Your senator is Jane Smith...' }] }
```

**MCP Tool Response Type Contracts (defined in `packages/types/`):**

```typescript
interface LookupLegislatorResult {
  legislators: Legislator[]
  session: string
  resolvedAddress: string
}

interface SearchBillsResult {
  bills: Bill[]
  legislatorId: string
  session: string
}
```

These interfaces are the contract between MCP tools and the LLM system prompt. Field names must not change without updating the system prompt.

**Error Response Format (three-field standard):**
All errors surfaced to MCP clients and users carry exactly three fields:

```typescript
interface AppError {
  source: 'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app'
  nature: string   // human-readable description of what failed
  action: string   // what to try next
}
```

**Date Format:** ISO 8601 strings throughout — `"2024-03-04"` for dates, `"2024-03-04T14:23:00Z"` for datetimes. No Unix timestamps in public interfaces. SQLite stores dates as ISO strings (TEXT column), not integers.

**JSON Field Naming:** `camelCase` in TypeScript interfaces and MCP tool responses. SQLite column names are `snake_case` — mapping happens in the cache/provider layer, never leaks into tool output.

**Null vs Undefined:** Use `undefined` for missing/optional values in TypeScript. `null` only when a value is explicitly absent and meaningful (e.g., SQLite NULL from a query result). Never return `null` from application functions — use `undefined` or a typed discriminated union.

### Communication Patterns

**Analytics Events (FR39):**
Event types are a closed enum — `session_initiated | draft_generated | message_delivered`. No free-form event names. Event payload: `{ event_type, district_id?, timestamp }` only. No PII ever in event payload.

**Pino Log Structure:**
Every log entry includes a `source` field identifying the subsystem:

```typescript
logger.info({ source: 'legislature-api', billCount: 42, session: '2025GS' }, 'Bills cached')
logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed')
```

Address values are always `'[REDACTED]'` in logs. Never log raw user input.

### Process Patterns

**Async Pattern:** `async/await` throughout. No raw `.then()/.catch()` chains except in top-level error boundaries. All async functions have explicit return type annotations.

**Retry Utility (FR36):**
One shared `retryWithDelay(fn, attempts, delayMs)` utility in `mcp-server/src/lib/`. Used by both GIS and Legislature API calls. Never implement retry inline.

```typescript
// Correct
const result = await retryWithDelay(() => ugrcGeocode(address), 2, 1000)

// Wrong — inline retry, agents implement differently each time
let result; try { result = await ugrcGeocode(address) } catch { /* retry manually */ }
```

**Testing Pyramid & Mock Boundary:**
- Unit tests: mock at the `LegislatureDataProvider` interface — tests never touch SQLite directly. SQLite is an implementation detail of the provider.
- Integration tests: real SQLite in-memory DB, mocked external HTTP calls
- E2E tests (Playwright): full stack against a test deployment

```typescript
// Correct — mock the provider interface
const mockProvider: LegislatureDataProvider = { getBillsBySession: vi.fn().mockResolvedValue([...]) }

// Wrong — agents importing SQLite directly in tests couples tests to implementation
import Database from 'better-sqlite3'
const db = new Database(':memory:')
```

**Loading States (Frontend):**
Use shadcn/ui `Skeleton` for all async content areas — never a full-page spinner. `aria-busy="true"` on the loading region. Skeleton dimensions match real content to prevent layout shift on load.

**MCP Server Logging Rule:**
`console.log` is FORBIDDEN in `apps/mcp-server/`. The JSON-RPC stream uses stdout; any `console.log` corrupts the protocol. Use `console.error` or pino exclusively. ESLint enforces this: `no-console: ['error', { allow: ['error'] }]` in `apps/mcp-server/.eslintrc`.

**Environment Variables:**
All env vars validated at startup via a zod schema in `mcp-server/src/env.ts`. Server throws and exits if required vars are missing. Frontend env vars prefixed `NEXT_PUBLIC_` only when intentionally public. No secrets in `NEXT_PUBLIC_` vars.

**TypeScript Strictness:**
`strict: true` in all tsconfigs. No `// @ts-ignore` or `// @ts-nocheck`. No `any` — use `unknown` and narrow. Violations block CI.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `snake_case` for SQLite columns and `camelCase` for TypeScript — mapping in cache layer only
- Return structured JSON (not prose) from MCP tools, matching the type contracts in `packages/types/`
- Use the three-field `AppError` type for all errors
- Use `console.error` only (never `console.log`) in `apps/mcp-server/`
- Co-locate test files with source files; mock at the `LegislatureDataProvider` boundary
- Use the shared `retryWithDelay` utility — never inline retry logic
- Redact addresses as `'[REDACTED]'` in all log output
- Place shared types in `packages/types/` — never import across app boundaries

**Anti-Patterns:**

```typescript
// ❌ Prose MCP response
{ content: [{ type: 'text', text: 'Your senator is Jane Smith...' }] }

// ✅ Structured JSON MCP response
{ content: [{ type: 'text', text: JSON.stringify({ legislators: [...] }) }] }

// ❌ console.log in MCP server (corrupts JSON-RPC stream)
console.log('Cache refreshed')

// ✅ pino logger
logger.info({ source: 'cache' }, 'Cache refreshed')

// ❌ Inline retry
try { ... } catch { await sleep(1000); try { ... } }

// ✅ Shared utility
await retryWithDelay(() => fetchBills(session), 2, 1000)

// ❌ SQLite in unit tests (couples test to implementation detail)
const db = new Database(':memory:')

// ✅ Mock at provider interface
const mockProvider: LegislatureDataProvider = { ... }
```

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Cache storage: SQLite (better-sqlite3 v12.6.2)
- MCP HTTP transport: StreamableHTTPServerTransport via Hono v4.12.1
- Background scheduler: node-cron v4.2.1 (in-process)
- Logging: pino v10.3.1

**Important Decisions (Shape Architecture):**
- Frontend state: React state only (useState + URL params) at MVP
- Testing: Vitest v4.0.18 + Playwright v1.58.2
- CI/CD: GitHub Actions + Vercel/Railway git integration
- Analytics: Custom SQLite event endpoint (same DB as cache)

**Deferred Decisions (Post-MVP):**
- State management library (Zustand/TanStack Query) — only if hosted LLM UI is built
- Storybook — when component library stabilizes
- External analytics (Plausible/PostHog) — if analytics needs outgrow SQLite
- Turborepo — if monorepo build times warrant it

### Data Architecture

**Cache Storage: SQLite via better-sqlite3 v12.6.2**

Rationale: The per-legislator bill sponsor index is a table-shaped problem (legislator_id → bill_ids). SQLite provides persistence across service restarts (satisfying NFR17), queryable tables for the sponsor index, FTS5 for bill keyword search (FR8), and zero-ops single-file deployment. PostgreSQL and PostGIS were evaluated and rejected — the UGRC API handles all spatial computation externally; no geographic data is stored. SQLite handles 100 concurrent read-heavy sessions (NFR9) well within its capability.

**Schema (logical):**

```
legislators   (id, chamber, district, name, email, phone, phone_label, session, cached_at)
bills         (id, session, title, summary, status, sponsor_id, vote_result, vote_date, cached_at)
bill_fts      (FTS5 virtual table over bills.title + bills.summary — supports FR8 theme search)
events        (id, event_type, district, timestamp — anonymous analytics, FR39)
```

**Cache Refresh Strategy:**
- Legislators: daily (≤1×/day as per rate limit)
- Bills: hourly (≤1×/hour as per rate limit)
- Per-legislator sponsor index: rebuilt from bills table on each bill refresh
- Stale data served during API outage (NFR17) — cached_at timestamp drives freshness checks

**Data Validation:** zod schemas for all MCP tool inputs and external API responses — consistent with MCP SDK usage, catches API shape changes at the boundary.

### Authentication & Security

**No user authentication** — BYOLLM model; no accounts, no sessions, no login.

**API Token Security:** Utah Legislature API developer token stored in environment variable (`UTAH_LEGISLATURE_API_KEY`), never exposed to client-side code (NFR6). Validated at startup via zod env schema — server refuses to start with missing token.

**Rate Limiting:** `hono-rate-limiter` v0.4.2 — IP-based, 60 requests/IP/minute, returns 429 on breach (NFR8). Note: package is pre-1.0; monitor for activity; implement as thin middleware layer so it can be swapped without touching tool logic.

**TLS:** Provided by hosting platform (Railway/Render handles Let's Encrypt automatically). No application-level TLS configuration needed (NFR5).

**CORS:** Hono CORS middleware configured to accept requests from chatbot platform origins (Claude.ai, ChatGPT) — required for browser-based MCP tool invocation.

**Environment Config:** `zod`-validated env schema at startup. Contributors see exactly what variables are required; server fails fast with descriptive error if any are missing.

### API & Communication Patterns

**MCP Transport:** `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` v1.26.0 — required for public HTTPS endpoint. Stdio transport is for local/development use only.

**HTTP Framework: Hono v4.12.1**

Rationale: TypeScript-native, ~14KB, clean middleware API for rate limiting + CORS, runs on Node.js without configuration overhead. Appropriate for a small focused service. Fastify and Express were evaluated — both heavier than needed for 2 MCP tools + 1 analytics endpoint.

**MCP Tool Interface Contract (NFR14 — swappable data provider):**

All bill and legislator data access goes through a `LegislatureDataProvider` interface. The Utah Legislature API implementation is one concrete provider; OpenStates and LegiScan are identified fallbacks. Swapping providers requires no changes to MCP tool public schemas.

```typescript
interface LegislatureDataProvider {
  getLegislatorsByDistrict(chamber: 'house' | 'senate', district: number): Promise<Legislator[]>
  getBillsBySession(session: string): Promise<Bill[]>
  getBillDetail(billId: string): Promise<BillDetail>
}
```

**Error Handling Standard:** All errors surfaced to MCP clients include three fields: `source` (which API or subsystem failed), `nature` (what kind of failure), `action` (what the user or system should try next). Operator errors logged via pino with `source` tag for FR35 categorization.

**Retry Policy (FR36):** 2 retries with increasing delay (1s, 3s) before surfacing user-facing error. Total window ≤10 seconds. Implemented as a shared utility used by both GIS and Legislature API calls.

### Frontend Architecture

**Framework:** Next.js 16.1.6 with App Router

**Route Structure:**
```
app/
├── page.tsx              # Landing page (SSG, SEO-optimized)
├── setup/page.tsx        # BYOLLM onboarding flow (CSR)
├── legislator/[id]/page.tsx   # Deep link: pre-selects legislator
├── bill/[id]/page.tsx         # Deep link: pre-selects bill
└── layout.tsx            # Root layout with ReadingPreferences
```

**State Management:** React state only (useState/useReducer) at MVP. The chatbot UI lives in Claude.ai/ChatGPT — the web app is a landing page and onboarding flow. URL params (URLSearchParams / Next.js `searchParams`) handle deep links. No Zustand, no TanStack Query until a hosted LLM UI is built.

**Component Architecture:** shadcn/ui primitives + custom components as defined in UX spec. Components colocated in `src/components/`. Custom components use Tailwind design tokens from `globals.css` — no hardcoded hex values.

**Performance:** Turbopack for dev; Next.js static export for landing page; `next/image` for image optimization; Atkinson Hyperlegible loaded via `next/font` with `font-display: swap`. OpenDyslexic loaded on-demand only when toggle activated.

### Infrastructure & Deployment

**Frontend Hosting:** Vercel (primary) — git integration, automatic deploy from `main`, zero config for Next.js, free tier sufficient for MVP traffic.

**MCP Backend Hosting:** Railway (primary) — git integration, automatic deploy from `main`, public HTTPS endpoint with Let's Encrypt, Node 20+ runtime, free/hobby tier sufficient at MVP.

**CI/CD: GitHub Actions**
- On PR: lint + TypeScript type-check + Vitest unit tests
- On PR (E2E): Playwright tests against preview deployment
- On merge to main: automatic deploy via Vercel/Railway git integration

**Structured Logging: pino v10.3.1**

Structured JSON logs with `source` field on every log entry. Operator accesses via Railway log stream (no custom admin UI, FR34). Log entries include: timestamp, level, source (gis-api | legislature-api | mcp-tool | cache | app), request/response summary for MCP tool calls. PII (addresses, personal stories) never logged (NFR7).

**Background Scheduling: node-cron v4.2.1 (in-process)**

Cron expressions respecting rate limits:
- Bills: `0 * * * *` (top of every hour)
- Legislators: `0 6 * * *` (daily at 6am)
- Cache warm-up: runs once at server startup before accepting connections

**Anonymous Analytics: Custom SQLite endpoint (FR39)**

A `/events` POST endpoint in the Hono server appends to the `events` table in the same SQLite database. Three event types: `session_initiated`, `draft_generated`, `message_delivered`. District ID recorded where available. No PII stored. District-level counts queryable directly from the SQLite file. External analytics (Plausible/PostHog) deferred — adds when the need exceeds what `SELECT COUNT(*) GROUP BY district` provides.

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold (pnpm workspaces + shared tsconfig)
2. MCP server: Hono + SQLite schema + cache warm-up + LegislatureDataProvider interface
3. MCP tool: GIS lookup (UGRC API → district ID → legislator)
4. MCP tool: Bill search (cache + FTS5 + per-legislator index)
5. System prompt / agent instructions (4-step flow)
6. Next.js app: landing page (SSG) + BYOLLM onboarding flow
7. Custom UI components per UX spec implementation roadmap
8. CI/CD: GitHub Actions + Vercel/Railway git integration

**Cross-Component Dependencies:**
- SQLite schema must be finalized before MCP tools are implemented (tools read from cache)
- LegislatureDataProvider interface must be defined before both the cache ETL and the MCP tools
- Hono rate limiting + CORS middleware must be in place before MCP endpoint is public
- Environment validation (zod env schema) must run before any external API calls
- FTS5 virtual table depends on bills table being populated — cache warm-up is a hard dependency of bill search

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Location |
|---|---|
| Constituent Identification (FR1–5) | `apps/mcp-server/src/tools/legislator-lookup.ts` + `providers/` |
| Legislative Research (FR6–11) | `apps/mcp-server/src/tools/bill-search.ts` + `cache/` |
| Guided Issue Discovery (FR12–16) | `system-prompt/agent-instructions.md` |
| Message Composition (FR17–21) | `system-prompt/agent-instructions.md` |
| Message Delivery (FR22–24) | `apps/web/src/components/SendActions.tsx` |
| BYOLLM / MCP Integration (FR25–28, FR40) | `apps/mcp-server/src/index.ts` + `docs/` + `README.md` |
| Onboarding & Public Discovery (FR29–33) | `apps/web/src/app/page.tsx` + `apps/web/src/app/setup/` |
| Operator & System (FR34–39) | `apps/mcp-server/src/middleware/logging.ts` + `cache/refresh.ts` + `routes/events.ts` |

### Complete Project Directory Structure

```
on-record/
├── README.md                          # Setup, local dev, contributor guide (NFR18)
├── package.json                       # pnpm workspace root (no dependencies)
├── pnpm-workspace.yaml                # Defines apps/* and packages/*
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                     # lint + typecheck + vitest + playwright on PR
├── e2e/                               # Playwright E2E tests (full stack)
│   ├── playwright.config.ts
│   ├── onboarding.spec.ts             # BYOLLM setup flow
│   ├── constituent-flow.spec.ts       # J1 + J2 happy paths
│   └── accessibility.spec.ts          # axe-playwright a11y checks (NFR11)
├── system-prompt/
│   └── agent-instructions.md          # BYOLLM 4-step flow prompt (FR27)
│                                      # Product artifact, not app code
├── apps/
│   ├── web/                           # Next.js 16 frontend
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── globals.css        # Tailwind v4 @theme tokens (color system)
│   │   │   │   ├── layout.tsx         # Root layout — ReadingPreferences, dark mode
│   │   │   │   ├── page.tsx           # Landing page (SSG, SEO — FR29, FR30)
│   │   │   │   ├── setup/
│   │   │   │   │   └── page.tsx       # BYOLLM onboarding flow (FR31)
│   │   │   │   ├── legislator/
│   │   │   │   │   └── [districtId]/
│   │   │   │   │       └── page.tsx   # Deep link: pre-selects legislator
│   │   │   │   └── bill/
│   │   │   │       └── [billId]/
│   │   │   │           └── page.tsx   # Deep link: pre-selects bill
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui primitives (auto-generated, do not edit)
│   │   │   │   ├── ProgressStrip.tsx  # 4-step flow indicator (UX spec)
│   │   │   │   ├── LegislatorCard.tsx # Aha #1 reveal (FR3, FR4, FR5)
│   │   │   │   ├── BillCard.tsx       # Bill + vote surface (FR7, FR8)
│   │   │   │   ├── DraftCard.tsx      # Generated draft display (FR17–FR21)
│   │   │   │   ├── SendActions.tsx    # mailto: + clipboard delivery (FR22–FR24)
│   │   │   │   ├── CitationTag.tsx    # Inline bill citation pill (FR19)
│   │   │   │   ├── ErrorBanner.tsx    # Three-field error display (FR37)
│   │   │   │   ├── ReadingPreferences.tsx  # Dark mode + dyslexia toggle
│   │   │   │   └── BookmarkPrompt.tsx # Return usage seed (post-send)
│   │   │   ├── lib/
│   │   │   │   └── utils.ts           # shadcn/ui cn() utility
│   │   │   └── hooks/
│   │   │       └── useReadingPreferences.ts  # localStorage persistence
│   │   └── public/
│   │       └── og-image.png           # Open Graph image for social sharing (FR30)
│   │
│   └── mcp-server/                    # TypeScript MCP backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── .eslintrc.json             # no-console: error (except console.error)
│       ├── .env.example               # UTAH_LEGISLATURE_API_KEY, UGRC_API_KEY, etc.
│       ├── src/
│       │   ├── index.ts               # Hono server + MCP transport + startup
│       │   ├── env.ts                 # zod env schema — validates at startup
│       │   ├── tools/
│       │   │   ├── legislator-lookup.ts       # MCP tool: lookup_legislator (FR1–5)
│       │   │   ├── legislator-lookup.test.ts
│       │   │   ├── bill-search.ts             # MCP tool: search_bills (FR6–11)
│       │   │   └── bill-search.test.ts
│       │   ├── providers/
│       │   │   ├── types.ts                   # LegislatureDataProvider interface (NFR14)
│       │   │   ├── utah-legislature.ts        # Utah Legislature API implementation
│       │   │   └── utah-legislature.test.ts
│       │   ├── cache/
│       │   │   ├── schema.ts                  # SQLite schema definitions
│       │   │   ├── schema.test.ts
│       │   │   ├── legislators.ts             # Legislator cache read/write
│       │   │   ├── legislators.test.ts
│       │   │   ├── bills.ts                   # Bill cache + FTS5 search (FR8)
│       │   │   ├── bills.test.ts
│       │   │   ├── refresh.ts                 # node-cron scheduler (FR10, FR38)
│       │   │   └── refresh.test.ts
│       │   ├── middleware/
│       │   │   ├── rate-limit.ts              # 60 req/IP/min (NFR8)
│       │   │   ├── cors.ts                    # chatbot platform origins
│       │   │   └── logging.ts                 # pino request/response logging (FR34)
│       │   ├── routes/
│       │   │   └── events.ts                  # POST /api/events — analytics (FR39)
│       │   └── lib/
│       │       ├── retry.ts                   # retryWithDelay utility (FR36)
│       │       ├── retry.test.ts
│       │       └── logger.ts                  # pino instance (singleton)
│       └── data/
│           └── on-record.db                   # SQLite DB file (gitignored)
│
└── packages/
    ├── typescript-config/
    │   ├── package.json
    │   ├── base.json                  # Shared strict TS base config
    │   ├── nextjs.json                # Extends base for Next.js
    │   └── node.json                  # Extends base for Node.js
    └── types/
        ├── package.json
        └── index.ts                   # LookupLegislatorResult, SearchBillsResult,
                                       # Legislator, Bill, AppError, AnalyticsEvent
```

### Architectural Boundaries

**Boundary 1: LLM ↔ MCP Server (public HTTPS)**
- Protocol: MCP spec via `StreamableHTTPServerTransport`
- Entry point: `apps/mcp-server/src/index.ts`
- Tools exposed: `lookup_legislator`, `search_bills`
- Auth: none (public endpoint, rate-limited by IP)
- Response contract: types in `packages/types/index.ts`

**Boundary 2: MCP Server ↔ Utah Legislature API (external HTTP)**
- Abstraction: `LegislatureDataProvider` interface in `providers/types.ts`
- Concrete impl: `providers/utah-legislature.ts`
- All calls go through this interface — never direct from tools
- Fallback providers (OpenStates, LegiScan) implement same interface

**Boundary 3: MCP Server ↔ UGRC GIS API (external HTTP)**
- Direct HTTP calls from `tools/legislator-lookup.ts`
- No abstraction layer needed — single provider, well-documented API
- `retryWithDelay` wraps all calls

**Boundary 4: MCP Server ↔ SQLite**
- Only `cache/` modules touch the database directly
- Tools read from cache via functions in `cache/legislators.ts` and `cache/bills.ts`
- No direct `better-sqlite3` imports outside `cache/`

**Boundary 5: Web App ↔ Browser APIs**
- `SendActions.tsx`: `navigator.clipboard.writeText()` + `mailto:` URI
- `ReadingPreferences.tsx` + `useReadingPreferences.ts`: `localStorage`
- No backend API calls from web app at MVP — user's chatbot talks to MCP directly

### Data Flow

```
User browser
  → Landing page (Next.js SSG, Vercel CDN)
  → Setup page → connects MCP tools to Claude.ai/ChatGPT

User's chatbot (Claude.ai / ChatGPT)
  → Invokes lookup_legislator
    → Hono middleware (rate-limit, CORS, logging)
    → UGRC GIS API → district ID → SQLite legislators cache
    → returns LookupLegislatorResult JSON
  → Invokes search_bills
    → SQLite bills cache + FTS5 → per-legislator index
    → returns SearchBillsResult JSON
  → Generates voiced draft using system prompt + tool results
  → Returns draft to user in chat UI

User clicks mailto: / Copy
  → Browser opens email client or clipboard
  → Message sent — no server involvement

Analytics: POST /api/events
  → Hono route → SQLite events table (anonymous, no PII)
```

### Development Workflow

```bash
# Install all workspaces
pnpm install

# Run both services in development
pnpm --filter web dev               # Next.js on localhost:3000
pnpm --filter mcp-server dev        # MCP server on localhost:3001

# Run tests
pnpm --filter mcp-server test       # Vitest unit tests
pnpm --filter web test              # Vitest + React Testing Library
pnpm test:e2e                       # Playwright from monorepo root

# Add a shadcn/ui component
pnpm --filter web exec npx shadcn@latest add button
```

## Architecture Validation Results

### Coherence Validation ✅

All technology versions are mutually compatible. Node 20+ is the consistent runtime floor across pino v10, better-sqlite3 v12, and Railway/Vercel hosting. Patterns are internally consistent — naming conventions, error format, retry utility, and mock boundary have no contradictions. Directory structure enforces the architectural boundaries defined in decisions.

### Requirements Coverage ✅

All 40 functional requirements and 18 non-functional requirements are architecturally supported. FR mapping to specific files is documented in the Project Structure section. No orphaned requirements found.

### Implementation Readiness ✅

All critical decisions are documented with verified version numbers. Implementation patterns cover the 9 identified conflict points with concrete examples and anti-patterns. Complete project tree with FR annotations gives AI agents unambiguous file-level guidance.

### Gap Analysis

**Important (address in implementation stories):**
- Session awareness logic: inter-session period detection belongs in `cache/bills.ts` and `cache/refresh.ts` — implement as date comparison against Utah Legislature session calendar (Jan–Mar). Store session metadata in SQLite.
- CORS origin list: exact Claude.ai and ChatGPT MCP endpoint origins to be populated in `middleware/cors.ts` during MCP connectivity testing.

**Out of scope for architecture (handled elsewhere):**
- System prompt internal structure: product/UX artifact, not architectural
- Deployment config files (railway.toml, vercel.json): implementation detail

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (40 FRs, 18 NFRs, 4 user journeys)
- [x] Scale and complexity assessed (High — full-stack + AI tooling + GIS + caching)
- [x] Technical constraints identified (Legislature API rate limits, GIS API, MCP spec)
- [x] Cross-cutting concerns mapped (7 concerns documented)

**✅ Starter Template & Foundation**
- [x] pnpm workspaces monorepo selected and justified
- [x] Next.js 16.1.6 + Tailwind v4 + shadcn/ui (current versions verified)
- [x] MCP SDK v1.26.0 + Hono v4.12.1 (current versions verified)
- [x] All library versions verified via web search

**✅ Architectural Decisions**
- [x] Data architecture: SQLite + FTS5 + per-legislator index
- [x] HTTP framework: Hono with StreamableHTTPServerTransport
- [x] Security: rate limiting, env validation, no persistent PII
- [x] Frontend state: React state only at MVP
- [x] Testing: Vitest + Playwright
- [x] CI/CD: GitHub Actions + Vercel/Railway git integration
- [x] Analytics: custom SQLite endpoint

**✅ Implementation Patterns**
- [x] Naming conventions (DB, TypeScript, files, routes)
- [x] MCP tool response format with type contracts
- [x] Error format (three-field AppError)
- [x] Test mock boundary (LegislatureDataProvider)
- [x] Logging discipline (console.log forbidden in mcp-server)
- [x] Shared types in packages/types only
- [x] Anti-patterns with concrete examples

**✅ Project Structure**
- [x] Complete directory tree with all files annotated to FRs
- [x] 5 architectural boundaries defined
- [x] Data flow documented end-to-end
- [x] Development workflow commands specified
- [x] Requirements-to-structure mapping table

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- MCP-first architecture cleanly separates data retrieval from LLM reasoning
- SQLite cache satisfies both performance (NFR3) and resilience (NFR17) with zero ops
- LegislatureDataProvider interface future-proofs against the experimental API risk
- BYOLLM model eliminates inference costs and simplifies the security surface
- pnpm workspaces monorepo gives contributors a single-repo experience without Turborepo overhead

**Areas for Future Enhancement:**
- State management (Zustand/TanStack Query) when hosted LLM UI is built
- Turborepo if build times grow with contributor additions
- External analytics (Plausible) if district-level reporting needs grow
- OpenStates integration as a provider implementation (NFR14 makes this straightforward)

### Implementation Handoff

**First Implementation Story:** Monorepo scaffold

```bash
corepack enable pnpm
# Initialize workspace root with pnpm-workspace.yaml
# Create packages/typescript-config with base.json, nextjs.json, node.json
# Create packages/types with index.ts (Legislator, Bill, AppError, tool result types)
```

**Implementation Sequence:**
1. Monorepo scaffold + shared packages
2. MCP server: Hono + env validation + SQLite schema + LegislatureDataProvider interface
3. MCP tool: `lookup_legislator` (UGRC GIS → district → legislator)
4. MCP tool: `search_bills` (cache + FTS5 + per-legislator index)
5. System prompt: `agent-instructions.md` (4-step BYOLLM flow)
6. Next.js: landing page (SSG) + BYOLLM setup flow
7. UI components per UX spec Phase 1 roadmap
8. CI/CD: GitHub Actions + Vercel/Railway git integration

**AI Agent Directive:** Follow all architectural decisions exactly as documented. When in doubt, refer to this document. The LegislatureDataProvider interface, AppError format, and MCP tool response schemas are contracts — do not vary them across stories.
