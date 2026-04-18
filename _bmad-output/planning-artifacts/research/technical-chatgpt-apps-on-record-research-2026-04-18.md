---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'ChatGPT Apps SDK — integration patterns for on-record'
research_goals: 'Understand how on-record (an MCP server that helps constituents write their legislators) can integrate into the ChatGPT Apps ecosystem; identify the right integration model, SDK components, and distribution path'
user_name: 'Corey'
date: '2026-04-18'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-04-18
**Author:** Corey
**Research Type:** technical

---

## Research Overview

This report researches the ChatGPT Apps SDK and maps on-record's existing MCP server implementation against it. The goal is to understand what integration model fits best, what gaps exist, what work remains for on-record to become a listed ChatGPT App, and how to recover on-record's legislative conversation principles in a context where no system prompt can be supplied.

The headline finding: **on-record is already a valid ChatGPT App.** The ChatGPT Apps SDK is built directly on `@modelcontextprotocol/sdk` — the exact package on-record uses — with the same Streamable HTTP transport and the same tool annotation model. The submission made on 2026-04-18 is technically sound. No blocking gaps were found.

The open work is in three areas: (1) encoding conversation principles into tool descriptions and a Bill Confirmation widget to partially recover what the system prompt normally does; (2) adding computed `billUrl` fields and optionally storing `highlightedProvisions` to give the model richer bill context; and (3) the optional Path 3 widget build if richer in-chat UI is desired post-approval. See the Research Synthesis section for the full prioritized roadmap.

Sources: live documentation from `developers.openai.com/apps-sdk` (fetched 2026-04-18), `developers.cloudflare.com/agents` (fetched 2026-04-18), and code-level analysis of `apps/mcp-server/src/` and `packages/types/`.

---

## Technical Research Scope Confirmation

**Research Topic:** ChatGPT Apps SDK — integration patterns for on-record
**Research Goals:** Understand how on-record (an MCP server that helps constituents write their legislators) can integrate into the ChatGPT Apps ecosystem; identify the right integration model, SDK components, and distribution path

**Technical Research Scope:**

- Architecture Analysis — design patterns, frameworks, system architecture
- Implementation Approaches — development methodologies, coding patterns
- Technology Stack — languages, frameworks, tools, platforms
- Integration Patterns — APIs, protocols, interoperability
- Distribution Considerations — submission, verification, discoverability

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-04-18

---

## Technology Stack Analysis

### What the ChatGPT Apps SDK Is

The Apps SDK is OpenAI's framework for building applications that extend ChatGPT's capabilities from within the ChatGPT interface. It sits on top of the open **Model Context Protocol (MCP)** standard and adds:

- UI widget rendering (iframes, JSON-RPC 2.0 over `postMessage`)
- A structured tool annotation model
- App distribution via the ChatGPT app directory
- Optional ChatGPT-specific extensions (file upload, instant checkout, host modals)

The key architectural insight: **ChatGPT Apps are MCP servers**. There is no separate protocol. The SDK adds a UI layer on top of the same `@modelcontextprotocol/sdk` TypeScript package on-record already uses.

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server), [Introducing apps in ChatGPT](https://openai.com/index/introducing-apps-in-chatgpt/)_

### Core SDK Components

| Component | Description | On-record equivalent |
|-----------|-------------|---------------------|
| `@modelcontextprotocol/sdk` | Core MCP server, tool registration, JSON Schema | Already in use (v1.26.0) |
| `@modelcontextprotocol/ext-apps` | UI widget bundle registration, resource MIME types | **Not installed** — needed only for UI widgets |
| MCP transport (Streamable HTTP) | HTTP endpoint at `/mcp` serving JSON-RPC | Already implemented via `McpAgent.serve('/mcp', { transport: 'auto' })` |
| Tool annotations | `readOnlyHint`, `destructiveHint`, `openWorldHint` | **Already present** on all three tools |
| UI widget bundle | `text/html;profile=mcp-app` resources in iframes | Not implemented |

_Source: [Apps SDK Quickstart](https://developers.openai.com/apps-sdk/quickstart), [MCP concept](https://developers.openai.com/apps-sdk/concepts/mcp-server)_

### Transport & Runtime

- **Recommended transport:** Streamable HTTP (transport-agnostic; SSE also supported)
- **On-record runtime:** Cloudflare Workers + Durable Objects — `McpAgent.serve()` with `transport: 'auto'` already selects Streamable HTTP when ChatGPT connects
- **No Node.js required:** Cloudflare Workers is fully compatible; the quickstart uses Node only for local development convenience

_Source: [MCP Apps compatibility](https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt)_

### Authentication

- Auth is enforced at the server level, not via client hints
- OpenAI docs explicitly warn against trusting `_meta["openai/userAgent"]` for auth
- OAuth 2.1 + dynamic client registration is supported but not required
- On-record current state: open endpoint (no auth), which is valid for a public read-only service

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

## Technology Stack Analysis (continued)

### On-Record Tool Annotations — Compliance Check

The Apps SDK requires tool annotations with correct semantics. Submission reviewers specifically check for mismatched hint annotations as a rejection reason.

| Tool | `readOnlyHint` | `destructiveHint` | `openWorldHint` | Compliant? |
|------|---------------|------------------|----------------|-----------|
| `resolve_address` | `true` | `false` | `true` | ✅ (makes external GIS call) |
| `lookup_legislator` | `true` | `false` | `false` | ✅ (reads from D1 cache only) |
| `search_bills` | `true` | `false` | `false` | ✅ (reads from D1 cache only) |

All three tools are already annotation-compliant with Apps SDK requirements.

### Response Format

Apps SDK tools can return three optional sibling fields:
- `structuredContent` — concise JSON for both widget and model
- `content` — Markdown narration for the model
- `_meta` — large/sensitive data for the widget only (never reaches the model)

On-record currently returns only `content` with embedded JSON text. This is valid for the MCP Apps connector path. For a full ChatGPT App with UI widgets, tools would need to also emit `structuredContent` to drive the widget state.

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

## Integration Models — Three Paths

### Path 1: MCP Connector (Already Working)

Users manually add on-record as a connector in ChatGPT Settings → Apps & Connectors → Create, pointing at the public `/mcp` endpoint. No submission required.

**Status:** Fully functional today. On-record's endpoint is a valid remote MCP server.

**Limitations:** No discoverability (not listed in app directory), users must know the URL.

_Source: [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)_

### Path 2: Listed MCP App (Submitted, In Review)

Submit the MCP server to the ChatGPT app directory via the OpenAI Platform Dashboard. Users discover via direct link or name search. No UI widgets required.

**Status:** Submitted 2026-04-18. Domain verification challenge already in place (per commit `cdc66b4`).

**Distribution:** Users discover via direct link or name search. Enhanced featured placement is selective.

_Source: [App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines), [Submit and maintain your app](https://developers.openai.com/apps-sdk/deploy/submission)_

### Path 3: Full ChatGPT App with UI Widgets

Install `@modelcontextprotocol/ext-apps`, register HTML widget bundles as MCP resources (`text/html;profile=mcp-app`), have tool responses include `_meta.ui.resourceUri` pointing to the template. Widgets render in an iframe and communicate via JSON-RPC 2.0 over `postMessage`.

**Status:** Not implemented. Would require:
1. `npm install @modelcontextprotocol/ext-apps`
2. Build widget HTML bundles (one per tool or one shared)
3. Register resources in `mcp-agent.ts`
4. Add `_meta.ui.resourceUri` to tool return values
5. Add `structuredContent` sibling to tool responses (drives widget state)

**Value add:** Rich in-chat UI — e.g., a legislator contact card, a bill list with expand/collapse, a district map visualization.

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

## Gap Analysis

### Gaps for the Listed MCP App (Path 2)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Public HTTPS `/mcp` endpoint | ✅ Done | Cloudflare Workers |
| Tool annotations correct | ✅ Done | All three tools |
| Domain verification challenge | ✅ Done | commit `cdc66b4` |
| Privacy policy URL | ✅ Done | Required by submission form |
| App name / description / icon | ✅ Done | Submitted |
| Screenshots (3-5) | ✅ Done | Required by submission form |
| Test prompts with expected responses | ✅ Done | Required by submission form |
| OpenAI organization verification | ✅ Done | Required before submission |
| EU data residency | N/A | Cloudflare global data residency — no issue |
| Response PII scrubbing | ✅ Done | `resolvedAddress` in response but not in logs; no session/trace IDs in output |

**No blocking gaps for Path 2.** On-record is in review.

### Gaps for Full ChatGPT App with UI Widgets (Path 3)

| Gap | Effort | Priority |
|-----|--------|----------|
| `@modelcontextprotocol/ext-apps` not installed | Low (add dependency) | Medium |
| No HTML widget bundles | Medium (build 1-3 widgets) | Low-Medium |
| Tool responses lack `structuredContent` | Low (add sibling field) | Medium |
| Tool responses lack `_meta.ui.resourceUri` | Low (add after widget registered) | Blocks widget rendering |
| CSP definition for widget iframes | Low | Required for widget submission |

**Path 3 is optional** — the listed MCP App works without widgets. Widgets add UX richness but are not required for distribution.

---

## Integration Patterns: Encoding Legislative Conversation Principles Without a System Prompt

### The Core Problem

On-record's `agent-instructions.md` is 290 lines of carefully crafted behavioral guidance — empathy-first ordering, five invariants before drafting, data boundary enforcement, no editorializing, voice inference rules. In the ChatGPT Apps context, **none of that can be supplied as a system prompt**. The model arrives with default ChatGPT behavior and only the tool definitions and tool responses as context.

The research question: which principles can be recovered through the levers the Apps SDK *does* provide, and which are lost?

---

### Available Levers (Ranked by Influence)

| Lever | What it controls | Influence on conversation |
|-------|-----------------|--------------------------|
| **Tool descriptions** | When/how the model invokes a tool; what the model tells itself about purpose | High — model reads these as operational instructions |
| **Tool response `content` field** | Markdown flowing into the chat after a tool call | Medium-high — model treats this as factual context; embedded stage directions are often followed |
| **`structuredContent` field** | JSON the model sees alongside `content` | Medium — semantic field names carry implicit instruction |
| **Widget `ui/send_message`** | Injects a user-turn message into the conversation from inside the widget | High for collecting invariants — mechanically enforces conversation state |
| **Widget `ui/update_context`** | Sends model-visible context updates from the widget | Medium — can update what the model knows about current state |
| **App description (submission)** | Discovery text; primes ChatGPT on purpose before first message | Low-medium — one-time framing |
| **`_meta` field** | Widget-only data; never reaches the model | Zero for model behavior; useful for driving widget UI state |

_Source: [UX Principles – Apps SDK](https://developers.openai.com/apps-sdk/concepts/ux-principles), [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

### Principle-by-Principle Encoding Analysis

#### Principle 1: Empathy First ("Validate before inform")

**Original rule:** Before any tool call, acknowledge the constituent's experience. A one-word acknowledgment followed immediately by "what's your address?" is an anti-pattern.

**ChatGPT Apps constraint:** No system prompt. The model's default behavior on "I want to write my legislator" may go straight to "what's your address?"

**Recovery strategy — `resolve_address` tool description:**
Embed behavioral precondition directly in the description:

> *"Geocodes a Utah street address to legislative district numbers. Call this only after you have acknowledged the constituent's concern with genuine empathy AND naturally asked for their address within the flow of that conversation. Do not open by asking for an address. Do not call this before understanding what the constituent cares about."*

**Assessment:** Partially recoverable. Tool descriptions are read by the model and shape call timing. However, the model may still skip empathy if the user's opening message is already transactional ("I want to write to my senator about HB 42, my address is 123 Main St"). The description can't force the model to add a turn it doesn't see as necessary.

**Confidence:** Medium. Works when the conversation opens naturally. Breaks under user-supplied efficiency.

---

#### Principle 2: Five Invariants Before Drafting

**Original rule:** Five things must be true before a draft is generated: concern captured, legislator identified, bill/topic confirmed, medium captured, voice confirmed.

**ChatGPT Apps constraint:** The model will draft whenever it thinks it has enough information.

**Recovery strategy — three-layer enforcement:**

**Layer A: Tool descriptions encode ordering dependencies**

`lookup_legislator` description addition:
> *"Call this once the constituent has shared their concern. Returns legislator name, chamber, district, email, and phone. After returning results, ask the constituent which legislator they want to write to before searching for bills."*

`search_bills` description addition:
> *"Search the Utah Legislature bill cache. Call this once a legislator has been selected. After returning results, do not draft until the constituent has explicitly confirmed a specific bill OR explicitly chosen to proceed without one."*

**Layer B: Tool response `content` as embedded checkpoints**

After `resolve_address` succeeds, include in the response `content`:
```
[Next: present the two legislators to the constituent and ask which one they want to write to]
```

After `search_bills` succeeds, include in the response `content`:
```
[Next: present 2–3 relevant bills and wait for explicit confirmation before asking about medium and voice]
```

**Layer C: Widget `ui/send_message` for invariants 4 and 5 (medium + voice)**

The bill confirmation widget can include two additional inputs — medium selector (Email / Text/SMS) and voice selector (Casual / Polished) — rendered as buttons. When the user clicks a bill and selects their preferences, the widget fires a `ui/send_message` call that injects a fully-formed user turn:

> *"I'd like to write about HB 42 — Education Funding Formula Amendments. Please send it as an email in a casual voice."*

This mechanically enforces invariants 3, 4, and 5 in a single widget interaction. The model receives a complete, unambiguous trigger and can draft immediately. Invariants 1 and 2 are enforced upstream by tool description preconditions.

**Assessment:** Mostly recoverable. Invariants 3-5 can be mechanically enforced via widget. Invariants 1-2 depend on tool description preconditions (partial, as noted above).

**Confidence:** High for 3-5 (mechanical enforcement). Medium for 1-2 (description-guided).

---

#### Principle 3: Data Boundary (No Voting Record Implied)

**Original rule:** `search_bills` returns sponsored bills only. Never imply voting record access. If the user asks "how did they vote?", redirect to "I can show you the bills they've personally sponsored."

**Recovery strategy — `search_bills` tool description:**

> *"Returns bills a legislator introduced or co-sponsored. This does NOT include voting records — it does not reveal how a legislator voted on bills they did not sponsor. If the constituent asks about voting history, explain this limitation and offer to show sponsored bills instead."*

**Assessment:** Highly recoverable. This is exactly the kind of factual constraint tool descriptions are designed to communicate. Models reliably respect explicit capability statements in tool descriptions.

**Confidence:** High.

---

#### Principle 4: No Editorializing

**Original rule:** Describe legislative facts only. Forbidden: intent, motivation, character judgments, or any characterization not directly supported by tool output.

**Recovery strategy — `search_bills` and `lookup_legislator` response `content`:**

Return clean, factual structured content only. The response shape itself is editorial-free — no adjectives, no framing. If the tool response never editorializes, the model has less scaffolding to editorialize onto.

Additionally, add to `search_bills` description:
> *"Describe bills factually — title, summary, and status only. Do not characterize the legislator's intent, motivation, or values based on their sponsored bills."*

**Assessment:** Partially recoverable. Tool response shape strongly influences model output style. The description constraint helps. However, the model retains latitude to frame results in conversation, and without system-prompt-level instruction, editorialization can creep in, especially if the user's tone is strongly negative.

**Confidence:** Medium. Better than nothing; not as strong as system prompt.

---

#### Principle 5: Voice Inference and Mirror

**Original rule:** Infer the constituent's linguistic register (casual vs. formal) from word choice and sentence structure throughout the conversation. Confirm before drafting.

**Recovery strategy:**

This principle is fundamentally model-behavior, not tool-behavior. It cannot be enforced via tool descriptions. However:

- The widget invariant enforcement (Layer C above) includes a voice selector, making explicit preference capture mechanical
- The voice selector can default to "Infer from our conversation" as a third option, which passes the decision back to the model

**Assessment:** Partially recoverable. The widget eliminates ambiguity by making voice explicit. The nuanced inference rule (distinguishing emotional intensity from linguistic register) cannot be transmitted — but explicit user selection sidesteps the need for it.

**Confidence:** High via widget (explicit selection). Low via model inference alone.

---

#### Principle 6: Substantiation Required

**Original rule:** Only assert positions the tools returned. Zero-result path produces a letter grounded in constituent concern only — no fabricated citations.

**Recovery strategy — `search_bills` response content on zero results:**

When `search_bills` returns empty, include in response `content`:
> *"No bills found matching this search. You can still write a message expressing your concern without citing specific legislation — your personal experience is sufficient grounds for constituent communication. Do not fabricate or invent bill citations."*

**Assessment:** Recoverable. The zero-result trigger is tool-detectable. The embedded instruction in the `content` response is explicit and the model reliably respects "do not fabricate" instructions that arrive in tool results.

**Confidence:** High for the zero-result case. Medium for the case where the model has partial data and could stretch.

---

### Widget Architecture for Invariant Enforcement

The highest-leverage widget to build is a **Bill Confirmation + Delivery Preferences** widget shown after `search_bills` returns results.

**Widget responsibilities:**
1. Display bill list (bill ID, title, one-line summary, status)
2. "Select" button per bill → captures invariant 3 (bill confirmed)
3. "Proceed without a bill" option → captures invariant 3 (explicit zero-bill path)
4. Medium selector: Email / Text/SMS → captures invariant 4
5. Voice selector: Casual / Polished / Infer from conversation → captures invariant 5
6. On submit: fires `ui/send_message` with complete draft trigger

**`ui/send_message` payload example:**
```
"I'd like to write about HB 42 — Education Funding Formula Amendments (passed 2025 General Session). Please send it as an email in a casual voice."
```

This single widget interaction replaces three separate conversational turns that the model would otherwise handle unreliably. It is the highest-ROI UI work for on-record.

**Data flow:**
- `search_bills` returns `structuredContent` with bill list (for widget) + `_meta` with any widget-specific state
- Widget renders bill cards from `structuredContent`
- User selects bill + medium + voice
- Widget fires `ui/send_message` → model receives complete invariants 3-5
- Model drafts immediately

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server), [UX Principles](https://developers.openai.com/apps-sdk/concepts/ux-principles)_

---

### What Cannot Be Recovered

| Principle | Why it's lost | Impact |
|-----------|--------------|--------|
| Opening tone ("warm, open question") | No system prompt; ChatGPT opens with its own default greeting | Low — ChatGPT's default opening is generally adequate |
| Nuanced empathy scripting ("That sounds incredibly stressful") | Model-level behavior; no hook | Medium — model may empathize generically, not specifically |
| Name elicitation timing ("woven naturally, not as a standalone transaction") | Conversational choreography; can't be encoded in tool descriptions | Low — cosmetic; doesn't affect letter quality |
| Address verification step ("compare resolvedAddress to what they provided") | Can be put in `resolve_address` response `content` | Medium — partial recovery via content field |
| Revision loop rules | No system prompt; model may restart conversation | Low — GPT models handle revision loops well by default |

---

### Proposed Tool Description Rewrites

These are the specific changes to existing tool descriptions in `apps/mcp-server/src/tools/` that encode the most critical behavioral principles:

**`resolve_address` (current):**
> *"Resolves a Utah street address to House and Senate legislative district numbers via GIS lookup."*

**Proposed:**
> *"Resolves a Utah street address to House and Senate legislative district numbers via GIS lookup. Call this only after you have acknowledged the constituent's concern and asked for their address naturally within that conversation — never as an opener. Returns houseDistrict, senateDistrict, and resolvedAddress. After returning results, present both legislators and ask which one the constituent wants to write to."*

---

**`lookup_legislator` (current):**
> *"Retrieves legislator contact info by legislator ID, by partial name, or by chamber and district number."*

**Proposed:**
> *"Retrieves legislator contact info by legislator ID (use sponsorId from bill search results), by partial name (when constituent knows their rep by name), or by chamber and district number (use houseDistrict/senateDistrict from resolve_address). Call this after the constituent has shared their concern. After returning results, ask which legislator the constituent wants to write to before searching for bills."*

---

**`search_bills` (current):**
> *"Searches the Utah Legislature bill cache. All parameters are optional — omitting all returns all cached bills."*

**Proposed:**
> *"Searches the Utah Legislature bill cache. Returns bills a legislator introduced or co-sponsored only — this is NOT voting record data and does not reveal how a legislator voted on bills they did not sponsor. All parameters are optional and compose as filters. Call this once a specific legislator has been selected. After returning results, present 2–3 relevant bills and wait for explicit confirmation of a specific bill (or explicit choice to proceed without one) before drafting. Do not draft until the constituent confirms. If no bills are found, offer to write a message grounded in the constituent's concern without a bill citation — do not fabricate citations."*

---

### Summary: What's Achievable

| Principle | Recovery path | Confidence |
|-----------|--------------|------------|
| Empathy first | `resolve_address` description precondition | Medium |
| 5 invariants before draft | Tool descriptions (1-2) + widget enforcement (3-5) | High for 3-5; Medium for 1-2 |
| Data boundary (no voting records) | `search_bills` description | High |
| No editorializing | Tool descriptions + clean response content | Medium |
| Voice capture | Widget selector (explicit) | High |
| No fabricated citations | Zero-result `content` instruction | High |

The single highest-leverage investment is the **Bill Confirmation + Delivery Preferences widget** — it mechanically enforces three of the five invariants regardless of model behavior, and it's where the conversation is most likely to go wrong without a system prompt.

## Architectural Patterns: Widget Hosting on Cloudflare Workers

### Current Architecture (No Widgets)

```
ChatGPT  ──POST /mcp──▶  Cloudflare Worker (worker.ts)
                                │
                         rate-limit check
                                │
                         McpAgent.serve() ──▶  OnRecordMCP (Durable Object)
                                                      │
                                              init(): registers 3 tools
                                              resolve_address / lookup_legislator / search_bills
                                                      │
                                              tool handlers → D1 (DB), UGRC GIS API
```

The Worker and the `OnRecordMCP` Durable Object are the same deployment unit. `wrangler.toml` has no `[assets]` block — all routes are handled by the Worker.

_Source: `apps/mcp-server/src/worker.ts`, `apps/mcp-server/src/mcp-agent.ts`, `apps/mcp-server/wrangler.toml`_

---

### Widget Hosting Architecture (With Widgets)

#### Option A: Cloudflare Workers Static Assets (Recommended)

Cloudflare Workers natively serves static assets from a `dist/` directory declared in `wrangler.toml`. Assets are automatically cached at Cloudflare's edge globally. No separate CDN, no separate deployment, no CORS issues — same domain as `/mcp`.

```toml
# wrangler.toml addition
[assets]
directory = "dist"
binding = "ASSETS"
```

The Worker serves widget HTML by fetching from `env.ASSETS`:

```typescript
// In mcp-agent.ts init():
this.server.registerResource(
  "bill-confirmation-widget",
  "ui://widget/bill-confirmation/v1",
  {},
  async () => ({
    contents: [{
      uri: "ui://widget/bill-confirmation/v1",
      mimeType: "text/html;profile=mcp-app",  // from RESOURCE_MIME_TYPE constant in ext-apps
      text: await (await this.env.ASSETS.fetch("http://localhost/bill-confirmation.html")).text()
    }]
  })
)
```

**Route arbitration:** By default Cloudflare serves static assets before invoking the Worker. The `[assets]` block must not conflict with `/mcp` routes. Use `run_worker_first = ["/mcp*"]` or keep widget assets on paths that won't collide (e.g., `/bill-confirmation.html`).

_Source: [Build an Interactive ChatGPT App · Cloudflare Agents](https://developers.cloudflare.com/agents/guides/chatgpt-app/), [Static Assets · Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)_

#### Option B: Serve Widget HTML Inline (No Build Step)

For the initial iteration, widget HTML can be returned as a string literal or imported inline — no `dist/` directory, no Vite, no `[assets]` block. Trade-off: no IDE support for the widget code, no TypeScript in the widget, harder to maintain.

**Recommended only as a spike to validate the integration works before committing to the build pipeline.**

#### Option C: Widget Hosted on `apps/web` (Next.js)

Widget HTML assets served from `apps/web` (e.g., `apps/web/public/widgets/`). CORS headers required since it's a different origin from `agents.getonrecord.org`. Must declare that origin in `resourceDomains` in the CSP configuration.

**Not recommended:** introduces cross-deployment dependency (web must be deployed before mcp-server widgets work), adds CSP surface area, and loses the simplicity of single-domain operation.

---

### Build Pipeline Changes Required

Current `apps/mcp-server` has no build step for assets — just `wrangler dev` / `wrangler deploy` with TypeScript compilation.

Adding Option A requires:

| Addition | Purpose |
|----------|---------|
| `vite` (devDep) | Bundle widget HTML/JS/CSS |
| `vite-plugin-singlefile` | Single-file bundle — no external script requests, simplifies CSP |
| `apps/mcp-server/src/widgets/bill-confirmation/` | Widget source (HTML + vanilla JS or minimal framework) |
| `apps/mcp-server/vite.config.ts` | Vite config pointing to widget entry points, output to `dist/` |
| `wrangler.toml` `[assets]` block | Serve `dist/` as static assets |
| Updated `deploy` script | `"vite build && wrangler deploy"` |
| `ASSETS: Fetcher` in `Env` type | Add to Workers env type declaration |

_Source: [Build an Interactive ChatGPT App · Cloudflare Agents](https://developers.cloudflare.com/agents/guides/chatgpt-app/)_

---

### McpAgent Integration Point

Widget resource registration belongs in `OnRecordMCP.init()` in `mcp-agent.ts`. The `ASSETS` binding is available as `this.env.ASSETS` once declared in `wrangler.toml`.

```typescript
// mcp-agent.ts — proposed addition
async init(): Promise<void> {
  // ... existing tool registrations ...
  
  // Register bill confirmation widget
  this.server.registerResource(
    "bill-confirmation-widget",
    "ui://widget/bill-confirmation/v1",
    {},
    async () => ({
      contents: [{
        uri: "ui://widget/bill-confirmation/v1",
        mimeType: "text/html;profile=mcp-app",
        text: await (await this.env.ASSETS.fetch(
          "http://localhost/bill-confirmation.html"
        )).text()
      }]
    })
  )
}
```

Tool descriptors then reference the resource URI in their return value:

```typescript
// In search_bills tool handler return:
return {
  structuredContent: { bills: result.bills, total: result.count },
  content: [{ type: "text", text: JSON.stringify(result) }],
  _meta: {
    ui: { resourceUri: "ui://widget/bill-confirmation/v1" }
  }
}
```

**Note:** `_meta` is widget-only — never reaches the model. `structuredContent` is model-visible and drives widget rendering. The widget reads bill data from `structuredContent` via the `ui/initialize` JSON-RPC handshake.

---

### CSP Configuration for On-Record's Widget

On-record's widget is read-only (no writes, no external embeds). This gives it the smallest possible CSP surface:

```typescript
// Widget resource metadata
{
  "openai/widgetCSP": {
    "connectDomains": ["agents.getonrecord.org"],  // only calls back to self
    "resourceDomains": [],   // vite-plugin-singlefile = no external script/font URLs
    "frameDomains": []       // no nested iframes — avoids review scrutiny
  }
}
```

**No `frameDomains`** is important: the OpenAI docs explicitly flag widgets declaring `frameDomains` as facing "higher scrutiny at review time and likely to be rejected or held back from broad distribution."

_Source: [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

### MIME Type Risk: `ext-apps` vs Cloudflare's Skybridge

⚠️ **Compatibility risk to verify before building.**

The OpenAI Apps SDK docs and `@modelcontextprotocol/ext-apps` use MIME type: `text/html;profile=mcp-app`

The Cloudflare Agents guide (`/agents/guides/chatgpt-app/`) uses: `text/html+skybridge`

These are different strings. It is unclear whether ChatGPT accepts both, or whether the Cloudflare guide reflects an older or platform-specific variant. The `ext-apps` `RESOURCE_MIME_TYPE` constant should be authoritative (it comes from OpenAI's own SDK), but this should be confirmed against a working integration before committing to the full widget build.

**Spike recommendation:** Build a minimal widget returning `text/html;profile=mcp-app` (via `ext-apps` constant), connect to ChatGPT developer mode, and verify the iframe renders before building the full Bill Confirmation widget.

_Source: [Build an Interactive ChatGPT App · Cloudflare Agents](https://developers.cloudflare.com/agents/guides/chatgpt-app/), [Build your MCP server – Apps SDK](https://developers.openai.com/apps-sdk/build/mcp-server)_

---

### `structuredContent` vs `_meta` Routing for On-Record Tools

| Tool | `structuredContent` (model sees) | `_meta` (widget only) |
|------|-----------------------------------|-----------------------|
| `search_bills` | `{ bills: [...], total: N }` — drives model narration and widget bill list | Widget UI state (e.g., selected legislator context) |
| `lookup_legislator` | `{ legislators: [...] }` — model presents them in chat | None needed initially |
| `resolve_address` | `{ houseDistrict, senateDistrict, resolvedAddress }` — unchanged | None needed initially |

Only `search_bills` needs a widget at MVP. `resolve_address` and `lookup_legislator` results are simple enough to present as text; no widget UX value.

---

### Wrangler.toml Delta (Proposed)

```toml
# Add to apps/mcp-server/wrangler.toml

[assets]
directory = "dist"
binding = "ASSETS"
```

No other `wrangler.toml` changes needed. The Durable Object migrations, D1, rate limiter, and cron triggers are unaffected.

---

### Architecture Summary

| Component | Change needed for widgets |
|-----------|--------------------------|
| `wrangler.toml` | Add `[assets]` block |
| `mcp-agent.ts` | Add `registerResource()` call; use `this.env.ASSETS` |
| `search-bills.ts` | Add `structuredContent` + `_meta.ui.resourceUri` to return |
| `apps/mcp-server/package.json` | Add `vite`, `vite-plugin-singlefile`, `@modelcontextprotocol/ext-apps` |
| New: `apps/mcp-server/src/widgets/` | Widget HTML source |
| New: `apps/mcp-server/vite.config.ts` | Build config |
| Env type | Add `ASSETS: Fetcher` |
| **Total existing files touched** | 3 |
| **Total new files** | ~3-4 |

_Source: [Build an Interactive ChatGPT App · Cloudflare Agents](https://developers.cloudflare.com/agents/guides/chatgpt-app/), [Static Assets · Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)_

## Implementation Research: Bill Text Access

### The Question

Should bill responses include links to full bill text, and if so in what form — HTML link, PDF link, or stored markdown? The answer turns on what's actually available and what's useful to the model vs the user.

---

### What the Utah Legislature Actually Exposes

#### HTML Pages (`le.utah.gov/~{year}/bills/static/{id}.html`)

These pages are **JavaScript-rendered shells**. When fetched as static HTML, they return navigation chrome and a call to `loadBillJSON('2026GS','SB0013',false)` — no bill text. The actual content loads dynamically via JS after page load.

**Verdict for model ingestion: zero value.** WebFetch (and the model's browsing tool) cannot execute JavaScript, so these pages return empty bill content.  
**Verdict as a reference link for humans: good.** The URL is deterministic and canonical — it's what someone pastes into a browser to read the bill.

URL construction: `https://le.utah.gov/~{session.slice(0,4)}/bills/static/{bill.id}.html`  
Examples:
- `bill.id = "HB0042"`, `bill.session = "2026GS"` → `https://le.utah.gov/~2026/bills/static/HB0042.html`
- `bill.id = "SB0013"`, `bill.session = "2025S1"` → `https://le.utah.gov/~2025/bills/static/SB0013.html`

The bill ID in the cache is already zero-padded (sourced directly from the API's `billNumber` field, e.g. `"HB0042"`), so no padding computation needed.

#### PDF Files (`le.utah.gov/Session/{year}/bills/introduced/{id}.pdf`)

The PDF URL includes a **substitute suffix** (`S01`, `S02`, etc.) for amended versions — e.g., `SB0192S01.pdf`. The introduced (original) version would be `SB0192.pdf`, but the current/enrolled version is not derivable from our cached data alone (we don't store which substitute is current).

**Verdict for model ingestion: impractical.** PDF parsing is not available in Cloudflare Workers without a third-party service. Even if fetched, PDFs require text extraction before the model can read them.  
**Verdict as a reference link: fragile.** The URL changes with each substitute version; we'd need to track the current substitute number in the cache to generate a valid current-version link.

#### `highlightedProvisions` — Already Being Fetched, Not Stored

**This is the key finding.** In `utah-legislature.ts:248`, the API's `highlightedProvisions` field is already fetched in every `getBillDetail` call and mapped to `BillDetail.fullText`:

```typescript
...(parsed.data.highlightedProvisions !== undefined && { fullText: parsed.data.highlightedProvisions }),
```

However, `BillDetail` is never written to the cache — only `Bill` is, and `Bill` has no `fullText` field. So this data is fetched and immediately discarded on every cache refresh.

`highlightedProvisions` is the Utah Legislature's structured plain-English description of the specific statutory changes a bill makes — it describes what code sections are being amended, added, or repealed, and what those changes do. It is distinct from `generalProvisions` (`summary`), which is the one-paragraph overview.

**Format uncertainty:** The official API docs at `le.utah.gov/data/developer.htm` do not document field formats. The field could be plain text, HTML, or lightly formatted text. This needs a one-time empirical check before committing to HTML-stripping logic. Given the field name and context it is likely plain text or minimal HTML.

_Source: `apps/mcp-server/src/providers/utah-legislature.ts:248`, `packages/types/index.ts`_

---

### Recommendation: Two-Track Approach

#### Track 1 (Zero Cost): Compute `billUrl` at Query Time

Add a computed `billUrl` field to `Bill` type (or include it only in `SearchBillsResult`) by deriving it from `bill.id` and `bill.session`. No schema change, no additional fetching, no storage increase.

```typescript
// Utility function — no I/O, pure computation
function billUrl(id: string, session: string): string {
  return `https://le.utah.gov/~${session.slice(0, 4)}/bills/static/${id}.html`
}
```

Include in the `search_bills` tool response so the model can cite it in letters and the Bill Confirmation widget can render "View full text →" deep-links per bill card.

**Impact on letter quality:** The model can include the bill URL inline in the draft letter — constituents can verify the legislation cited. This adds substantiation beyond just the title.

**Example draft inclusion:**
> "I'm writing about HB 42 — Education Funding Formula Amendments, which passed this year's General Session. You can read the full text at le.utah.gov/~2026/bills/static/HB0042.html."

This does NOT require changing the `Bill` interface in a breaking way — it can be added as an optional field or included only in the response JSON without being part of the stored cache record.

#### Track 2 (Schema Change): Store and Surface `highlightedProvisions` as `fullText`

Wire the `BillDetail.fullText` field through to the `bills` table and `Bill` type. This gives the model richer context than just the `summary` (a single paragraph).

**Required changes:**
| File | Change |
|------|--------|
| `packages/types/index.ts` | Add `fullText?: string` to `Bill` interface |
| Schema migration | Add `full_text TEXT` column to `bills` table |
| `apps/mcp-server/src/cache/bills.ts` | Include `full_text` in `writeBills()` and `rowToBill()` |
| `apps/mcp-server/src/providers/utah-legislature.ts` | Pass `fullText` through in `getBillsBySession()` |
| FTS5 index | Optionally include `full_text` in `bill_fts` virtual table for richer search |

**Pre-condition:** Inspect a live `highlightedProvisions` response from the API to determine format (plain text vs HTML) and typical length before deciding on HTML stripping. If HTML, a simple tag-stripping pass at write time is sufficient — no heavy library needed in the Worker:

```typescript
// Strip HTML tags if present — used at cache write time
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
```

**FTS5 impact:** Adding `full_text` to the FTS5 index would significantly improve keyword search quality — searching "property tax" would match against the actual provision text, not just the title and one-paragraph summary.

**D1 storage impact:** Typical `highlightedProvisions` fields are likely 200–1000 characters (structured summary, not statutory code). The 2026 session had ~800 bills. At 1KB/bill average that's ~800KB total — well within D1 limits.

---

### What to Include in Tool Responses

**`search_bills` response — proposed additions:**

```typescript
// Per bill in the results:
{
  id: "HB0042",
  session: "2026GS",
  title: "School Cybersecurity Amendments",
  summary: "Modifies provisions related to school cybersecurity...",   // existing
  fullText: "Amends Section 53G-7-218 to require...",                 // new (if Track 2)
  billUrl: "https://le.utah.gov/~2026/bills/static/HB0042.html",     // new (Track 1)
  status: "Passed",
  sponsorId: "SMITHJ"
}
```

**Model behavior with `billUrl`:** Including the URL in `structuredContent` (the model-visible field) means the model can reference it naturally in conversation and in draft letters. The widget can render it as a "View full text" link per bill card.

**`_meta.ui.resourceUri` and widget:** The bill card widget reads from `structuredContent.bills[].billUrl` to render the deep-link button. The model's narration can also include the URL inline.

---

### Implementation Sequencing

| Story | What | Effort | Value |
|-------|------|--------|-------|
| E5-x (new) | Compute and include `billUrl` in `search_bills` responses; update `Bill` type | XS | High — immediate citation quality improvement; widget deep-links |
| E5-y (new) | Spike: inspect `highlightedProvisions` content from live API; decide on HTML stripping | XS | Unblocks Track 2 |
| E5-z (new) | Store `highlightedProvisions` as `full_text`; add to FTS5 index; surface in responses | S-M | High — richer model context; better search |

**Do Track 1 first.** It's a pure computation addition — no schema migration, no risk. Track 2 requires an empirical spike (live API inspection) before the story can be fully spec'd.

---

### What Not to Do

| Approach | Why not |
|----------|---------|
| Store/cache PDF URLs | Substitute suffix changes with each amendment; not derivable from cached data |
| Fetch PDF text at cache time | No PDF parser in Cloudflare Workers; impractical |
| Fetch HTML page text via `loadBillJSON` | JS-rendered; WebFetch cannot execute JavaScript |
| Full statutory text (amended law sections) | Much larger; not in the API; would require scraping `le.utah.gov` statutory code |

_Source: [Utah Legislature Developer Tools](https://le.utah.gov/data/developer.htm), live page inspection of `le.utah.gov/~2026/bills/static/SB0013.html`_

---

## Research Synthesis

### Executive Summary

On-record is already architecturally compatible with the ChatGPT Apps ecosystem. The Apps SDK is built on `@modelcontextprotocol/sdk` — the same package, same Streamable HTTP transport, same tool annotation model. The submission made 2026-04-18 has no blocking technical gaps: all three tools carry correct annotations, the domain verification challenge is in place, and the Cloudflare Workers runtime is a first-class target for ChatGPT Apps.

The substantive open questions are not about compatibility — they are about quality. Without a system prompt, the conversation principles that make on-record effective (empathy-first ordering, five invariants before drafting, data boundary enforcement, no editorializing) must be encoded through the levers the Apps SDK does provide: tool descriptions, tool response content fields, and a Bill Confirmation widget that mechanically collects the remaining invariants before the model drafts. This is mostly recoverable, with the warm opening and nuanced acknowledgment choreography being the main irrecoverable losses.

Bill text access surfaces a secondary finding: `highlightedProvisions` — the Utah Legislature API's structured plain-English description of a bill's specific statutory changes — is already fetched on every cache refresh and silently discarded. Storing it and adding a computed `billUrl` to responses would give the model and the widget substantially richer per-bill context at low cost.

**Key Technical Findings:**

- ChatGPT Apps SDK = MCP + optional UI widgets. On-record already implements MCP correctly.
- Tool descriptions are the primary behavioral encoding channel in the absence of a system prompt.
- Three of the five required invariants (bill confirmed, medium, voice) can be mechanically enforced via a Bill Confirmation widget using `ui/send_message`.
- Widget hosting fits natively on Cloudflare Workers via the `[assets]` static binding — no separate CDN or origin required.
- `highlightedProvisions` is fetched and discarded on every cache refresh; wiring it through is a low-cost story.
- HTML bill pages are JS-rendered (no static text on fetch); PDFs have non-deterministic URLs. A computed `billUrl` pointing to the HTML page is the right form for human reference links.
- One MIME type uncertainty exists: the Cloudflare guide uses `text/html+skybridge` while the Apps SDK spec uses `text/html;profile=mcp-app`. A minimal spike should validate this before widget work begins.

**Recommended Actions (ordered):**

1. Rewrite the three tool descriptions to encode behavioral preconditions and data boundary constraints
2. Add computed `billUrl` to `search_bills` responses (XS story, zero schema change)
3. Spike: inspect live `highlightedProvisions` content; decide on HTML stripping
4. Store `highlightedProvisions` as `full_text` in cache; add to FTS5 index (S story)
5. Spike: validate widget rendering with `text/html;profile=mcp-app` MIME type in ChatGPT developer mode
6. Build Bill Confirmation widget (M story) — enforces invariants 3-5, adds `billUrl` deep-links

---

### Prioritized Implementation Roadmap

#### Tier 1 — No-Widget Improvements (Independent of Review Outcome)

These can be done now, improve the listed MCP App experience regardless of whether the widget build proceeds, and require no new dependencies.

| Story | What | Files touched | Effort |
|-------|------|---------------|--------|
| **E5-x** | Rewrite `resolve_address`, `lookup_legislator`, `search_bills` tool descriptions to embed behavioral preconditions and data boundary rules | `tools/resolve-address.ts`, `tools/legislator-lookup.ts`, `tools/search-bills.ts` | XS |
| **E5-y** | Add computed `billUrl` field to `Bill` type and `search_bills` responses | `packages/types/index.ts`, `tools/search-bills.ts`, `cache/bills.ts` | XS |
| **E5-z-spike** | Inspect live `highlightedProvisions` from `glen.le.utah.gov` API; determine format and typical length | One-off API call in dev | XS |
| **E5-z** | Store `highlightedProvisions` as `full_text TEXT` in `bills` table; include in `Bill` type and `search_bills` responses; add to FTS5 index | Schema migration, `bills.ts`, `utah-legislature.ts`, `types/index.ts` | S |

#### Tier 2 — Widget Build (Post-Approval or Parallel)

These require `@modelcontextprotocol/ext-apps` and a Vite build pipeline. Do the MIME type spike before committing.

| Story | What | Files touched | Effort |
|-------|------|---------------|--------|
| **Widget-spike** | Minimal widget returning `text/html;profile=mcp-app`; verify iframe renders in ChatGPT developer mode | `mcp-agent.ts`, `wrangler.toml`, new `widgets/hello.html` | XS |
| **Widget-build** | Full Bill Confirmation + Delivery Preferences widget: bill cards with select, `billUrl` deep-links, medium/voice toggles, `ui/send_message` trigger | `mcp-agent.ts`, `wrangler.toml`, `search-bills.ts`, new `widgets/bill-confirmation/` | M |

#### Tier 3 — Post-MVP

- OpenStates migration for voting record data (noted in `CLAUDE.md` as post-MVP)
- Additional widgets for `lookup_legislator` (contact card) if warranted by usage patterns

---

### Conversation Principle Recovery — Decision Reference

| Principle | Mechanism | Confidence | Story |
|-----------|-----------|------------|-------|
| Empathy first (don't open with address request) | `resolve_address` description precondition | Medium | E5-x |
| 5 invariants before draft — concern + legislator (1-2) | Tool description ordering dependencies | Medium | E5-x |
| 5 invariants before draft — bill + medium + voice (3-5) | Widget `ui/send_message` enforcement | High | Widget-build |
| Data boundary: no voting records | `search_bills` description explicit statement | High | E5-x |
| No editorializing | Tool descriptions + clean response content shape | Medium | E5-x |
| No fabricated citations | Zero-result `content` instruction | High | E5-x |
| Voice inference nuance | Widget explicit selector (bypasses inference entirely) | High | Widget-build |
| Warm opening / acknowledgment choreography | **Not recoverable** without system prompt | — | — |

---

### Tool Description Rewrites — Ready to Implement

These are spec-ready for E5-x:

**`resolve_address`** — add to existing description:
> *"Call this only after acknowledging the constituent's concern and asking for their address naturally within that conversation — never as a conversation opener. After returning results, present both legislators by name and ask which one the constituent wants to write to before proceeding."*

**`lookup_legislator`** — add to existing description:
> *"Call this after the constituent has shared their concern. After returning results, ask which legislator the constituent wants to write to before searching for bills."*

**`search_bills`** — add to existing description:
> *"Returns bills a legislator introduced or co-sponsored only — this is NOT voting record data and does not show how a legislator voted on bills they did not sponsor. Call this once a specific legislator has been selected. After returning results, present 2–3 relevant bills and wait for explicit confirmation before drafting. Do not draft until the constituent confirms a specific bill or explicitly chooses to proceed without one. If no bills are found, offer to write a message grounded in the constituent's concern without a bill citation — do not fabricate citations."*

---

### Bill URL Formula — Ready to Implement

```typescript
// Pure function — no I/O. Use at response construction time in search-bills.ts.
export function billUrl(id: string, session: string): string {
  return `https://le.utah.gov/~${session.slice(0, 4)}/bills/static/${id}.html`
}
// e.g. billUrl("HB0042", "2026GS") → "https://le.utah.gov/~2026/bills/static/HB0042.html"
// e.g. billUrl("SB0013", "2025S1") → "https://le.utah.gov/~2025/bills/static/SB0013.html"
```

Include in `Bill` type as `billUrl?: string` or compute inline in the tool response. No schema change required.

---

### Widget Architecture Reference

```
wrangler.toml addition:
  [assets]
  directory = "dist"
  binding = "ASSETS"

mcp-agent.ts:
  this.server.registerResource("bill-confirmation-widget", "ui://widget/bill-confirmation/v1", {},
    async () => ({ contents: [{ uri: "ui://widget/bill-confirmation/v1",
      mimeType: "text/html;profile=mcp-app",
      text: await (await this.env.ASSETS.fetch("http://localhost/bill-confirmation.html")).text()
    }]}))

search-bills.ts tool return:
  structuredContent: { bills: result.bills, total: result.count }
  content: [{ type: "text", text: JSON.stringify(result) }]
  _meta: { ui: { resourceUri: "ui://widget/bill-confirmation/v1" } }

widget → ChatGPT (on user selection):
  ui/send_message: "I'd like to write about HB 42 — Education Funding Formula Amendments.
                   Please send it as an email in a casual voice."
```

CSP: `connectDomains: ["agents.getonrecord.org"]`, no `resourceDomains`, no `frameDomains`.

---

### Open Risk: MIME Type

⚠️ **Verify before widget build.** Apps SDK spec uses `text/html;profile=mcp-app`; Cloudflare guide uses `text/html+skybridge`. Run the widget spike in ChatGPT developer mode with `text/html;profile=mcp-app` and confirm iframe renders before committing to the full build.

---

**Research Completion Date:** 2026-04-18
**Sources:** developers.openai.com/apps-sdk, developers.cloudflare.com/agents, le.utah.gov/data/developer.htm, on-record codebase
**Confidence:** High on integration model and architecture; Medium on conversation principle recovery (tool description behavioral influence varies by model); Low on MIME type compatibility (untested)
