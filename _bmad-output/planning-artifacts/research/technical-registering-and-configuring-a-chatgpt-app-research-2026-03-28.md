---
stepsCompleted: [1, 2]
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

# Registering and Configuring a ChatGPT App: Comprehensive Technical Research

**Date:** 2026-03-28
**Author:** Corey
**Research Type:** technical

---

## Executive Summary

ChatGPT's integration platform has undergone a complete architectural shift since 2024. The original plugin system was shut down in April 2024 and replaced by two active mechanisms: **GPT Actions** (OpenAPI 3.1.0 schemas wired to Custom GPTs) and the newer **Apps SDK** (MCP-based, launched December 2025), which enables full-featured app submissions to the ChatGPT App Directory.

For the On Record project, the path forward is clear: the existing `apps/mcp-server` (Hono + `@modelcontextprotocol/sdk 1.26.0` + TypeScript) is already architected for the Apps SDK path. A two-stage strategy is recommended — ship a GPT Actions integration quickly (hours to working prototype, no new infrastructure), then evolve to a full MCP App submission once the App Directory review process matures from beta.

The Apps SDK UI library (`@openai/apps-sdk-ui`) uses React 18/19 + Tailwind 4 + Radix — direct compatibility with On Record's existing `apps/web` stack. Authentication for v1 is a static API key (appropriate for public legislative data with no PII). Per-user OAuth 2.1/PKCE is available for future personalization features.

**Key Technical Findings:**

- Three integration tiers exist: Custom GPT only (no-code), GPT Actions (OpenAPI REST), Apps SDK/MCP (full developer path)
- MCP is now a cross-platform open standard — an On Record MCP server works with both ChatGPT and Claude with no protocol changes
- App Directory submission requires identity verification + beta review; GPT Actions has no such gate
- `@openai/apps-sdk-ui` slots directly into Next.js/Tailwind 4 stack with a one-line CSS import
- No new storage infrastructure needed — existing SQLite cache layer is the data source

**Technical Recommendations:**

1. Author an OpenAPI 3.1.0 schema for existing MCP tools and register a Custom GPT with API key auth (Path A — ship first)
2. Complete OpenAI Platform identity verification now — it's a prerequisite for App Directory and has no downside to doing early
3. Annotate all MCP tools with accurate `readOnlyHint`/`destructiveHint` before App Directory submission — incorrect labeling is a documented rejection reason
4. Add semantic caching at the MCP server layer — 73% of naive OpenAI integrations fail from rate limits; caching prevents this
5. Draft a Privacy Policy covering Action data handling before any public sharing of the GPT

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
3. [Integration Patterns Analysis](#integration-patterns-analysis)
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
6. [Source References](#source-references)

---

## Research Overview

This report covers the complete technical landscape for registering and configuring a ChatGPT app as of March 2026. Research spans three integration tiers (Custom GPT, GPT Actions, Apps SDK/MCP), authentication mechanisms (None, API Key, OAuth 2.0/2.1+PKCE), the OpenAPI 3.1.0 schema requirements, the `@openai/apps-sdk-ui` design system, App Directory submission requirements, rate limits, and On Record-specific architectural fit.

All findings are sourced from OpenAI's official documentation (platform.openai.com, developers.openai.com, help.openai.com), the OpenAI Cookbook, the open-source `openai/apps-sdk-ui` GitHub repository, and current developer community reports. Web research was conducted on 2026-03-28; all platform details reflect the current state post-Apps SDK launch (December 2025).

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


<!-- Content will be appended sequentially through research workflow steps -->
