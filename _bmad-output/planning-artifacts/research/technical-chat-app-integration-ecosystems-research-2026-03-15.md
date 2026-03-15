---
stepsCompleted: [1]
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
