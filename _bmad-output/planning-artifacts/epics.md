---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowType: 'epics-and-stories'
project_name: 'write-your-legislator'
user_name: 'Corey'
date: '2026-02-23'
---

# On Record (write-your-legislator) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for On Record (write-your-legislator), decomposing the requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A constituent can enter their home address to identify their Utah state House and Senate representatives
FR2: The system can resolve a Utah street address to the correct legislative districts via GIS lookup
FR3: A constituent can view both their House and Senate representatives and select which one to contact
FR4: The system can surface a legislator's name, chamber, district, email address, and phone number(s) with type label alongside identification results
FR5: The system can surface the contact number type (cell, district office, or chamber switchboard) where the API provides a type label, and explicitly flags the number as type-unknown when the label is absent
FR6: The system can retrieve bills sponsored or co-sponsored by a specific Utah legislator for the active session, or the most recently completed session when the legislature is not in session
FR7: The system can retrieve a specific bill's summary, status, and the identified legislator's vote record
FR8: The system can search bills by issue theme filtered to a specific legislator, returning at least 1 result where a bill's title, summary, or subject tags match the entered theme keyword or a recognized synonym; supported theme categories include at minimum: healthcare, education, housing, redistricting, environment, and taxes
FR9: The system can surface up to 5 bills matching the issue theme from the most recent 2 completed legislative sessions when the legislature is not in active session
FR10: The system can cache legislative data locally and serve all bill and legislator requests from cache, refreshing automatically within the bounds required by the data provider's rate limits
FR11: The system can retrieve all bills associated with a specific legislator without requiring a full session scan, returning results in under 2 seconds
FR12: A constituent can describe their concerns in their own words, including personal stories and family situations, to initiate the drafting flow; at least one personal-impact detail must be captured before draft generation begins
FR13: The chatbot can guide a constituent who does not know which specific bill or issue they care about by presenting 2–3 issue framings derived from the legislator's record for the constituent to confirm or redirect before proceeding
FR14: A constituent can confirm or refine the issue and legislator context surfaced by the chatbot before draft generation begins; draft generation does not proceed until the constituent has provided at least one explicit confirmation or correction in the conversation flow
FR15: A constituent can specify the desired medium for their message (email or text/SMS)
FR16: A constituent can specify the desired formality level for their message from at least two distinct options (conversational or formal); the generated draft reflects the selected register in tone and vocabulary
FR17: The system can generate a draft message grounded in the constituent's stated concerns and the legislator's specific legislative record; the draft must include at least one source citation and must not contain unsupported claims about legislator intent or motivation
FR18: The system can generate a draft calibrated to the chosen medium: email drafts are 2–4 paragraphs (150–400 words); text/SMS drafts are 1–3 sentences (under 160 characters per message segment)
FR19: The system can include a source citation in the draft (bill number, session, vote date) so the constituent can verify referenced facts before sending
FR20: A constituent can review the generated draft and request revisions
FR21: The system can revise a draft message based on constituent feedback
FR22: A constituent can open a draft email directly in their system email client or web email provider via a one-action trigger
FR23: A constituent can copy a draft text/SMS message to their clipboard for sending via their preferred messaging app
FR24: A constituent can view the legislator's contact information (email address, phone/text number with type label) alongside the draft
FR25: The MCP legislator-lookup tool can be connected to and invoked by a user's existing chatbot platform (Claude.ai, ChatGPT, and compatible clients), verified by successful end-to-end address-to-legislator lookup within each supported platform's standard tool-connection flow
FR26: The MCP bill-search tool can be connected to and invoked by a user's existing chatbot platform, verified by successful legislator-scoped bill retrieval within each supported platform's standard tool-connection flow
FR27: The system can provide a guided system prompt that instructs a connected chatbot to execute the 4-step civic drafting flow end-to-end without manual intervention beyond initial setup, verified by step-completion in at least 4 of 5 independent test runs
FR28: A developer or civic tech contributor can install and run the MCP tools locally from the public repository, verified by successful address-to-legislator lookup and bill retrieval from a local instance using only repository documentation
FR29: A visitor can access a landing page that explains the tool's purpose and how to connect it to a supported chatbot platform
FR30: A visitor can find the tool via search engines using civic-engagement-related search terms, targeting top-20 organic ranking for at least 2 of the 3 target keyword phrases within 6 months of launch
FR31: A visitor can navigate from the landing page to setup instructions for their specific chatbot platform
FR32: A visitor can access the platform's privacy policy from the landing page
FR33: A developer or civic tech contributor can access MCP tool documentation and local development setup instructions from the public repository, with setup complete and at least one successful end-to-end tool invocation achieved in under 30 minutes without additional knowledge transfer from the original author
FR34: The operator can access structured logs of MCP tool requests and responses for debugging and error investigation
FR35: The operator can identify the source of any recorded error (external API failure vs. application logic failure) from structured log output without additional tooling
FR36: The system can handle Utah Legislature API transient failures transparently, retrying at least 2 times with increasing delay between retries before returning a user-facing error; the user sees no error for failures resolved within 10 seconds
FR37: The system can handle non-residential or ambiguous addresses (P.O. Boxes, rural routes, out-of-state addresses) by returning an error message that identifies the address issue type and suggests a corrective action
FR38: The operator can update the legislative data cache refresh schedule and data-provider configuration while the service remains available, with no more than 30 seconds of request failure during the configuration change
FR39: The system can record anonymous usage events (session initiated, draft generated, message delivered) to support measurement of return usage rates and geographic distribution across Utah senate districts, without collecting or storing PII
FR40: A developer or civic tech contributor can submit bug reports, feature requests, and questions through the public repository's issue tracker

### NonFunctional Requirements

NFR1: Landing page achieves a performance score ≥ 90 on mobile and desktop as measured by a web performance audit at time of release
NFR2: Address-to-legislator GIS lookup completes in under 3 seconds under normal conditions, as measured by server-side request timing logs during pre-launch testing
NFR3: Bill/vote lookups respond in under 1 second, as measured by server-side request timing logs during load testing
NFR4: The system displays a loading state for any operation expected to exceed 1 second, verified by manual user testing of all async operations
NFR5: All traffic between users, web app, and MCP backend is encrypted in transit via HTTPS with valid TLS certificates, verified by passing TLS configuration check on all public endpoints at time of deployment
NFR6: Utah Legislature API developer token is stored in server-side configuration inaccessible to client-side code, verified by absence of the token in any client-accessible response or browser-visible source
NFR7: The system does not persistently store user addresses, personal stories, or any PII beyond the duration of a session, verified by absence of PII in server logs and persistent storage after session completion
NFR8: The MCP backend public endpoint enforces rate limiting that rejects requests exceeding 60 per IP per minute with a 429 response, verified by automated rate-limit testing against the production endpoint
NFR9: The system supports up to 100 concurrent sessions without performance degradation, verified by load testing at 100 concurrent simulated users with no increase in error rate and median response times within the bounds of NFR2 and NFR3
NFR10: The system's upstream API call rate does not increase proportionally with concurrent user load — upstream API calls increase by no more than 1.5x when concurrent users increase by 10x — verified by confirming upstream call volume during load testing at 10 and 100 concurrent users
NFR11: Web application meets WCAG 2.1 AA baseline at MVP: full keyboard navigability, color contrast ≥ 4.5:1 for normal text, screen reader compatibility for the core chatbot flow, verified by automated accessibility audit
NFR12: Mobile tap targets meet minimum 44×44px throughout the application, verified by automated accessibility audit
NFR13: MCP tools conform to the MCP specification version pinned at time of development, verified by successful tool invocation in Claude.ai and ChatGPT at time of release
NFR14: Swapping the legislative data provider from the Utah Legislature API to a third-party source requires no changes to the MCP tool's public interface, verified by substituting a mock data provider and confirming all tool invocations return valid responses without interface modification
NFR15: GIS address lookup on API failure returns a human-readable error message identifying the failure source within 3 seconds, verified by simulating GIS API failure and confirming error response format and timing
NFR16: System targets 99% uptime measured on a rolling 30-day basis as reported by hosting platform uptime monitoring
NFR17: Legislative data cache serves bill and legislator requests during Utah Legislature API outages using the most recently cached data, verified by simulating API unavailability and confirming cached responses are returned within normal response time budgets
NFR18: System is deployable by a new contributor without direct knowledge transfer from the original author, verified by an independent contributor completing setup and achieving a successful end-to-end tool invocation using only repository documentation

### Additional Requirements

**From Architecture (implementation-impacting):**

- STARTER TEMPLATE (impacts Epic 1 Story 1): pnpm workspaces monorepo with two apps — `apps/web` (Next.js 16.1.6 + Tailwind v4 + shadcn/ui) and `apps/mcp-server` (TypeScript MCP server); shared `packages/typescript-config` and `packages/types`
- Cache storage: SQLite via better-sqlite3 v12.6.2 — tables: `legislators`, `bills`, `bill_fts` (FTS5), `events`; per-legislator sponsor index built on each bill refresh
- MCP HTTP transport: `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` v1.26.0 via Hono v4.12.1
- Background scheduler: node-cron v4.2.1 (in-process); bills hourly, legislators daily, cache warm-up at startup
- Structured logging: pino v10.3.1; `source` field on every entry; addresses always `'[REDACTED]'`; `console.log` FORBIDDEN in mcp-server (corrupts JSON-RPC stream)
- Testing: Vitest v4.0.18 (unit + integration) + Playwright v1.58.2 (E2E); test files co-located with source
- CI/CD: GitHub Actions (lint + typecheck + Vitest on PR; Playwright on PR against preview; auto-deploy on merge to main via Vercel/Railway git integration)
- Rate limiting: hono-rate-limiter v0.4.2; 60 req/IP/min; 429 on breach
- LegislatureDataProvider interface: all bill/legislator data access goes through this interface; swappable without changing MCP tool public schemas (NFR14)
- Environment validation: zod schema at startup in `mcp-server/src/env.ts`; server fails fast if required vars missing
- TypeScript strict mode throughout; no `any`, no `@ts-ignore`
- MCP tool responses must be structured JSON (never prose strings); type contracts defined in `packages/types/`
- Three-field AppError format: `{ source, nature, action }` for all errors
- Shared retryWithDelay utility in `mcp-server/src/lib/retry.ts`; 2 retries, increasing delay (1s, 3s); never inline retry
- Unit tests mock at `LegislatureDataProvider` boundary — never touch SQLite directly
- No barrel files (`index.ts` re-exports) in `components/` or `tools/`
- Shared types in `packages/types/` only; no cross-workspace imports between apps
- Session awareness: inter-session period detection in `cache/bills.ts` and `cache/refresh.ts`
- Frontend hosting: Vercel; MCP backend hosting: Railway; both via git integration

**From UX Design Specification:**

- Mobile-first layout: 375px primary design viewport; 320px minimum; single-column throughout; max-width 680–720px centered
- No hover-dependent interactions in any primary user flow
- Touch targets: 44×44px minimum with 8px minimum gap between adjacent targets
- Dark mode via Tailwind `dark:` prefix + shadcn/ui CSS variable system; defaults to `prefers-color-scheme`; manual override in ReadingPreferences
- Atkinson Hyperlegible as default typeface via `next/font` with `font-display: swap`
- OpenDyslexic loaded on-demand only when toggle activated (not bundled by default)
- shadcn/ui Skeleton for all async content areas; skeleton dimensions match real content to prevent layout shift; `aria-busy="true"` on loading regions
- Progressive disclosure: each step reveals only what's needed for the next decision
- Error states must communicate three things: source (what), nature (why), action (what to try next) — never a dead end
- `ProgressStrip` component: 4-step indicator (Address / Your Rep / Your Issue / Send); amber = completed
- `LegislatorCard` component: amber 3px top border for Aha #1 reveal; chamber badge; contact info with type label / type-unknown flag
- `BillCard` component: issue theme pill; bill number (amber, monospace); vote result + date
- `DraftCard` component: medium badge + formality badge + AI disclosure; email (multi-paragraph) vs text (compact, character count) variants
- `SendActions` component: primary CTA ("Open in Gmail →" or "Copy message"); clipboard fallback to selectable text if clipboard denied
- `CitationTag` component: pill showing bill number · session · vote date; inline in BillCard and DraftCard
- `ErrorBanner` component: `role="alert"`; source badge + message + action; amber-tinted (not red)
- `ReadingPreferences` component: dark mode + OpenDyslexic toggle; `role="switch"` with `aria-checked`; persisted in localStorage
- `BookmarkPrompt`: one-line plain text, no modal; appears below SendActions after delivery completes
- Browser support matrix: Chrome, Firefox, Safari, Edge (desktop, current + 1 prior); iOS Safari and Android Chrome (mobile, current + 1 prior)
- SEO: Open Graph tags for social sharing; target keywords: "contact Utah legislator," "write my state representative Utah," "email Utah state senator"
- AI disclosure: message output structure must accommodate future unobtrusive disclosure without layout changes
- Privacy policy accessible from landing page
- Skip link "Skip to main content" as first focusable element
- Focus ring: 2px solid amber, 2px offset; never `outline: none` without replacement; use `focus-visible:` not `focus:`
- `prefers-reduced-motion` honored via Tailwind `motion-safe:` utilities
- Color independence: information never conveyed by color alone (icon + text + color)

### FR Coverage Map

| FR | Epic | Context |
|---|---|---|
| FR1 | Epic 2 | Address entry UI |
| FR2 | Epic 2 | GIS lookup → district |
| FR3 | Epic 2 | House + Senate selection |
| FR4 | Epic 2 | Legislator card with contact info |
| FR5 | Epic 2 | Phone type label / unknown flag |
| FR6 | Epic 3 | Bills by session (active or most recent) |
| FR7 | Epic 3 | Bill detail + vote record |
| FR8 | Epic 3 | FTS5 theme search with synonyms |
| FR9 | Epic 3 | Inter-session: up to 5 bills from last 2 sessions |
| FR10 | Epic 3 | SQLite cache with rate-limit-aware refresh |
| FR11 | Epic 3 | Per-legislator sponsor index <2s |
| FR12 | Epic 4 | Personal story capture before draft |
| FR13 | Epic 4 | 2-3 issue framings from legislator record |
| FR14 | Epic 4 | Explicit confirmation before generation |
| FR15 | Epic 4 | Medium selection (email / text) |
| FR16 | Epic 4 | Formality selection (conversational / formal) |
| FR17 | Epic 4 | Voice-grounded draft with citation, no editorializing |
| FR18 | Epic 4 | Medium-calibrated length (150-400w email / <160 char text) |
| FR19 | Epic 4 | Inline source citation (bill #, session, vote date) |
| FR20 | Epic 4 | Draft review and revision request |
| FR21 | Epic 4 | System revises draft on feedback |
| FR22 | Epic 5 | mailto: URI → opens email client |
| FR23 | Epic 5 | Clipboard copy for text/SMS |
| FR24 | Epic 5 | Legislator contact info alongside draft |
| FR25 | Epic 2 | lookup_legislator invokable from Claude.ai + ChatGPT |
| FR26 | Epic 3 | search_bills invokable from Claude.ai + ChatGPT |
| FR27 | Epic 4 | System prompt drives 4-step flow end-to-end |
| FR28 | Epic 8 | Local dev setup from repo only |
| FR29 | Epic 6 | Landing page explains tool + setup |
| FR30 | Epic 6 | SEO top-20 for 2 of 3 target keywords |
| FR31 | Epic 6 | Platform-specific setup instructions |
| FR32 | Epic 6 | Privacy policy linked from landing page |
| FR33 | Epic 8 | Docs + setup in <30 min |
| FR34 | Epic 7 | Structured logs via platform log stream |
| FR35 | Epic 7 | Error source categorization (API vs logic) |
| FR36 | Epic 3 | Retry with increasing delay, <10s before user sees error |
| FR37 | Epic 2 | Non-residential / ambiguous address error handling |
| FR38 | Epic 7 | Cache config update with <30s disruption |
| FR39 | Epic 7 | Anonymous events: session, draft, delivery, district |
| FR40 | Epic 8 | Public issue tracker |

## Epic 1: Project Foundation & Infrastructure

Developers can clone the repo, run both services locally, and deploy to production — a working, observable foundation that makes every subsequent epic buildable.

### Story 1.1: Initialize pnpm Workspaces Monorepo

As a **developer**,
I want a pnpm workspaces monorepo with shared TypeScript config and shared types packages,
So that both the web app and MCP server share conventions and I can run the full stack from a single repo.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `pnpm install` from the root
**Then** all workspace dependencies install without errors
**And** `packages/typescript-config` exists with `base.json`, `nextjs.json`, and `node.json` extending a shared strict base
**And** `packages/types` exists with an `index.ts` exporting `Legislator`, `Bill`, `AppError`, `LookupLegislatorResult`, `SearchBillsResult`, and `AnalyticsEvent` interfaces
**And** `pnpm --filter web dev` starts the Next.js dev server without errors
**And** `pnpm --filter mcp-server dev` starts the MCP server without errors
**And** TypeScript strict mode is enabled across all tsconfigs (`strict: true`, no `any`, no `@ts-ignore`)
**And** no barrel files (`index.ts` re-exports) exist in `components/` or `tools/`

---

### Story 1.2: MCP Server with Hono, Rate Limiting, and Pino Logging

As a **developer**,
I want a Hono-based MCP server with environment validation, IP-based rate limiting, CORS, and structured pino logging,
So that the server is production-safe from day one and MCP tools can be registered without risking protocol corruption or token exposure.

**Acceptance Criteria:**

**Given** required environment variables are set in `.env`
**When** the MCP server starts
**Then** Hono listens on the configured port (default 3001)
**And** the zod env schema in `src/env.ts` validates all required vars at startup; server throws a descriptive error and exits with non-zero code if any are missing
**And** rate limiting middleware rejects requests exceeding 60 per IP per minute with a 429 response
**And** CORS middleware is configured for chatbot platform origins (Claude.ai, ChatGPT)
**And** every pino log entry includes a `source` field identifying the subsystem
**And** `console.log` is forbidden in `apps/mcp-server/` via ESLint rule (`no-console: ['error', { allow: ['error'] }]`); violations fail CI
**And** a `.env.example` documents all required environment variables

---

### Story 1.3: SQLite Cache Schema Initialization

As a **developer**,
I want the SQLite database schema initialized automatically on server startup,
So that the cache infrastructure is ready to store legislators, bills, and analytics events before any tool is invoked.

**Acceptance Criteria:**

**Given** the MCP server starts for the first time
**When** the SQLite database initializes
**Then** the following tables exist: `legislators` (id, chamber, district, name, email, phone, phone_label, session, cached_at), `bills` (id, session, title, summary, status, sponsor_id, vote_result, vote_date, cached_at), `bill_fts` (FTS5 virtual table over bills.title and bills.summary), `events` (id, event_type, district, timestamp)
**And** all column names are `snake_case`
**And** indexes exist: `idx_bills_session`, `idx_bills_sponsor_id`
**And** `data/on-record.db` is in `.gitignore`
**And** all direct `better-sqlite3` imports are confined to `apps/mcp-server/src/cache/` — no DB imports in tool modules
**And** schema initialization is idempotent (safe to run on every restart)

---

### Story 1.4: Shared Retry Utility and AppError Type

As a **developer**,
I want a shared `retryWithDelay` utility and `AppError` type established before any MCP tool is written,
So that retry logic and error formatting are consistent everywhere from the first story.

**Acceptance Criteria:**

**Given** an async function that fails on the first call
**When** `retryWithDelay(fn, 2, 1000)` is called
**Then** the utility retries after 1 second on the first failure
**And** retries after 3 seconds on the second failure (increasing delay)
**And** throws the final error if all attempts are exhausted
**And** the `AppError` interface `{ source: 'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app', nature: string, action: string }` is exported from `packages/types/`
**And** `retryWithDelay` lives at `apps/mcp-server/src/lib/retry.ts`
**And** unit tests cover: success on first try, success on retry, all retries exhausted

---

### Story 1.5: CI/CD Pipeline and Developer README

As a **developer**,
I want a GitHub Actions CI pipeline that enforces code quality on every PR and a README that covers local setup,
So that contributors can get started and broken builds never reach main.

**Acceptance Criteria:**

**Given** a PR is opened against main
**When** the CI pipeline runs
**Then** ESLint runs across the monorepo and fails on any violation
**And** TypeScript type-check passes with strict mode for both apps
**And** Vitest runs all unit tests and fails on any failure
**And** the monorepo root `README.md` documents: prerequisites, local dev setup, all pnpm workspace commands, required environment variables, and how to run tests
**And** the public GitHub repository has an issue tracker enabled
**And** `.env.example` files exist in both `apps/web/` and `apps/mcp-server/`

---

## Epic 2: Constituent Can Identify Their Utah Legislators

A constituent enters their home address and sees their House and Senate legislators with name, chamber, district, and contact info — including phone type labels. The `lookup_legislator` MCP tool is invokable from Claude.ai and ChatGPT.

### Story 2.1: UGRC GIS Address-to-District Lookup

As a **constituent**,
I want my home address resolved to my Utah House and Senate districts via GIS,
So that the tool can identify my specific legislators without me knowing my district number.

**Acceptance Criteria:**

**Given** a valid Utah street address is submitted
**When** the UGRC Geocoding API is called
**Then** the address resolves to lat/long coordinates
**And** the SGID political layer query returns House and Senate district numbers
**And** the full lookup completes in under 3 seconds (NFR2)
**And** the address is logged as `'[REDACTED]'` — never in plain text (NFR7)
**And** `retryWithDelay` wraps the UGRC API call with 2 retries and increasing delay
**And** on GIS API failure, an `AppError` is returned with `source: 'gis-api'` and a human-readable error within 3 seconds (NFR15)

---

### Story 2.2: LegislatureDataProvider Interface and Utah Legislature API — Legislators

As a **developer**,
I want a `LegislatureDataProvider` interface with a Utah Legislature API implementation for legislator data,
So that constituent identification works end-to-end and the data layer is swappable without touching MCP tool schemas.

**Acceptance Criteria:**

**Given** the `LegislatureDataProvider` interface is defined in `providers/types.ts`
**When** `getLegislatorsByDistrict(chamber, district)` is called on the Utah implementation
**Then** it returns legislators matching that chamber and district
**And** the interface declares: `getLegislatorsByDistrict`, `getBillsBySession`, `getBillDetail` — all returning typed Promises
**And** the `UTAH_LEGISLATURE_API_KEY` token is accessed from env only — never passed to client code (NFR6)
**And** swapping to a mock provider requires zero changes to the MCP tool's public schema (NFR14)
**And** the Utah implementation lives in `providers/utah-legislature.ts`

---

### Story 2.3: Legislators SQLite Cache with Daily Refresh

As a **developer**,
I want legislators cached in SQLite and refreshed daily via node-cron,
So that the `lookup_legislator` tool serves results in under 3 seconds without hitting the upstream API on every request.

**Acceptance Criteria:**

**Given** the MCP server starts
**When** cache warm-up runs on startup
**Then** legislators are fetched from the Utah Legislature API and written to the `legislators` table
**And** subsequent requests are served from cache, completing in under 3 seconds (NFR2)
**And** the cache refreshes at 6 AM daily (`0 6 * * *` cron) — within the ≤1×/day rate limit
**And** stale cached data is served during Utah Legislature API outages (NFR17)
**And** `cache/legislators.ts` is the only module that writes to the `legislators` table

---

### Story 2.4: `lookup_legislator` MCP Tool

As a **constituent**,
I want to invoke a `lookup_legislator` MCP tool from Claude.ai or ChatGPT,
So that the chatbot can identify my House and Senate legislators and their contact details from my address.

**Acceptance Criteria:**

**Given** the `lookup_legislator` tool is connected to Claude.ai or ChatGPT
**When** a valid Utah address is provided as tool input
**Then** the tool returns a structured JSON response matching the `LookupLegislatorResult` type from `packages/types/`
**And** the response includes both House and Senate legislators (if found): name, chamber, district, email, phone, phone_label
**And** where the API provides no phone type label, the response includes `phoneTypeUnknown: true` (FR5)
**And** the tool response is structured JSON — never a prose string
**And** the tool conforms to the MCP specification version pinned at development time (NFR13)
**And** verified by successful end-to-end invocation from Claude.ai and ChatGPT (FR25)

---

### Story 2.5: Address Error Handling with ErrorBanner Component

As a **constituent**,
I want a clear, actionable error message when my address can't be resolved,
So that I know exactly what to fix rather than hitting a dead end.

**Acceptance Criteria:**

**Given** a P.O. Box, rural route, or out-of-state address is submitted
**When** the GIS lookup fails to resolve to a Utah legislative district
**Then** the tool returns an `AppError` identifying the specific issue type (P.O. Box detected / out-of-state / unresolvable) with a corrective action (e.g., "Use your street address rather than a P.O. Box") (FR37)
**And** the error response arrives within 3 seconds (NFR15)
**And** no PII (address value) appears in server logs — always `'[REDACTED]'` (NFR7)
**And** the `ErrorBanner` UI component renders the error with: source badge, error message, and action button or link
**And** `ErrorBanner` uses `role="alert"` so screen readers announce it immediately on render (NFR11)
**And** the recoverable `ErrorBanner` variant includes a "Try again" or "Correct address" action

---

### Story 2.6: LegislatorCard UI Component with Tailwind Design Tokens

As a **constituent**,
I want to see my legislator displayed in a named card with the Aha #1 visual treatment,
So that the moment I see my actual representative named feels deliberate and real — not like a text field result.

**Acceptance Criteria:**

**Given** `globals.css` defines all Tailwind v4 `@theme` design tokens (primary `#1e3a4f`, accent amber `#c47d2e`, surface `#fafaf8`, text `#1a1a1a`, error `#b91c1c`, success `#2e7d52`, dark mode variants)
**When** `LegislatorCard` renders with legislator data
**Then** it displays: amber 3px top border, chamber badge (House/Senate), legislator name as `<h2>`, district line, email, phone with API-provided type label
**And** where `phoneTypeUnknown: true`, the card displays a "number type unknown" flag alongside the number (FR5)
**And** when selectable (FR3), the card has `role="button"` and `aria-pressed` reflecting selected state
**And** a `Skeleton` placeholder renders during GIS lookup (NFR4); skeleton dimensions match real card dimensions
**And** all interactive states meet 44×44px touch target minimum (NFR12)
**And** all color pairings meet WCAG 2.1 AA contrast (≥4.5:1) (NFR11)
**And** the component uses only Tailwind design tokens — no hardcoded hex values in the component file

---

## Epic 3: Constituent Can Explore Their Legislator's Legislative Record

A constituent can find bills their legislator sponsored or voted on, searchable by issue theme, served from a cache that stays fresh and resilient during API outages. The `search_bills` MCP tool is invokable from chatbot platforms.

### Story 3.1: Utah Legislature API Integration — Bills by Session

As a **developer**,
I want the Utah Legislature API implementation to fetch bills by session,
So that the bills cache can be populated with the full legislative record for search and lookup.

**Acceptance Criteria:**

**Given** the `LegislatureDataProvider` interface from Epic 2
**When** `getBillsBySession(session)` is called on the Utah implementation
**Then** it fetches all bills for that session from `glen.le.utah.gov` using the developer token from env
**And** it returns bills typed as `Bill[]` from `packages/types/`
**And** `retryWithDelay` wraps all API calls
**And** timestamp-based change detection is used to avoid unnecessary full re-fetches
**And** the `UTAH_LEGISLATURE_API_KEY` token never appears in client-accessible code or logs (NFR6)

---

### Story 3.2: Bills SQLite Cache with Hourly Refresh and Per-Legislator Sponsor Index

As a **developer**,
I want bills cached in SQLite with an hourly refresh and a per-legislator sponsor index rebuilt on each refresh,
So that bill searches return in under 1 second and upstream API calls don't scale with user load.

**Acceptance Criteria:**

**Given** the bills cache is populated on startup
**When** any bill or legislator lookup is requested
**Then** it is served from cache and completes in under 1 second (NFR3)
**And** the cache refreshes hourly (`0 * * * *` cron) — within the ≤1×/hour rate limit
**And** the per-legislator sponsor index is rebuilt from the `bills` table on every refresh
**And** stale data is served during Utah Legislature API outages (NFR17)
**And** upstream API call volume does not increase proportionally with concurrent users — cache absorbs load (NFR10)
**And** `cache/bills.ts` is the only module that writes to the `bills` and `bill_fts` tables

---

### Story 3.3: FTS5 Bill Theme Search

As a **constituent**,
I want to search my legislator's bills by issue theme using natural-language keywords,
So that I can find relevant legislation even if I don't know a specific bill title or number.

**Acceptance Criteria:**

**Given** the `bill_fts` FTS5 virtual table is populated
**When** a theme keyword is searched for a specific legislator
**Then** at least 1 result is returned where the bill's title, summary, or subject tags match the keyword or a recognized synonym (FR8)
**And** results are filtered to bills sponsored by that specific legislator — not all bills in the session
**And** the search completes in under 1 second from cache (NFR3)
**And** supported theme synonyms include at minimum: healthcare (health, insurance, Medicaid, prescription), education (school, teacher, student), housing (rent, landlord, affordable), redistricting (gerrymandering, Prop 4, district), environment (climate, pollution, water), taxes (revenue, budget, fiscal)

---

### Story 3.4: Inter-Session Bill Handling

As a **constituent**,
I want to find relevant bills from past sessions when the legislature is not currently in session,
So that I can compose a meaningful message year-round — not just during the January–March session window.

**Acceptance Criteria:**

**Given** the Utah Legislature is not in active session
**When** a bill search is requested
**Then** the system surfaces up to 5 bills matching the issue theme from the most recent 2 completed sessions (FR9)
**And** session awareness is determined from session metadata stored in SQLite — not hardcoded dates
**And** inter-session responses include the session identifier (e.g., "2024 General Session") so citations remain accurate (FR19)
**And** results are served from cache in under 1 second (NFR3)

---

### Story 3.5: `search_bills` MCP Tool with Retry Logic

As a **constituent**,
I want to invoke a `search_bills` MCP tool from Claude.ai or ChatGPT,
So that the chatbot can surface specific legislation from my legislator's record grounded in my stated concern.

**Acceptance Criteria:**

**Given** the `search_bills` tool is connected to Claude.ai or ChatGPT
**When** a legislator ID and issue theme are provided as tool input
**Then** the tool returns a structured JSON response matching `SearchBillsResult` from `packages/types/`
**And** each bill in the response includes: bill ID, title, summary, status, vote_result, vote_date, session — all fields required for citation (FR7, FR19)
**And** the tool response is structured JSON — never prose
**And** the tool conforms to the MCP specification (NFR13)
**And** verified by successful end-to-end invocation from Claude.ai and ChatGPT (FR26)
**And** Utah Legislature API transient failures are retried at least 2 times with increasing delay; the user sees no error for failures resolved within 10 seconds (FR36)
**And** if all retries are exhausted, the tool returns an `AppError` with `source: 'legislature-api'`

---

### Story 3.6: BillCard and CitationTag UI Components

As a **constituent**,
I want to see bills displayed as cards with an inline citation pill,
So that I can verify the legislative data at a glance before it goes into my draft.

**Acceptance Criteria:**

**Given** `search_bills` returns bill data
**When** `BillCard` renders
**Then** it displays: issue theme pill, bill number (amber, monospace font), bill title, vote result + date (muted text), and a `CitationTag`
**And** `CitationTag` renders as a pill: `HB 0234 · 2024 General Session · Mar 4, 2024`
**And** `CitationTag` is reusable inside both `BillCard` and `DraftCard` (Epic 4)
**And** when selectable, `BillCard` has `role="button"` and `aria-pressed`
**And** a `Skeleton` list renders during bill search (NFR4); skeleton dimensions match expected card dimensions
**And** both components meet 44×44px touch targets (NFR12) and WCAG 2.1 AA contrast (NFR11)
**And** both use only Tailwind design tokens — no hardcoded hex values

---

## Epic 4: Constituent Can Get a Voiced, Cited Draft

A constituent describes their concern in their own words, the chatbot guides them to a specific bill, and they receive a draft in their voice grounded in their legislator's actual record — with citations — that they can revise. The system prompt drives the full 4-step BYOLLM flow.

### Story 4.1: System Prompt and 4-Step Agent Instructions

As a **constituent**,
I want a system prompt that guides my chatbot through the full constituent flow automatically,
So that I can get from concern to draft without manually directing the conversation at each step.

**Acceptance Criteria:**

**Given** the `system-prompt/agent-instructions.md` is loaded into a connected chatbot (Claude.ai or ChatGPT)
**When** a conversation begins
**Then** the chatbot executes the 4-step flow: (1) warm open question + personal concern capture, (2) address entry + `lookup_legislator` invocation, (3) bill surfacing via `search_bills` + constituent confirmation, (4) draft generation
**And** the flow completes end-to-end without manual intervention beyond the constituent's natural responses (FR27)
**And** step-completion is verified in at least 4 of 5 independent test runs across Claude.ai and ChatGPT (FR27)
**And** the system prompt instructs the LLM to present retrieved legislative data as verifiable fact — not assertion or inference
**And** the system prompt instructs the LLM not to editorialize the legislator's record (characterize intent, motivation, or judgment)

---

### Story 4.2: Personal Concern Capture and Empathetic Issue Discovery

As a **constituent**,
I want the chatbot to acknowledge my concern and help me find the right issue framing even if I don't know which bill I care about,
So that my personal story is the starting point — not a form field.

**Acceptance Criteria:**

**Given** the system prompt is active and the constituent begins the conversation
**When** the constituent describes their concern — specific or vague
**Then** the chatbot acknowledges the personal emotion before moving to legislative data (validates before informs)
**And** at least one personal-impact detail is captured before bill selection or draft generation proceeds (FR12)
**And** if the constituent does not know a specific bill, the chatbot presents 2–3 issue framings derived from the legislator's actual record for confirmation or redirect (FR13)
**And** draft generation does not begin until the constituent has provided at least one explicit confirmation or correction (FR14)

---

### Story 4.3: Medium and Formality Selection

As a **constituent**,
I want to choose email or text and how formal I want to sound before the draft is generated,
So that my message fits the channel I'm using and matches how I actually communicate.

**Acceptance Criteria:**

**Given** the constituent has confirmed the issue context
**When** the system prompt reaches the delivery preferences step
**Then** the chatbot asks for medium selection: email or text/SMS (FR15)
**And** asks for formality level with at least two distinct options: conversational or formal (FR16)
**And** both choices are captured and passed to the draft generation step before any draft is produced
**And** the generated draft reflects the selected formality register in tone and vocabulary (FR16)

---

### Story 4.4: Voice-Calibrated Draft Generation with Source Citations

As a **constituent**,
I want a draft generated in my own voice, grounded in my legislator's actual record, with a citation I can verify,
So that my message cannot be dismissed as a form letter and I can stand behind every claim in it.

**Acceptance Criteria:**

**Given** the constituent has confirmed issue framing, medium, and formality
**When** the draft is generated
**Then** the draft includes at least one source citation: bill number, session identifier, vote date (FR19)
**And** email drafts are 2–4 paragraphs, 150–400 words (FR18)
**And** text/SMS drafts are 1–3 sentences, under 160 characters per message segment (FR18)
**And** the draft does not contain unsupported claims about the legislator's intent, motivation, or character (FR17)
**And** the draft reflects the constituent's stated personal concern — not a generic template (FR17)
**And** the system prompt instructs the LLM to use the constituent's own words and stories, not to editorialize

---

### Story 4.5: Draft Revision Loop

As a **constituent**,
I want to request revisions to my draft and have the chatbot incorporate my feedback,
So that the final message truly sounds like me before I send it.

**Acceptance Criteria:**

**Given** a draft has been generated
**When** the constituent requests a revision (e.g., "make it shorter," "add that I've lived here 22 years")
**Then** the chatbot generates a revised draft incorporating the feedback (FR21)
**And** the constituent can review the revised draft and request further revisions (FR20)
**And** the revision loop returns to the draft — not to the beginning of the flow
**And** the revised draft maintains the same citation and sourcing constraints as the original (bill number, session, vote date preserved)
**And** draft generation does not proceed past a revision until the constituent explicitly accepts or further redirects

---

### Story 4.6: ProgressStrip and DraftCard UI Components

As a **constituent**,
I want to see where I am in the flow and have my draft displayed in a clear, formatted card with the citation pill visible,
So that I can review the output confidently before I decide to send.

**Acceptance Criteria:**

**Given** the constituent is anywhere in the core flow
**When** `ProgressStrip` renders
**Then** it shows 4 segments (Address / Your Rep / Your Issue / Send); amber = completed, white = active, dim = upcoming
**And** it carries `<nav aria-label="Form progress">` with `aria-current="step"` on the active segment (NFR11)
**And** `ProgressStrip` is hidden on the landing page and on the post-send success state

**Given** a draft has been generated
**When** `DraftCard` renders
**Then** it displays: medium badge, formality badge, AI disclosure placeholder (accommodates future disclosure without layout change)
**And** email variant uses generous line-height with paragraph spacing; text/SMS variant shows character count when near 160-char limit
**And** `CitationTag` renders inline in the draft body referencing the bill number, session, and vote date
**And** the draft body is selectable text — not wrapped in a button
**And** a `Skeleton` placeholder renders during draft generation (NFR4)

---

## Epic 5: Constituent Can Send Their Message in One Action

A constituent delivers their draft to their legislator via `mailto:` (opens email client pre-filled) or clipboard copy (one tap for text/SMS), with the legislator's contact info visible alongside.

### Story 5.1: mailto: URI Email Delivery

As a **constituent**,
I want to open my draft email in my email client with a single tap,
So that I can send my message without copying, pasting, or addressing anything myself.

**Acceptance Criteria:**

**Given** a draft email has been generated
**When** the constituent taps "Open in Gmail →"
**Then** a `mailto:` URI pre-filled with the legislator's email address, a subject line, and the full draft body is triggered (FR22)
**And** the system email client or web email provider opens with the message ready to send
**And** the legislator's email address and contact details are visible alongside the draft (FR24)
**And** the mailto: link is verified to open correctly on iOS Safari (Mail app), Android Chrome, and desktop browsers
**And** if no email client is configured, the UI surfaces the legislator's email address as a copyable fallback

---

### Story 5.2: Clipboard Copy for Text/SMS Delivery

As a **constituent**,
I want to copy my draft text message with one tap for sending via my preferred messaging app,
So that I can contact my legislator by phone or text without typing it out myself.

**Acceptance Criteria:**

**Given** a draft text/SMS has been generated
**When** the constituent taps "Copy message"
**Then** `navigator.clipboard.writeText()` writes the draft to the clipboard (FR23)
**And** a Toast confirmation appears immediately on successful copy
**And** if the Clipboard API is denied or unavailable, the draft is displayed as selectable plain text as a fallback — the constituent can always copy manually
**And** the legislator's phone number with type label (or "type unknown" flag) is visible alongside the draft (FR24)

---

### Story 5.3: SendActions and BookmarkPrompt UI Components

As a **constituent**,
I want the delivery step to feel like the emotional payoff of the whole experience,
So that "I actually sent it" is the last thing I feel — not "now what do I do?"

**Acceptance Criteria:**

**Given** a draft is ready for delivery
**When** `SendActions` renders
**Then** the primary CTA is full-width on mobile: "Open in Gmail →" (email) or "Copy message" (text/SMS)
**And** the secondary delivery method appears as a ghost button below the primary
**And** an AI disclosure link is present in `SendActions` (layout accommodates future disclosure without restructuring)
**And** both buttons meet 44×44px minimum touch target (NFR12)
**And** a `Skeleton` renders during any async operation before delivery options appear (NFR4)

**Given** the constituent has successfully delivered their message
**When** delivery completes
**Then** `BookmarkPrompt` renders below `SendActions` as one line of plain text: "Bookmark this page to come back next session."
**And** `BookmarkPrompt` has no button, no modal, and no required interaction — it is purely ambient

---

## Epic 6: Anyone Can Discover and Set Up the Tool

A visitor finds the tool via search, reads a plain-language explanation, follows step-by-step setup instructions for their chatbot platform, and accesses the privacy policy. The landing page is SEO-optimized and mobile-first.

### Story 6.1: SEO-Optimized Landing Page

As a **visitor**,
I want a clear, plain-language landing page that explains On Record and what it does,
So that I understand the tool and trust it enough to set it up — even if I've never heard of MCP.

**Acceptance Criteria:**

**Given** a visitor arrives at the root URL
**When** the page loads
**Then** `app/page.tsx` is statically generated (SSG) and served from the Vercel CDN (NFR1)
**And** the page explains the tool's purpose and BYOLLM concept in language accessible to a non-technical PAC attendee (8th grade reading level target)
**And** the page achieves Lighthouse performance score ≥90 on mobile and desktop (NFR1)
**And** meta tags include target keywords: "contact Utah legislator," "write my state representative Utah," "email Utah state senator" (FR30)
**And** the primary CTA leads to the BYOLLM setup flow (FR29)
**And** the page is fully navigable by keyboard with visible focus indicators (NFR11)
**And** all tap targets meet 44×44px minimum on mobile (NFR12)

---

### Story 6.2: BYOLLM Setup Flow with Platform-Specific Instructions

As a **visitor**,
I want step-by-step setup instructions for my specific chatbot platform (Claude.ai or ChatGPT),
So that I can connect the MCP tools without needing to know what MCP means or how it works.

**Acceptance Criteria:**

**Given** a visitor navigates to `/setup`
**When** the setup flow renders
**Then** platform-specific instructions are available for Claude.ai and ChatGPT (FR31)
**And** instructions are written for a non-technical user — no assumed technical vocabulary
**And** each step includes a clear action and a verification ("you'll know it worked when...")
**And** common setup failure modes are listed with corrective actions (no dead ends)
**And** `ProgressStrip` is visible during the setup flow showing current step
**And** the page is client-side rendered (CSR) and requires no authentication

---

### Story 6.3: Privacy Policy and Open Graph Social Sharing

As a **visitor**,
I want to access the privacy policy from the landing page and share the tool on social media with a proper preview,
So that I trust On Record's data practices and can easily spread the word through my network.

**Acceptance Criteria:**

**Given** a visitor is on the landing page
**When** they click the privacy policy link in the footer
**Then** the policy is accessible at a stable URL (FR32)
**And** the policy states: address is collected for legislator lookup only, retained for session duration only, not sold or shared with third parties, and is not persistently stored
**And** Open Graph meta tags on the landing page include: `og:title`, `og:description`, `og:image` (referencing `public/og-image.png`) for social sharing previews (FR30)
**And** the `og-image.png` is sized 1200×630px following standard Open Graph dimensions

---

### Story 6.4: ReadingPreferences Component (Dark Mode + OpenDyslexic)

As a **visitor**,
I want to switch to dark mode or an OpenDyslexic font to make the page easier to read,
So that On Record is accessible to me regardless of my reading needs — without feeling like an afterthought.

**Acceptance Criteria:**

**Given** a visitor is on any page
**When** they open the ReadingPreferences panel (accessible from the footer on every page)
**Then** dark mode toggle defaults to `prefers-color-scheme`; manual override persists to localStorage
**And** toggling dark mode applies Tailwind `dark:` classes to the `<html>` root without a page reload
**And** OpenDyslexic font loads on-demand only when the toggle is activated — not bundled by default
**And** text size presets (Standard 16px / Large 18px / Largest 20px) and line height toggle persist to localStorage
**And** both toggles use `role="switch"` with `aria-checked` (NFR11)
**And** all dark mode color pairings meet WCAG 2.1 AA contrast (≥4.5:1) — re-verified for dark variants

---

## Epic 7: Operator Can Observe, Maintain, and Measure the System

The operator can trace any error to its source (API vs. application logic), view structured logs from the platform log stream, and review anonymous usage analytics by district — without a custom admin UI.

### Story 7.1: Structured MCP Tool Request/Response Logging

As an **operator**,
I want every MCP tool request and response logged as a structured pino entry,
So that I can trace any production error to its source from the Railway log stream without additional tooling.

**Acceptance Criteria:**

**Given** the MCP server is running
**When** `lookup_legislator` or `search_bills` is invoked
**Then** pino logs: timestamp, level, `source: 'mcp-tool'`, tool name, request summary (address as `'[REDACTED]'`), response summary (result count or error type)
**And** the operator accesses logs via the Railway platform log stream — no custom admin UI required (FR34)
**And** address values are always logged as `'[REDACTED]'` — never in plain text (NFR7)
**And** log entries for external API calls include `source: 'gis-api'` or `source: 'legislature-api'` as appropriate

---

### Story 7.2: Error Source Categorization

As an **operator**,
I want error log entries to clearly identify whether a failure came from an external API or application logic,
So that I can diagnose production issues quickly from the log stream alone.

**Acceptance Criteria:**

**Given** any error occurs during a tool invocation
**When** the error is logged
**Then** the log entry includes `source` from the `AppError` source enum: `'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app'` (FR35)
**And** external API failures are tagged `source: 'gis-api'` or `source: 'legislature-api'`
**And** application logic failures are tagged `source: 'app'` or `source: 'cache'`
**And** no PII (address, personal story content) appears in any error log entry (NFR7)
**And** errors that resolve via retry are logged at `debug` level; errors surfaced to the user are logged at `error` level

---

### Story 7.3: Anonymous Analytics Events Endpoint

As an **operator**,
I want anonymous usage events recorded to SQLite so I can measure session starts, drafts generated, and messages delivered by district,
So that I can track return usage and geographic distribution without storing any PII.

**Acceptance Criteria:**

**Given** the `/api/events` Hono route is live
**When** a POST request arrives with `{ event_type: 'session_initiated' | 'draft_generated' | 'message_delivered', district_id?: string }`
**Then** the event is written to the `events` table with a timestamp (FR39)
**And** no PII is stored in any event payload (NFR7)
**And** district-level counts are queryable directly from the SQLite file: `SELECT COUNT(*) FROM events GROUP BY district`
**And** the endpoint returns 204 on success and 400 on invalid event_type
**And** rate limiting inherited from Epic 1 applies to this endpoint

---

### Story 7.4: Cache Configuration Update Without Downtime

As an **operator**,
I want to update the cache refresh schedule and data-provider configuration while the service stays available,
So that I can adjust to rate limit changes or switch providers without taking the service offline.

**Acceptance Criteria:**

**Given** the MCP server is running and serving requests
**When** environment variables controlling the cache schedule or data provider are updated and the server restarts
**Then** the service experiences no more than 30 seconds of request failure during the restart (FR38)
**And** the node-cron scheduler initializes with the new schedule on startup
**And** stale cache data continues to be served during the restart window (NFR17)
**And** all cache refresh configuration is controlled via env vars — no code changes required to adjust schedules

---

### Story 7.5: Load Testing and Scalability Verification

As an **operator**,
I want the system verified to handle 100 concurrent sessions without performance degradation,
So that a PAC newsletter shout-out doesn't take down the service.

**Acceptance Criteria:**

**Given** the MCP server is deployed to the production environment
**When** a load test runs at 100 concurrent simulated users
**Then** there is no increase in error rate vs. the 10-user baseline (NFR9)
**And** median GIS lookup response time stays within 3 seconds (NFR2, NFR9)
**And** median bill lookup response time stays within 1 second (NFR3, NFR9)
**And** upstream Utah Legislature API call volume at 100 concurrent users is no more than 1.5× the volume at 10 concurrent users — cache is absorbing load (NFR10)
**And** load test results and pass/fail thresholds are documented in the repository

---

## Epic 8: Developer Can Contribute in Under 30 Minutes

A civic tech developer finds the public repo, reads complete documentation, spins up the stack locally with a successful tool invocation, and has a clear path to submit issues and PRs — all without any help from the original author.

### Story 8.1: Complete MCP Tool Documentation

As a **developer**,
I want thorough MCP tool documentation in the public repository,
So that I can understand what the tools do, how to invoke them, and how to adapt them for another state — without asking the original author anything.

**Acceptance Criteria:**

**Given** the public repository
**When** a developer reads the `docs/` directory
**Then** MCP tool reference docs exist for both `lookup_legislator` and `search_bills`, each including: input schema, output schema with field descriptions, example invocation, and error codes
**And** an architecture overview links to `architecture.md` and explains the data flow from chatbot to MCP tool to GIS/Legislature APIs
**And** `LegislatureDataProvider` interface documentation explains how to implement a new provider for another state
**And** all examples are runnable against the local dev stack using only the repository's test fixtures (FR33)

---

### Story 8.2: Local Development Setup Verification

As a **developer**,
I want to clone the repo, follow the README, and achieve a successful end-to-end MCP tool invocation in under 30 minutes,
So that I can start contributing without needing any help from the original author.

**Acceptance Criteria:**

**Given** a fresh clone of the repository with no prior knowledge of the codebase
**When** the developer follows only the `README.md`
**Then** `pnpm install` succeeds with clear output
**And** all required environment variables are described in `.env.example` with enough context to obtain them independently (UGRC API key, Utah Legislature developer token)
**And** `pnpm --filter mcp-server dev` starts the server without errors
**And** `lookup_legislator` returns a valid response for a documented sample Utah address
**And** the total time from clone to first successful tool invocation is achievable in under 30 minutes (FR33, NFR18)
**And** the README documents what a successful invocation looks like so the developer knows they've succeeded

---

### Story 8.3: Public Repository, Issue Tracker, and Contributing Guide

As a **developer**,
I want a public issue tracker and contributing guide so I can submit bugs, request features, and understand the contribution process,
So that there is a clear, organized path for civic tech developers to get involved.

**Acceptance Criteria:**

**Given** the GitHub repository is public (FR40)
**When** a developer visits the repository
**Then** issue templates exist for: bug report, feature request, and question
**And** `CONTRIBUTING.md` documents: how to run tests, commit message format, PR process, and code style expectations
**And** the issue tracker is enabled with labels: `bug`, `enhancement`, `documentation`, `good-first-issue`
**And** a `LICENSE` file is present establishing the open-source license
**And** the repository's `README.md` includes a "Contributing" section linking to `CONTRIBUTING.md`

---

## Epic List

### Epic 1: Project Foundation & Infrastructure
Developers can clone the repo, run both services locally, and deploy to production — a working, observable foundation that makes every subsequent epic buildable.
**FRs covered:** FR40 (issue tracker); provides pino logging infrastructure that enables FR34 (implemented in Epic 7, Story 7.1)
**NFRs:** NFR5, NFR6, NFR8, NFR16

### Epic 2: Constituent Can Identify Their Utah Legislators
A constituent enters their home address and sees their House and Senate legislators with name, chamber, district, and contact info — including phone type labels. The lookup_legislator MCP tool is invokable from Claude.ai and ChatGPT.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR25, FR37
**NFRs:** NFR2, NFR6, NFR7, NFR13, NFR14, NFR15

### Epic 3: Constituent Can Explore Their Legislator's Legislative Record
A constituent can find bills their legislator sponsored or voted on, searchable by issue theme, served from a cache that stays fresh and resilient during API outages. The search_bills MCP tool is invokable from chatbot platforms.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR26, FR36
**NFRs:** NFR3, NFR10, NFR13, NFR14, NFR17

### Epic 4: Constituent Can Get a Voiced, Cited Draft
A constituent describes their concern in their own words, the chatbot guides them to a specific bill, and they receive a draft in their voice grounded in their legislator's actual record — with citations — that they can revise. The system prompt drives the full 4-step BYOLLM flow.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR27
**NFRs:** NFR4

### Epic 5: Constituent Can Send Their Message in One Action
A constituent delivers their draft to their legislator via mailto: (opens Gmail pre-filled) or clipboard copy (one tap for text/SMS), with the legislator's contact info visible alongside.
**FRs covered:** FR22, FR23, FR24
**NFRs:** NFR4, NFR12

### Epic 6: Anyone Can Discover and Set Up the Tool
A visitor finds the tool via search, reads a plain-language explanation, follows step-by-step setup instructions for their chatbot platform, and accesses the privacy policy. The landing page is SEO-optimized and mobile-first.
**FRs covered:** FR29, FR30, FR31, FR32
**NFRs:** NFR1, NFR11, NFR12

### Epic 7: Operator Can Observe, Maintain, and Measure the System
The operator can trace any error to its source (API vs. application logic), view structured logs from the platform log stream, update cache config without downtime, and review anonymous usage analytics (session starts, drafts generated, messages delivered by district).
**FRs covered:** FR34, FR35, FR38, FR39
**NFRs:** NFR7, NFR9, NFR10

### Epic 8: Developer Can Contribute in Under 30 Minutes
A civic tech developer finds the public repo, reads complete documentation, spins up the stack locally with a successful tool invocation, and has a clear path to submit issues and PRs — all without any help from the original author.
**FRs covered:** FR28, FR33, FR40
**NFRs:** NFR18
