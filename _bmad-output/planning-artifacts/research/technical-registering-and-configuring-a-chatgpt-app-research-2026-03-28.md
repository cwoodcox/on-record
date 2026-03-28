---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'registering and configuring a chatgpt app'
research_goals: 'understand the process and requirements for registering and configuring a ChatGPT app (custom GPT or ChatGPT plugin) for the On Record project'
user_name: 'Corey'
date: '2026-03-28'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-28
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

## Technical Research Scope Confirmation

**Research Topic:** registering and configuring a chatgpt app
**Research Goals:** understand the process and requirements for registering and configuring a ChatGPT app (custom GPT or ChatGPT plugin) for the On Record project

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture for ChatGPT app registration
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-28

---

## Technology Stack Analysis

### Programming Languages

ChatGPT app integration is effectively language-agnostic for the GPT Actions path, and TypeScript/Python-centric for the MCP/Apps SDK path.

_Popular Languages:_ TypeScript/Node.js (official `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`) and Python (`mcp` pip package, FastMCP, FastAPI) have official OpenAI SDK support. Any language that can serve HTTP with a valid OpenAPI spec works for GPT Actions.
_Emerging Languages:_ Go and Rust are community-supported via third-party MCP implementations.
_Language Evolution:_ The shift from plugin manifests (any language) to MCP servers is pushing the ecosystem toward TypeScript/Python for first-class support.
_Performance Characteristics:_ Language choice has no bearing on ChatGPT interaction latency; network RTT to the backend is the bottleneck.
_Source:_ https://developers.openai.com/apps-sdk/build/mcp-server | https://platform.openai.com/docs/actions/getting-started

### Development Frameworks and Libraries

_Major Frameworks:_ `@modelcontextprotocol/sdk` (TypeScript) and `mcp` (Python) are the official MCP server implementations. Hono, Express, and FastAPI serve as HTTP transport layers.
_Micro-frameworks:_ FastMCP (Python) provides rapid MCP server bootstrapping. LangChain and LlamaIndex are compatible orchestration frameworks.
_Evolution Trends:_ The MCP standard (originally from Anthropic) was adopted by OpenAI in December 2025 as the foundation for its Apps SDK, making it the de facto inter-agent protocol.
_Ecosystem Maturity:_ MCP ecosystem is early (beta). GPT Actions (OpenAPI-based) is mature with extensive Cookbook examples. The `on-record` project already uses `@modelcontextprotocol/sdk 1.26.0` — directly compatible.
_Source:_ https://openai.com/index/introducing-apps-in-chatgpt/ | https://developers.openai.com/apps-sdk

### Database and Storage Technologies

Not directly applicable to ChatGPT app registration itself. For the On Record use case:

_Relational Databases:_ The existing SQLite + better-sqlite3 cache layer survives unchanged regardless of which ChatGPT integration path is chosen.
_In-Memory/Caching:_ Semantic caching of repeated constituent queries is recommended for scalability — reduces OpenAI API calls and avoids rate limits.
_Data Warehousing:_ N/A for this scope.
_Source:_ https://platform.openai.com/docs/actions/production

### Development Tools and Platforms

_IDE and Editors:_ Standard. No ChatGPT-specific tooling required.
_Build Systems:_ GPT Builder web UI at `chatgpt.com/create` — no local build needed for Custom GPTs. Apps SDK uses standard `pnpm`/`npm` toolchains.
_Testing Frameworks:_ ChatGPT Developer Mode (beta) for end-to-end MCP testing. MCP Inspector for OAuth flow debugging. Standard Vitest/Playwright for backend unit/integration tests.
_Key Platform Accounts:_ (1) Paid ChatGPT subscription (Plus/Team/Enterprise) for GPT Builder access. (2) OpenAI Platform account (`platform.openai.com`) with identity verification for App Directory submissions.
_Source:_ https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta

### Cloud Infrastructure and Deployment

_Hosting Requirements:_ HTTPS-only (TLS 1.2+, valid public certificate, port 443). The MCP server or API backend must be publicly reachable.
_Container Technologies:_ Docker/Kubernetes work fine; no special requirements from OpenAI.
_Serverless Platforms:_ Azure Functions (TypeScript/C#) are featured in OpenAI Cookbook examples for GPT Actions. Cloudflare Workers are community-validated for MCP transports.
_CDN and Edge Computing:_ Content Security Policy (CSP) configuration is required on MCP server domains.
_IP Allowlisting:_ ChatGPT egress IPs are published in `chatgpt-actions.json`; allowlisting these is the most reliable way to verify requests originate from ChatGPT.
_Source:_ https://platform.openai.com/docs/actions/production | https://developers.openai.com/apps-sdk/build/auth

### Technology Adoption Trends

_Migration Patterns:_ Plugin system shut down April 9, 2024 → GPT Actions (2024–present) → Apps SDK/MCP (December 2025–present). The ecosystem is mid-migration from GPT Actions to MCP-based Apps SDK.
_Emerging Technologies:_ OAuth 2.1 with PKCE (replacing OAuth 2.0 in the MCP path). Dynamic Client Registration (DCR) — required now, being replaced by Client Metadata Documents (CMID) for stable identity. Agentic Commerce Protocol (in-ChatGPT checkout) announced but not yet live.
_Legacy Technology:_ ChatGPT Plugin manifest format — dead as of April 2024. OpenAPI 2.x schemas — upgrade to 3.1.0 required.
_Community Trends:_ MCP as an open standard (Anthropic-originated, now multi-vendor) is gaining broad adoption across Claude, ChatGPT, and third-party AI agents. Adobe, GitHub, Replit, Gmail, Stripe are already live in the App Directory.
_Source:_ https://openai.com/index/developers-can-now-submit-apps-to-chatgpt/ | https://developers.openai.com/blog/openai-for-developers-2025/

## Integration Patterns Analysis

### API Design Patterns

ChatGPT's integration layer is built entirely on **function calling** — every Action is a REST endpoint described via OpenAPI, which ChatGPT uses to decide which call to make and how to construct the JSON payload.

_RESTful APIs:_ All GPT Actions are REST-based. ChatGPT reads the OpenAPI 3.1.0 schema and generates typed JSON payloads matching your parameter schemas. Each operation needs a unique `operationId` and a `summary` (≤300 chars) — the summary is used by the model to decide relevance. Return **raw data**, not natural language; ChatGPT narrates results itself.
_Special Extension Field:_ `x-openai-isConsequential` per operation: `false` = read-only, skips confirmation; `true` = side-effecting, always prompts. Absent defaults: GET = `false`, all other methods = `true`.
_Character Limits (enforced):_ `summary`/`description` per endpoint: 300 chars max. Parameter `description`: 700 chars max.
_Webhook Patterns:_ Not natively supported in GPT Actions — ChatGPT is always the caller, never the callee. Async patterns must be polled.
_Source:_ https://platform.openai.com/docs/actions/getting-started | https://developers.openai.com/api/docs/actions/authentication

### Communication Protocols

_HTTP/HTTPS:_ All Action calls are standard HTTPS (TLS 1.2+, port 443, valid public certificate). ChatGPT makes outbound HTTP requests to your server; your server never initiates contact with ChatGPT.
_MCP Transports:_ MCP servers support two transports: **Streamable HTTP** (recommended — single endpoint handles bidirectional messages) and **Server-Sent Events (SSE)** (legacy, unidirectional streaming). Streamable HTTP is the current standard.
_JSON-RPC over postMessage (Apps SDK UI):_ For apps with an embedded UI widget, the iframe communicates with the MCP server via **JSON-RPC 2.0 messages over `window.postMessage`**. ChatGPT acts as the broker between the UI iframe and the backend MCP server.
_IP Egress:_ ChatGPT's egress IPs are published in `chatgpt-actions.json`. These can be allowlisted server-side to verify requests genuinely originate from ChatGPT.
_Source:_ https://platform.openai.com/docs/actions/production | https://developers.openai.com/apps-sdk/build/mcp-server

### Data Formats and Standards

_JSON / OpenAPI Schemas:_ All request and response bodies are JSON. Schemas must be OpenAPI 3.1.0 — OpenAPI 2.x (Swagger) is not accepted. JSON Schema draft 2020-12 is supported within OpenAPI 3.1.0.
_MCP Tool Definitions:_ MCP tools are defined with a `name`, `description`, `inputSchema` (JSON Schema), and hint annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`). These annotations are enforced at App Directory review — incorrect labeling causes rejection.
_MCP Resources and Prompts:_ Two additional MCP primitives beyond tools: **Resources** (expose read-only data as URI-addressable content) and **Prompts** (reusable prompt templates). Tools are the primary integration primitive for On Record's use case.
_Response Formatting:_ Actions should return structured data (arrays, objects) rather than pre-formatted strings. ChatGPT's model handles all natural language rendering of results.
_Source:_ https://platform.openai.com/docs/actions/getting-started | https://developers.openai.com/apps-sdk/build/mcp-server

### System Interoperability Approaches

_Cross-Platform MCP:_ Because MCP is an open standard (Anthropic-originated, now multi-vendor), an MCP server built for ChatGPT is also compatible with Claude and other MCP-aware agents with no protocol changes. This is a significant architectural advantage for On Record — the existing `@modelcontextprotocol/sdk 1.26.0` server already speaks the right protocol.
_GPT Actions vs. Apps SDK:_ These two mechanisms are mutually exclusive within a single GPT configuration — enabling Apps SDK disables the Actions tab. GPTs using Apps SDK cannot be published to the public GPT Store (only company/enterprise stores).
_Point-to-Point:_ GPT Actions are direct point-to-point: ChatGPT → your API. No middleware or message broker. For the Apps SDK path, the MCP server is the integration point.
_API Gateway:_ Can be placed in front of your Action endpoint for rate limiting, logging, and auth enforcement. ChatGPT respects 429 responses and backs off.
_Source:_ https://openai.com/index/introducing-apps-in-chatgpt/ | https://platform.openai.com/docs/actions/production

### Apps SDK UI Layer

The **Apps SDK UI** (`@openai/apps-sdk-ui`) is a dedicated design system for building embedded UI widgets within ChatGPT apps.

_Architecture:_ UI is rendered inside an **iframe** within the ChatGPT interface. The iframe communicates with the MCP backend via JSON-RPC over `postMessage`. ChatGPT brokers the communication.
_Technology Stack:_ React 18 or 19 (required), Tailwind 4 (pre-configured with Apps SDK UI design tokens), `@openai/apps-sdk-ui` package.
_Design Tokens:_ Provides CSS variable-based tokens for colors, typography, spacing, sizing, shadows, and surfaces (e.g., `border-default`, `bg-surface`, `text-secondary`, `heading-lg`, `border-subtle`). Dark mode and responsiveness utilities included.
_Component Library:_ Built on **Radix UI** primitives for accessibility. Includes `Badge`, `Button`, `Icon`, `TextLink`, `ButtonLink`, `Avatar`, and more composable components.
_Router Integration:_ Optional `<AppsSDKUIProvider linkComponent={Link}>` wrapper for framework router integration (Next.js `Link`, etc.); individual components also accept an `as` prop.
_Installation:_
```bash
npm install @openai/apps-sdk-ui
```
```css
@import "tailwindcss";
@import "@openai/apps-sdk-ui/css";
@source "../node_modules/@openai/apps-sdk-ui";
```
_On Record Fit:_ The project uses React (Next.js 16.1.6) + Tailwind v4 already — direct compatibility. The `@openai/apps-sdk-ui` package slots in alongside the existing stack with no conflicts.
_Source:_ https://openai.github.io/apps-sdk-ui/ | https://github.com/openai/apps-sdk-ui | https://developers.openai.com/apps-sdk

### Integration Security Patterns

_No Authentication:_ Default for GPT Actions. Appropriate for public, read-only APIs. No configuration required.
_API Key (Static):_ Single key injected into every request via a configurable header (e.g., `Authorization: Bearer <key>` or `X-API-Key: <key>`). Key stored encrypted server-side by OpenAI. All users of the GPT share the same credential — no per-user identity. Suitable for On Record's public legislative data endpoints.
_OAuth 2.0 (Per-User Identity):_ Full OAuth 2.0 authorization code flow. ChatGPT shows "Sign in to [domain]" button on first use. Callback URL format: `https://chatgpt.com/aip/{g-GPT-ID}/oauth/callback`. Token exchange is `grant_type=authorization_code` via POST. Refresh tokens handled automatically. `state` parameter is required (CSRF). Domain restrictions apply — OAuth domains must match the primary API domain (exceptions: Google, Microsoft, Adobe). Only one auth type (API key OR OAuth) per action set.
_OAuth 2.1 / PKCE (MCP Apps SDK path):_ Required for MCP-based apps in the App Directory. Must support `S256` code challenge method (`code_challenge_methods_supported` in discovery metadata — absence causes ChatGPT to refuse the flow). Dynamic Client Registration (DCR) currently required; being replaced by Client Metadata Documents (CMID).
_Request Verification:_ The only reliable way to verify requests originate from ChatGPT is IP allowlisting against the published `chatgpt-actions.json` CIDR blocks. No request signing is provided.
_CSP Requirement:_ MCP server domains must have a Content Security Policy configured for all domains the app fetches from.
_Source:_ https://developers.openai.com/api/docs/actions/authentication | https://developers.openai.com/apps-sdk/build/auth | https://stytch.com/blog/guide-to-authentication-for-the-openai-apps-sdk/

### Event-Driven Integration

_Synchronous Only (GPT Actions):_ GPT Actions are strictly request-response — ChatGPT calls your API and waits for the response within the conversation turn. No async callbacks, no webhooks inbound to ChatGPT, no pub/sub.
_Polling Pattern:_ For long-running operations, the recommended pattern is: Action 1 kicks off the job and returns a job ID → Action 2 polls for status using that ID. The user asks ChatGPT to check status, which triggers the poll.
_MCP Streaming:_ MCP's Streamable HTTP transport supports streaming responses (server-sent partial results). This is useful for progress updates in long-running tool calls.
_No Native Event Bus:_ There is no event broker (Kafka, RabbitMQ, etc.) in the ChatGPT integration model. All event-like patterns must be implemented via polling or streaming within the MCP transport.
_Source:_ https://platform.openai.com/docs/actions/production | https://developers.openai.com/apps-sdk/build/mcp-server

## Architectural Patterns and Design

### System Architecture Patterns

Three distinct architectural tiers exist, each with a different integration depth and complexity trade-off:

**Tier 1 — Custom GPT + GPT Actions (Shallow integration)**
- Architecture: OpenAPI schema describes your existing REST API → ChatGPT calls it via HTTPS → ChatGPT narrates the response to the user.
- No new server required. If On Record's MCP server already exposes HTTP endpoints (Hono), an OpenAPI 3.1.0 schema describing those endpoints is sufficient.
- This is a **schema-first** pattern: the OpenAPI spec is the integration contract. ChatGPT reads it and generates all API calls autonomously.
- Trade-off: No per-user identity (shared API key), no embedded UI, cannot be listed in the App Directory.
- _Source:_ https://platform.openai.com/docs/actions/getting-started

**Tier 2 — Apps SDK / MCP Server App (Deep integration)**
- Architecture: MCP server (tools/resources/prompts) + optional React UI widget (iframe, JSON-RPC postMessage) + ChatGPT as the orchestrator.
- The MCP server is the single integration boundary. ChatGPT invokes named tools; the server executes them and returns structured data.
- UI layer (`@openai/apps-sdk-ui`) renders inside ChatGPT as an iframe. Backend and UI communicate via JSON-RPC 2.0 over `window.postMessage`.
- Trade-off: Requires App Directory submission + identity verification + review process. Cannot be in public GPT Store.
- _Source:_ https://developers.openai.com/apps-sdk | https://openai.github.io/apps-sdk-ui/

**On Record's existing architecture fits Tier 2 natively**: `apps/mcp-server` (Hono + `@modelcontextprotocol/sdk 1.26.0`) is already an MCP server. The ChatGPT integration path is an extension of what already exists, not a new system.

### Design Principles and Best Practices

_Schema-first design:_ OpenAPI 3.1.0 schema is the contract between ChatGPT and your API. Design the schema independently from the implementation; keep descriptions intent-focused (not instruction-focused to the LLM).
_Separation of concerns:_ The MCP server's job is to return **raw structured data** — never pre-formatted natural language. ChatGPT's model handles all narration, summarization, and formatting for the user. Violating this (returning narrative text from the API) degrades response quality.
_Tool annotation accuracy:_ `readOnlyHint`, `destructiveHint`, and `openWorldHint` on MCP tools are not optional cosmetics — they control ChatGPT's confirmation behavior and are enforced at App Directory review. Model the hints on actual side-effect semantics.
_Minimal surface area:_ Only expose endpoints/tools that the ChatGPT use case actually needs. Enumerating every endpoint increases schema token cost and confuses the model's tool selection.
_Description quality matters:_ The model uses operation `summary` and `description` to decide which tool to invoke. Descriptions should reflect **intent** derived from constituent concerns, not enumerate valid values or implementation details (per CLAUDE.md guidance).
_Source:_ https://platform.openai.com/docs/actions/getting-started | https://developers.openai.com/apps-sdk/build/mcp-server

### Scalability and Performance Patterns

_Rate limit tiers:_ OpenAI uses a spend-based tier system. Tier 1 (entry): 500 RPM / 500K TPM. Tier 4+: 15K RPM / 40M TPM. For Action backends, the binding constraint is your server's capacity, not OpenAI's limits.
_Exponential backoff:_ Required on 429 responses — immediate retry is forbidden per OpenAI guidance. OpenAI reports 73% of API call failures come from naive retry implementations.
_Semantic caching:_ For On Record's use case (constituent queries about legislators and bills), many queries will be semantically similar. Caching responses at the MCP server layer avoids redundant OpenAI API calls and reduces latency. The existing `better-sqlite3` cache layer in `apps/mcp-server/src/cache/` is architecturally positioned for this.
_Batch API:_ For non-real-time workloads (e.g., pre-computing bill summaries), the OpenAI Batch API offers 40% cost reduction and doubled throughput. Not applicable to conversational ChatGPT actions.
_Token budget discipline:_ GPT-5 supports 100K+ token contexts but at linear cost. MCP tool responses should be concise and structured — avoid returning full bill text when a summary suffices.
_Source:_ https://platform.openai.com/docs/actions/production | https://intuitionlabs.ai/articles/chatgpt-api-pricing-2026-token-costs-limits

### Integration and Communication Patterns

_Single integration boundary:_ The MCP server is the sole boundary between ChatGPT and On Record's internal systems (legislature data, UGRC geocoding, district lookups). ChatGPT never touches the SQLite cache or UGRC API directly — all routing is through MCP tools. This is consistent with On Record's existing architectural boundary (Boundary 4: `better-sqlite3` confined to `src/cache/`).
_Tool-per-concern:_ Each MCP tool should do one thing: `search_bills`, `get_legislator`, `find_district`. Do not bundle concerns into a single multi-purpose tool — the model's tool selection degrades with ambiguous, overloaded tools.
_Action → MCP migration path:_ If starting with GPT Actions (quicker to ship), the OpenAPI schema endpoints map 1:1 to MCP tools. Migration is additive: add MCP tool definitions alongside existing Action endpoints, then flip the GPT configuration.
_Source:_ https://platform.openai.com/docs/actions/introduction | https://developers.openai.com/apps-sdk/build/mcp-server

### Security Architecture Patterns

_Defense in depth for ChatGPT origin verification:_ There is no cryptographic request signing from ChatGPT. The recommended architecture is: (1) IP allowlist using `chatgpt-actions.json` CIDR blocks as the outer layer; (2) API key or OAuth token as the auth layer; (3) input validation and rate limiting as the inner layer.
_API key architecture:_ A static API key is shared across all ChatGPT users of the GPT — it identifies the GPT, not the individual user. For On Record's public legislative data (no PII), this is the correct auth model. Store the key in the Action configuration (encrypted by OpenAI) and as an environment variable in the MCP server.
_OAuth for per-user identity:_ Required only if the use case needs to distinguish individual constituents (e.g., saving preferences). On Record v1 does not require this.
_CSP on MCP server domain:_ Required for Apps SDK submissions. Must enumerate all external domains the app fetches from (UGRC GIS API, Utah Legislature API).
_No PII in tool responses:_ Per On Record's existing logger policy (`addresses always '[REDACTED]'`), address data must be redacted before inclusion in any MCP tool response returned to ChatGPT. The LLM may log or replay content.
_Source:_ https://developers.openai.com/api/docs/actions/authentication | https://developers.openai.com/apps-sdk/build/auth

### Data Architecture Patterns

_Existing cache layer is unchanged:_ The SQLite-backed bill/legislator cache in `apps/mcp-server/src/cache/` is the data source for all ChatGPT tools. No new storage layer is required. The `LegislatureDataProvider` abstraction boundary remains the correct mock point for tests.
_Tool response shaping:_ MCP tools should return data shaped for the model's reasoning, not for direct display. Flat JSON objects with explicit field names outperform deeply nested structures. Avoid returning arrays longer than ~20 items — the model cannot reason well over very long lists.
_FTS5 for bill search:_ The existing FTS5 full-text search (JOIN pattern with BM25 ranking per CLAUDE.md) maps directly to a `search_bills` MCP tool. The empty MATCH guard is critical to preserve.
_Source:_ https://platform.openai.com/docs/actions/getting-started

### Deployment and Operations Architecture

_Hosting requirements:_ HTTPS-only (TLS 1.2+, valid public certificate, port 443). The MCP server must be reachable from ChatGPT's published egress IPs. No localhost or private network endpoints.
_Deployment targets validated by community:_ Azure Functions (TypeScript), Cloudflare Workers, Vercel serverless functions. Standard containerized deployments (Docker + any cloud provider) work equally well.
_Observability:_ Pino logger with `source` field on every entry is already present in On Record's MCP server — sufficient for Action debugging. For the App Directory path, add structured logging of tool invocations (without user content) for review compliance.
_One version at a time:_ App Directory enforces one live version and one in-review version. Blue/green deployments must complete before submitting a new version.
_Source:_ https://platform.openai.com/docs/actions/production | https://developers.openai.com/apps-sdk/deploy/submission

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

Two viable adoption paths for On Record, ordered by effort:

**Path A — GPT Actions (incremental, low friction)**
- Expose On Record's existing MCP server endpoints via an OpenAPI 3.1.0 schema.
- Register a Custom GPT at `chatgpt.com/create`, paste the schema, configure API key auth.
- No new server infrastructure. No App Directory submission. No identity verification.
- Time to working prototype: hours. Time to shareable link: one day.
- Limitation: no embedded UI, no per-user identity, cannot appear in App Directory.
- _Migration path:_ the schema endpoints map 1:1 to MCP tools when upgrading to Path B.
- _Source:_ https://platform.openai.com/docs/actions/getting-started

**Path B — Apps SDK / MCP App (full integration)**
- Extend `apps/mcp-server` to expose MCP tools over Streamable HTTP.
- Optionally add a React UI widget using `@openai/apps-sdk-ui` (React 19 + Tailwind 4 — already in On Record's stack).
- Submit to App Directory: requires OpenAI Platform account, identity verification, review process (beta, variable timeline).
- Time to submission-ready: estimated 1–2 sprints. Review timeline: indeterminate.
- _Source:_ https://developers.openai.com/apps-sdk/deploy/submission

**Recommended strategy:** Implement Path A first (quick win, validates UX assumptions), then evolve to Path B once the App Directory review process matures.

### Development Workflows and Tooling

_Local development:_ GPT Builder runs in browser — no local tooling for the ChatGPT UI. The MCP server can be tested locally using the **MCP Inspector** (OAuth flow debugging) and **ChatGPT Developer Mode** (beta, end-to-end MCP tool testing with a tunnel like ngrok).
_Schema iteration:_ Edit the OpenAPI YAML locally → paste updated schema into GPT Builder → test in ChatGPT chat. No CI step needed for schema-only changes.
_MCP server changes:_ Standard On Record development workflow (pnpm, Vitest, TypeScript strict). The MCP server already has a test suite mocking at `LegislatureDataProvider` — new tools follow the same pattern.
_Apps SDK UI:_ Install `@openai/apps-sdk-ui`, import CSS in global stylesheet, use components in React. Storybook available at `https://openai.github.io/apps-sdk-ui/` for component reference.
_Source:_ https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta | https://openai.github.io/apps-sdk-ui/

### Testing and Quality Assurance

_Unit tests:_ Mock at `LegislatureDataProvider` boundary (existing pattern). No SQLite touch in tests. New MCP tools follow the same mock convention.
_Integration tests:_ Use ChatGPT Developer Mode to connect the local MCP server (via tunnel) and exercise tools in real ChatGPT conversations. Manual verification of tool selection, parameter extraction, and response formatting.
_Schema validation:_ Validate OpenAPI schema with a linter (e.g., `@redocly/cli`) before pasting into GPT Builder. ChatGPT surfaces schema parse errors but with poor diagnostics — catch them early.
_Test prompts:_ App Directory submission requires 3–5 test prompts with expected responses. These should be written alongside tool implementation to validate model tool selection.
_Error path coverage:_ Follow On Record's convention — test key phrases in `nature`/`action` fields of error responses using `toContain()`, not exact string match.
_Source:_ https://developers.openai.com/apps-sdk/app-submission-guidelines

### Deployment and Operations Practices

_Infrastructure:_ Existing On Record MCP server hosting (any HTTPS-capable platform) is sufficient for GPT Actions. The server must be publicly reachable; no internal/VPN endpoints.
_Environment variables:_ Store the GPT Action API key as an environment variable alongside existing secrets. Never hardcode.
_Logging:_ Existing Pino logger with `source` field is sufficient. For App Directory compliance, avoid logging user message content or conversation context — log only tool invocations and structured outcomes.
_Versioning:_ App Directory enforces one live + one in-review version at a time. Use semantic versioning for the MCP server; coordinate deploys with App Directory submissions.
_Monitoring:_ Track tool invocation counts and error rates. Rate limit (429) frequency is a key health signal — high 429 rates indicate caching is insufficient.
_Source:_ https://platform.openai.com/docs/actions/production | https://developers.openai.com/apps-sdk/deploy/submission

### Team Organization and Skills

_No new skill requirements for Path A:_ Any On Record contributor who can write TypeScript and understands OpenAPI schemas can implement GPT Actions. YAML/JSON schema authoring is the primary new skill.
_Path B additions:_ Familiarity with MCP server concepts (tools/resources/prompts), OAuth 2.1/PKCE flow debugging (MCP Inspector), and React component development with `@openai/apps-sdk-ui` if building a UI widget.
_Account requirements:_ One paid ChatGPT subscription (Plus/Pro/Team) for the GPT Builder. One OpenAI Platform account with identity verification for App Directory submission.
_Source:_ https://developers.openai.com/apps-sdk | https://help.openai.com/en/articles/8554397-creating-a-gpt

### Cost Optimization and Resource Management

_GPT Builder is included_ in paid ChatGPT subscriptions — no additional cost to create and share GPTs.
_OpenAI API costs:_ GPT Actions call your server; your server does not call the OpenAI API. There is no per-call cost to you for ChatGPT invoking your Action. Costs arise only if On Record's backend makes its own OpenAI API calls (not the current architecture).
_Caching:_ Semantic response caching at the MCP server layer is the highest-leverage cost optimization. The existing SQLite cache already caches Utah Legislature API responses — extend it to cache common tool response shapes.
_Token efficiency:_ Keep MCP tool responses concise and structured. Every extra token in a tool response is paid by the user's ChatGPT subscription — optimize for their experience, not just your server cost.
_Source:_ https://platform.openai.com/docs/actions/production

### Risk Assessment and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| App Directory review delay (beta process) | Medium | Ship Path A first; App Directory is additive |
| ChatGPT model selects wrong tool | Medium | Improve `summary`/`description` quality; add test prompts |
| Rate limits hit during high traffic | Low | Exponential backoff + semantic caching |
| OAuth DCR creates thousands of short-lived client IDs | Medium (Path B only) | Design IdP to handle DCR at scale; monitor client ID table growth |
| Privacy policy gap blocks public publishing | Low | Draft policy covering Action data handling before first public share |
| MCP tool annotation errors cause App Directory rejection | Low | Review `readOnlyHint`/`destructiveHint` against actual side effects before submission |
| ChatGPT platform changes break integration | Medium | OpenAPI schema + MCP are open standards — migration cost is low; monitor OpenAI changelog |

## Technical Research Recommendations

### Implementation Roadmap

1. **Sprint 0 (1–2 days):** Author OpenAPI 3.1.0 schema for existing On Record MCP tools. Register Custom GPT with API key auth. Share with internal testers.
2. **Sprint 1:** Validate tool selection quality with real constituent queries. Refine descriptions. Add missing tools (e.g., `find_district_by_address` if not yet exposed).
3. **Sprint 2 (if App Directory path desired):** Complete OpenAI Platform identity verification. Extend MCP server to Streamable HTTP transport. Prepare submission package (screenshots, test prompts, privacy policy).
4. **Optional:** Build `@openai/apps-sdk-ui` widget for rich district/legislator display inside ChatGPT.

### Technology Stack Recommendations

| Component | Recommendation | Rationale |
|---|---|---|
| OpenAPI schema | Hand-authored YAML, OpenAPI 3.1.0 | Full control; validates with Redocly |
| MCP transport | Streamable HTTP (Hono route) | Already using Hono; recommended by OpenAI |
| Authentication (v1) | API key (header) | No per-user identity needed for public data |
| Authentication (future) | OAuth 2.1 + PKCE | Required for App Directory; use existing IdP |
| UI (if needed) | `@openai/apps-sdk-ui` + React 19 + Tailwind 4 | Direct compatibility with existing `apps/web` stack |
| Testing | Vitest (unit) + ChatGPT Developer Mode (e2e) | Consistent with existing test conventions |

### Skill Development Requirements

- OpenAPI 3.1.0 schema authoring (primary new skill)
- MCP Inspector for OAuth debugging (Path B only)
- `@openai/apps-sdk-ui` component library (UI widget only)
- OpenAI Platform account management and App Directory submission process

### Success Metrics and KPIs

- Tool selection accuracy: model invokes correct tool for ≥90% of representative constituent queries
- Response latency: MCP tool round-trip <500ms (p95)
- Error rate: <1% of tool invocations return error responses
- Cache hit rate: ≥60% of repeated query patterns served from cache
- App Directory submission: zero rejections due to annotation errors or missing policy docs

<!-- Content will be appended sequentially through research workflow steps -->
