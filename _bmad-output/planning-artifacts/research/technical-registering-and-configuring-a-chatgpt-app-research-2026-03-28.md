---
stepsCompleted: [1, 2, 3]
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

<!-- Content will be appended sequentially through research workflow steps -->
