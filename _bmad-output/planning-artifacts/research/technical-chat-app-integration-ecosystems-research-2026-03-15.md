---
stepsCompleted: [1, 2, 3]
inputDocuments: []
workflowType: 'research'
lastStep: 2
research_type: 'technical'
research_topic: 'chat app integration ecosystems (ChatGPT GPT Store, Claude MCP, Gemini Extensions, Microsoft Copilot Plugins/Agents)'
research_goals: 'Understand the technical architecture, integration patterns, and developer ecosystem for the four major AI chat app extension/plugin platforms — ChatGPT GPT Store, Claude MCP, Gemini Extensions, and Microsoft Copilot — to inform decisions about how On Record might be distributed or integrated via these channels'
user_name: 'Corey'
date: '2026-03-15'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-15
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** chat app integration ecosystems (ChatGPT GPT Store, Claude MCP, Gemini Extensions, Microsoft Copilot Plugins/Agents)
**Research Goals:** Understand the technical architecture, integration patterns, and developer ecosystem for the four major AI chat app extension/plugin platforms — ChatGPT GPT Store, Claude MCP, Gemini Extensions, and Microsoft Copilot — to inform decisions about how On Record might be distributed or integrated via these channels

**Technical Research Scope:**

- Architecture Analysis — GPT Actions vs MCP protocol vs Gemini Extensions vs Microsoft Copilot extensibility model
- Implementation Approaches — dev workflows, manifest formats, auth, submission processes per platform
- Technology Stack — underlying protocols, transport layers, SDKs, spec versions
- Integration Patterns — how to wire On Record's Hono/MCP server into each ecosystem
- Performance Considerations — rate limits, streaming, execution models

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-15

---

## Technology Stack Analysis

### Programming Languages and Specification Formats

Each platform converges on **TypeScript/JavaScript** and **Python** as the primary developer languages, with **OpenAPI/JSON Schema** as the near-universal tool description format.

_ChatGPT (GPT Actions / Responses API):_ Tool schemas are defined in **OpenAPI 3.x** (Swagger). The GPT Actions system accepts an uploaded schema file; the Responses API accepts inline JSON function schemas. OpenAI SDKs are available in Python and Node.js. Key constraint: endpoint descriptions capped at 300 characters, parameter descriptions at 700 characters.
_Source: [GPT Actions Introduction – OpenAI](https://platform.openai.com/docs/actions/introduction)_

_Claude MCP:_ Tools are declared using **JSON Schema** within the MCP wire protocol (JSON-RPC 2.0). The official SDK is [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — currently v1.26.0 as used in this project, with v1.12+ shipping as of February 2026. SDKs exist for TypeScript/Node.js, Python, Java, Kotlin, C#, and Swift. Over 97 million monthly SDK downloads as of early 2026.
_Source: [MCP Architecture Overview – modelcontextprotocol.io](https://modelcontextprotocol.io/docs/learn/architecture)_

_Gemini (API / Function Calling):_ Function declarations follow **JSON Schema** embedded in the `tools` array of a `generateContent` request. The Google GenAI SDK reached GA in May 2025 and is available for Python, TypeScript/JavaScript, Go, and Java. The legacy `@google/generative-ai` library was deprecated November 30, 2025; the replacement is `@google/genai`. **Important distinction:** Consumer-facing "Gemini Extensions" (Gmail, Drive, YouTube integrations in the Gemini app) are Google-managed and not open to third-party developers — all third-party integration goes through the function-calling API.
_Source: [Gemini API Libraries – Google AI for Developers](https://ai.google.dev/gemini-api/docs/libraries)_

_Microsoft Copilot (M365 Declarative Agents):_ Plugin actions are described via **OpenAPI 3.x** (API plugins) or **MCP server manifests** (plugin manifest schema 2.4, announced at Ignite 2025). The Microsoft 365 Agents Toolkit (VS Code extension) is the primary scaffolding tool; **Kiota** generates plugin packages from existing OpenAPI specs. TypeScript and .NET (C#) are the preferred languages for custom engine agents.
_Source: [Build plugins from an MCP server – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-mcp-plugins)_

### Transport and Wire Protocols

_ChatGPT:_ GPT Actions call developer-hosted REST endpoints over **HTTPS**. The Responses API additionally supports **remote MCP servers** as a native tool type, meaning On Record's MCP server endpoint is directly consumable without an OpenAPI wrapper.
_Source: [Responses API – OpenAI](https://developers.openai.com/api/docs/guides/migrate-to-responses/)_

_Claude MCP:_ Three transports are defined in the spec. **stdio** (subprocess, local only) is used for Claude Desktop/Claude Code. **SSE** (HTTP + Server-Sent Events) was the original remote transport. **Streamable HTTP** — a single HTTP endpoint with optional SSE streaming — is the modern standard as of the MCP 2025-03-26 spec and is the recommended transport for new remote servers in 2026.
_Source: [MCP 2026 Roadmap – blog.modelcontextprotocol.io](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)_

_Gemini:_ Standard **REST/HTTP** (`generateContent`) for single-turn; **Server-Sent Events** (`streamGenerateContent`) for streaming. The **Live API** uses **WebSockets** for real-time bidirectional communication. The new **Interactions API** (Beta) offers a unified stateful interface as an alternative to raw `generateContent`.
_Source: [Gemini API I/O Updates – Google Developers Blog](https://developers.googleblog.com/gemini-api-io-updates/)_

_Microsoft Copilot:_ API plugins call developer REST endpoints over **HTTPS** with an OpenAPI description. MCP-based plugins reach the server over **Streamable HTTP** (same MCP transport standard). Static tool discovery only — `enable_dynamic_discovery` must be `false` in the manifest.
_Source: [Declarative Agents Overview – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-declarative-agent)_

### Authentication Technologies

_ChatGPT GPT Actions:_ Supports **API key** (header or query param) and **OAuth 2.0** (authorization code flow). The `x-openai-isConsequential` OpenAPI extension controls whether ChatGPT prompts users for confirmation before calling a write operation.
_Source: [GPT Actions Production Notes – OpenAI](https://platform.openai.com/docs/actions/production)_

_Claude MCP (remote):_ **OAuth 2.1 with PKCE** is mandatory for remote servers as of the March 2025 spec revision. The November 2025 spec added Protected Resource Metadata (RFC 9728) at `/.well-known/oauth-protected-resource` and Client ID Metadata Documents (CIMD). Token audience restriction (RFC 8707) is the recommended pattern for multi-server deployments. Claude Desktop and Claude.ai walk users through the OAuth flow automatically when a remote server requires auth.
_Source: [MCP Authorization – modelcontextprotocol.io](https://modelcontextprotocol.io/specification/draft/basic/authorization); [Secure MCP with OAuth 2.1 – Scalekit](https://www.scalekit.com/blog/implement-oauth-for-mcp-servers)_

_Gemini API:_ API key (for prototyping) or **Google service account / OAuth 2.0** for production Vertex AI usage. Firebase AI Logic adds client-side security for mobile/web apps.
_Source: [Gemini API Libraries – Google AI for Developers](https://ai.google.dev/gemini-api/docs/libraries)_

_Microsoft Copilot Plugins:_ **OAuth 2.0 authorization code flow only** — API key authentication is explicitly not supported for MCP plugins. **Microsoft Entra ID SSO** is the preferred integration path, enabling seamless single sign-on with the user's M365 credentials.
_Source: [Configure Auth for plugins – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api-plugin-authentication)_

### Developer Tooling and SDKs

| Platform | Primary SDK | Scaffolding Tool | Schema Format |
|---|---|---|---|
| ChatGPT / OpenAI | `openai` (Node/Python) | OpenAI Playground, Responses API | OpenAPI 3.x or JSON function schema |
| Claude MCP | `@modelcontextprotocol/sdk` | MCP Inspector, Claude Desktop config | JSON-RPC 2.0 + JSON Schema |
| Gemini | `@google/genai` (GA May 2025) | Google AI Studio, Firebase AI Logic | JSON Schema function declarations |
| Microsoft Copilot | M365 Agents Toolkit (VS Code), Kiota | Partner Center / Copilot Developer Camp | OpenAPI 3.x or MCP manifest (schema 2.4) |

_Sources: [OpenAI for Developers 2025](https://developers.openai.com/blog/openai-for-developers-2025/); [MCP Introduction – Anthropic](https://www.anthropic.com/news/model-context-protocol); [Gemini API Libraries](https://ai.google.dev/gemini-api/docs/libraries); [M365 Copilot Extensibility](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/)_

### Technology Adoption Trends

_MCP is emerging as the cross-platform standard:_ As of early 2026, MCP has first-class support in Claude, ChatGPT (via Responses API), Microsoft Copilot (Ignite 2025), and Gemini (through function-calling compatible patterns). The 10,000+ active MCP servers and 97M monthly SDK downloads signal rapid ecosystem maturation.
_Source: [What Is MCP – Generect](https://generect.com/blog/what-is-mcp/)_

_OpenAI deprecation cycle:_ The Assistants API is deprecated as of August 2025, sunset August 26, 2026. The Responses API is OpenAI's long-term architecture. GPT Actions (OpenAPI-based) continue to function for existing custom GPTs but are no longer being enhanced — the investment has shifted to agent-native tool frameworks.
_Source: [OpenAI Assistants API Deprecation – Ragwalla](https://ragwalla.com/docs/guides/openai-assistants-api-deprecation-2026-migration-guide-wire-compatible-alternatives)_

_Google Gemini Extensions ≠ open developer platform:_ Consumer Gemini Extensions (Gmail, Drive, Maps, YouTube) are Google-curated integrations, not a third-party store. Third-party developer integration with Gemini is exclusively API/function-calling based. There is no equivalent to the GPT Store or MCP ecosystem for embedding into the consumer Gemini app.
_Source: [Gemini API Tools – Google AI for Developers](https://ai.google.dev/gemini-api/docs/tools)_

_Microsoft Copilot maturity:_ The declarative agent + MCP path is in public preview (not GA) as of March 2026. The tooling (M365 Agents Toolkit) is functional but younger. Distribution requires either IT admin org deployment or Partner Center submission with AppSource review — a higher bar than MCP or GPT Store self-publish.

---

## Integration Patterns Analysis

There are two distinct integration surfaces for each platform: **consumer distribution** (how end-users discover and use On Record through a chat app) and **API/developer integration** (how a developer-built app calls On Record's backend). These are often confused but require different approaches.

### Platform-by-Platform Integration Paths

#### ChatGPT — Two Separate Paths

**Path A — GPT Store (consumer distribution):** Create a Custom GPT in the GPT Builder UI with OpenAPI Actions pointing to On Record's REST endpoints. No formal review/approval process for publishing to the GPT Store. Rate limits are plan-dependent and dynamic (Free: 10 messages/5h; Plus: 160 messages/3h; Business/Enterprise: higher). Custom GPTs are only accessible on chatgpt.com — cannot be embedded. Auth options: API key or OAuth 2.0. This is the consumer discovery path.
_Source: [GPTs FAQ – OpenAI Help Center](https://help.openai.com/en/articles/8554407-gpts-faq)_

**Path B — Responses API (developer/agent path):** The Responses API natively supports remote MCP servers as a `type: "mcp"` tool. A developer passes On Record's MCP server URL directly — no OpenAPI wrapper needed. ChatGPT's runtime calls `tools/list` on the server, exposes tools to the model, and routes `tool_call` invocations back to the server. No additional cost beyond output tokens. Auth via OAuth header per request.
```json
{
  "type": "mcp",
  "server_label": "on-record",
  "server_url": "https://mcp.on-record.app/mcp",
  "require_approval": { "never": { "tool_names": ["find_legislators", "lookup_district"] } }
}
```
_Source: [Remote MCP Tool – OpenAI Platform Docs](https://platform.openai.com/docs/guides/tools-remote-mcp); [OpenAI MCP Cookbook](https://cookbook.openai.com/examples/mcp/mcp_tool_guide)_

**Key distinction for On Record:** Path A (GPT Store) is for reaching end-users directly through ChatGPT. Path B (Responses API) is for developers building apps that incorporate On Record's tools. Both are viable; they serve different use cases.

---

#### Claude — Native MCP, Single Path

On Record's existing Hono MCP server is already the correct format for Claude integration. The path to production remote deployment is:

1. **Transport:** Migrate from SSE to **Streamable HTTP** using `@hono/mcp` (official Hono package at `jsr.io/@hono/mcp`) or the production-ready `streamable-mcp-server-template` (Node.js + Hono + OAuth 2.1 + AES-256-GCM token encryption).
2. **Auth:** Implement OAuth 2.1 with PKCE + `/.well-known/oauth-protected-resource` endpoint (RFC 9728). Claude walks users through the OAuth flow automatically.
3. **Distribution:** Remote MCP connectors are available to Claude **Pro, Max, Team, and Enterprise** plan users — not Free tier. Users add the server URL in Claude settings; no app store submission required.
4. **Tool scoping:** Use `allowed_tools` to limit exposed tools per integration context.

The `@hono/mcp` package directly wraps the existing `@modelcontextprotocol/sdk` `McpServer`, making the transport upgrade minimal for On Record's existing codebase.
_Source: [Building Custom Connectors – Claude Help Center](https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers); [@hono/mcp – JSR](https://jsr.io/@hono/mcp); [MCP Connector – Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)_

---

#### Gemini — API Function Calling Only (No Consumer Store Path)

There is no path to embed On Record into the consumer Gemini app (gemini.google.com). Consumer Extensions are Google-curated only.

The developer integration path: expose On Record's tools as **function declarations** in the `tools` array of a `generateContent` request. The declaration follows JSON Schema format. Developers build their own Gemini-powered app that calls On Record's backend.

```js
const tools = [{
  functionDeclarations: [{
    name: "find_legislators",
    description: "Look up Utah state legislators for a given address",
    parameters: {
      type: "object",
      properties: { address: { type: "string" }, zone: { type: "string" } },
      required: ["address", "zone"]
    }
  }]
}];
```

Gemini returns a `functionCall` response; the app executes the tool and sends results back in a `functionResponse` turn. Gemini 3's thinking layer significantly improves function selection accuracy.

Note: MCP is now supported as a client in Gemini (Gemini can connect to MCP servers), but there is no "publish to Gemini" distribution store for third parties.
_Source: [Function Calling – Google AI for Developers](https://ai.google.dev/gemini-api/docs/function-calling); [Building Agents with Gemini – Google Developers Blog](https://developers.googleblog.com/building-agents-google-gemini-open-source-frameworks/)_

---

#### Microsoft Copilot — MCP Plugin via Declarative Agent (Preview)

The M365 Agents Toolkit in VS Code will auto-generate a plugin manifest by fetching On Record's MCP server URL at `https://<host>/mcp`. Key constraints:

- **Static tool discovery only** — `enable_dynamic_discovery: false` required in manifest. Tool list is snapshotted at build time, not dynamically fetched at runtime.
- **Auth:** OAuth 2.0 authorization code flow only. API key auth is explicitly not supported. Microsoft Entra ID SSO is the preferred path for M365 environments; standard OAuth 2.0 works for external IdPs. OAuth 2.0 Dynamic Client Registration (DCR) is supported for simpler setup.
- **Plugin manifest schema 2.4** adds MCP server support. The toolkit generates the manifest; Kiota can also generate from OpenAPI.
- **Distribution:** IT admin org deployment (internal) or Partner Center / AppSource review (public Copilot Store). The AppSource validation path requires screenshots of Copilot functionality and passes through Microsoft's review process.
- **Audience:** M365 Business/Enterprise subscribers with Copilot add-on — the journalists, staffers, and lobbyist personas Corey identified.

_Source: [Build Declarative Agents with MCP – M365 Dev Blog](https://devblogs.microsoft.com/microsoft365dev/build-declarative-agents-for-microsoft-365-copilot-with-mcp/); [Build plugins from MCP server – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-mcp-plugins); [Auth for Plugins – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api-plugin-authentication)_

---

### Integration Complexity Comparison

| Platform | Consumer Distribution | Developer/API Integration | Auth Requirement | On Record Effort |
|---|---|---|---|---|
| **Claude** | Remote MCP URL (Pro/Max/Team/Enterprise) | Native MCP | OAuth 2.1 + PKCE | Low — transport upgrade + OAuth layer |
| **ChatGPT (GPT Store)** | Custom GPT with OpenAPI Actions | Responses API with MCP | API key or OAuth 2.0 | Medium — OpenAPI spec for Store; MCP already works for API path |
| **ChatGPT (Responses API)** | N/A (developer path) | Native MCP | OAuth header | Low — same server as Claude |
| **Microsoft Copilot** | Partner Center / AppSource (preview) | MCP plugin manifest | OAuth 2.0 auth code only, no API keys | Medium-High — manifest generation + Entra ID / OAuth setup + submission |
| **Gemini** | No consumer store path | Function calling declarations | API key or service account | High — requires separate Gemini app build |

### Key Integration Insight for On Record

**One well-deployed remote MCP server with OAuth 2.1 serves Claude natively and ChatGPT's Responses API natively.** This is the highest-leverage integration investment. A separate OpenAPI spec layer (thin wrapper) enables the GPT Store custom GPT path and Microsoft Copilot path. Gemini requires a separate developer-built application and is the most isolated effort.

_Source: [Vercel MCP Server + ChatGPT Connector Guide](https://vercel.com/kb/guide/mcp-server-chatgpt-connector); [Hono Stateless MCP Example](https://github.com/mhart/mcp-hono-stateless)_

### Security Patterns Across Platforms

All four platforms converge on **OAuth 2.0/2.1** as the auth standard for production integrations. Key differences:

- MCP (Claude + ChatGPT): OAuth 2.1 with PKCE, `/.well-known/oauth-protected-resource` discovery endpoint required
- Microsoft Copilot: OAuth 2.0 authorization code flow, Entra ID SSO preferred, API keys explicitly excluded
- GPT Actions: API key or OAuth 2.0 (both supported, more flexible)
- Gemini API: API key for prototyping, service account / OAuth 2.0 for production Vertex AI

Notable security gotcha: CVE-2025-6514 in `mcp-remote` npm package (versions 0.0.5–0.1.15) allowed arbitrary OS command execution via unsanitized OAuth URLs. Fixed in 0.1.16. Any On Record deployment must use a patched version.
_Source: [Secure MCP OAuth 2.1 – Scalekit](https://www.scalekit.com/blog/implement-oauth-for-mcp-servers); [MCP OAuth 2.1 – MCP Spec](https://modelcontextprotocol.io/specification/draft/basic/authorization)_

---

## Strategic Notes: BYOLLM Architecture and Monetization Implications

### Scope Decision: Gemini Deprioritized

Gemini is excluded from further analysis in this research. The consumer Gemini app has no third-party plugin ecosystem — integrations are Google-curated only. Reaching Gemini users requires building a standalone Gemini-powered application, which directly contradicts On Record's BYOLLM architecture (users bring their own LLM subscription; On Record provides the MCP server layer). Gemini's pricing advantage (~$0.10/M tokens for Flash vs ~$3/M for Claude Sonnet) is irrelevant when On Record does not pay for inference. Revisit only if the BYOLLM model is abandoned.

### BYOLLM + Enterprise Contracts: The B2B Opportunity

On Record's architecture is unusually well-suited to enterprise buyers who already hold AI contracts. Legislative affairs teams at law firms, lobbying shops, newsrooms, and government relations departments are disproportionately likely to have M365 Copilot or Claude Enterprise seats as part of broader software agreements. For these buyers:

- **Zero new procurement friction** — no new AI vendor evaluation, no new data processing agreements, no new LLM cost line item. On Record is just another tool on infrastructure they've already purchased.
- **Marginal token cost is near-zero** — enterprise AI contracts are typically seat-based or include generous token allowances. Using On Record tools consumes tokens they've already paid for.
- **BYOLLM enables a lower On Record access fee** — On Record's cost structure excludes inference, so it can price plugin access below a full-service SaaS that bundles LLM costs. This is a genuine competitive framing.

**Important nuance:** "Cheaper for the buyer" only holds if On Record's access pricing visibly reflects the thinner cost structure. If plugin access is priced similarly to a full-service competitor, buyers lose the framing and the value prop collapses.

### Revenue Mechanisms by Segment

**Consumer (individual constituents, Claude Pro / ChatGPT Plus subscribers):**
No automatic revenue flow from LLM provider to On Record. Users paying $20/month to Anthropic or OpenAI generate nothing for On Record when they use the MCP server. Viable models: direct subscription tier, donation/civic funding model, or grants (civic tech organizations frequently operate on foundation grants). BYOLLM is excellent UX for this segment but does not auto-monetize.

**Professional / Enterprise (journalists, lobbyists, legislative staffers):**
- **Direct subscription** — most straightforward; On Record charges a per-seat or org fee for MCP server access, independent of LLM provider.
- **Microsoft AppSource paid plugin** — Copilot plugins can be sold through AppSource. Microsoft handles billing and takes ~15–20%. This is the most structured monetization path for the M365/Copilot segment and handles enterprise procurement workflows natively.
- **No rev share from Anthropic or OpenAI** — neither provider currently shares revenue with MCP server developers or GPT Store creators. OpenAI's GPT Store pays developers nothing. Anthropic has no marketplace.

### Platform Prioritization Summary

| Platform | Segment | Timeline | Revenue Path |
|---|---|---|---|
| **Claude (MCP)** | Consumer + prosumer | MVP | Direct subscription or free |
| **ChatGPT (GPT Store)** | Consumer | Near-term | Direct subscription or free |
| **ChatGPT (Responses API)** | Developer-built apps | Near-term | N/A (developer path) |
| **Microsoft Copilot** | Professional / enterprise | Long-term | AppSource paid plugin or direct enterprise contract |
| **Gemini** | — | Deprioritized | — |

---

## Architectural Patterns and Design

### System Architecture: Stateless vs. Stateful MCP

The MCP ecosystem is mid-transition on session architecture. The current Streamable HTTP spec (2025-03-26) supports both stateful sessions and stateless requests. The 2026 roadmap formalises **stateless-by-default** as the target — each request self-contained, with application-level statefulness layered on top via tokens/cookies, mirroring standard HTTP.

**Implications for On Record's existing architecture:**

On Record's MCP server runs on Railway (persistent containerized process), which is well-suited for the current stateful model. The 2026 shift toward stateless-by-default is directionally positive — it will make future horizontal scaling simpler — but is not a breaking change for existing deployments. The Railway deployment handles this correctly today and does not need to change until the stateless SEPs are finalised (tentatively June 2026).

**Vercel** (where the web app lives) is the wrong host for the MCP server: its 10-second default timeout (60 seconds on Pro) is incompatible with MCP tool calls that chain UGRC geocoding → Utah Legislature API lookups. Railway's absence of hard request timeouts is a meaningful architectural advantage here.

_Source: [MCP Transport Future – MCP Blog](http://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/); [MCP 2026 Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/); [Building Efficient MCP Servers – Vercel](https://vercel.com/blog/building-efficient-mcp-servers)_

### Request Execution Model Per Platform

Understanding how each platform executes tool calls is critical for designing On Record's tool handlers.

**Claude (MCP):** The Claude host calls `tools/list` once at session start to enumerate available tools, then issues `tools/call` for each invocation. Calls are sequential within a turn but Claude can chain multiple tool calls across turns. No platform-imposed timeout on individual tool calls beyond the user's session patience. Streaming responses supported.

**ChatGPT (Responses API / MCP):** Runtime calls `mcp_list_tools` on first use, caches the result. Tool invocations (`mcp_tool_call`) can be batched in an agentic loop within a single API request. The `require_approval` setting controls whether the runtime pauses for user confirmation. No per-tool timeout documented, but the overall Responses API request has a maximum duration. `allowed_tools` parameter should be used to limit tool list size and reduce token overhead per call.
_Source: [Remote MCP Tool – OpenAI Platform](https://platform.openai.com/docs/guides/tools-remote-mcp)_

**Microsoft Copilot (Declarative Agent):** Static tool discovery — tool list is snapshotted at manifest build time, not fetched dynamically at runtime. Tools are called as REST-style actions via the plugin manifest. This means On Record tools need to be stable and well-named in the manifest; additions require a manifest update and resubmission.
_Source: [Declarative Agents Overview – Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-declarative-agent)_

### Deployment Architecture

On Record's current split — MCP server on Railway, web app on Vercel — is well-aligned with each platform's strengths:

```
┌─────────────────────────────────────────────────────┐
│                   Chat App Layer                    │
│  Claude.ai  │  ChatGPT  │  M365 Copilot (future)   │
└──────────────────────┬──────────────────────────────┘
                       │ MCP / OpenAPI
┌──────────────────────▼──────────────────────────────┐
│          On Record MCP Server (Railway)             │
│  Hono + @modelcontextprotocol/sdk                   │
│  Streamable HTTP transport (upgrade from SSE)       │
│  OAuth 2.1 + PKCE (to add)                         │
│  Tools: find_legislators, lookup_district, etc.     │
└───────────┬──────────────────────┬──────────────────┘
            │                      │
┌───────────▼──────┐   ┌───────────▼──────────────────┐
│  Utah Legislature│   │  UGRC GIS API                │
│  API             │   │  (geocoding + districts)      │
└──────────────────┘   └──────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        On Record Web App (Vercel)                   │
│  Next.js 16 — constituent-facing UI                 │
│  Calls MCP server via NEXT_PUBLIC_MCP_SERVER_URL    │
└─────────────────────────────────────────────────────┘
```

### Multi-Tenancy Considerations

**MVP (individual constituents):** No multi-tenant complexity. Each user connects their own Claude/ChatGPT subscription. The MCP server handles requests statelessly per OAuth token — each token scoped to one user. No shared state between users.

**Enterprise (future — professional firms):** Multi-tenant isolation requires: (1) tenant-scoped OAuth tokens with `tenant_id` claim, (2) per-tenant audit logging, (3) rate limiting per tenant to prevent one org from starving others. The key risk is **leaky context** — a shared session store without strong tenant filtering is a data incident. The layered pattern (IdP → gateway → MCP server → namespaced storage) is the proven blueprint.
_Source: [Multi-User MCP Blueprint – Bix Tech](https://bix-tech.com/multi-user-ai-agents-with-an-mcp-server-a-practical-blueprint-for-secure-scalable-collaboration/)_

### GPT Store vs. Responses API: Architectural Difference

This distinction matters for how On Record exposes its interface to ChatGPT users:

- **GPT Store (custom GPT + Actions):** OpenAI hosts the GPT; On Record hosts the Action endpoint. The GPT's system prompt, persona, and tool schema are configured in ChatGPT's builder UI and stored on OpenAI's platform. On Record's server only needs to handle the REST calls — it has no awareness of the conversation context.

- **Responses API (MCP):** No GPT configuration needed. The calling application passes On Record's MCP server URL directly. On Record's tool descriptions (from `tools/list`) are what the model sees — so tool naming and descriptions in the MCP server are the primary UX surface, not a GPT system prompt.

For consumer distribution via the GPT Store, both must exist: a custom GPT (OpenAI-hosted, minimal config) that points its Action at On Record's REST endpoints. For developer/API distribution, the MCP server alone is sufficient.

### Performance Characteristics

| Concern | Claude MCP | ChatGPT Responses API | Microsoft Copilot |
|---|---|---|---|
| **Tool list fetch** | Once per session (`tools/list`) | Once per session (`mcp_list_tools`) | Once at manifest build time (static) |
| **Per-call latency overhead** | ~0ms protocol overhead | ~0ms protocol overhead | REST round-trip via plugin manifest |
| **Timeout constraints** | None documented | None per-tool documented | REST action timeouts apply |
| **Streaming support** | Yes (SSE within Streamable HTTP) | Yes | Limited |
| **Approval UX** | OAuth prompt at connection | `require_approval` per tool | User confirms via Copilot chat |

_Source: [GPT Actions Production – OpenAI](https://platform.openai.com/docs/actions/production); [MCP Architecture – modelcontextprotocol.io](https://modelcontextprotocol.io/docs/learn/architecture)_
