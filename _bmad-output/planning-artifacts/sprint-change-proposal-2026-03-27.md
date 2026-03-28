# Sprint Change Proposal
**Date:** 2026-03-27
**Trigger:** Real-world use case insight + strategic platform pivot
**Scope Classification:** Major
**Handoff:** Product Manager / Architect replan

---

## Section 1: Issue Summary

### 1.1 — The Use Case Mismatch

Testing and reflection revealed that the current 4-step flow was designed around an idealized scenario: a constituent writing to their own legislator about a bill that legislator sponsored. Real-world use is fundamentally different.

More common scenario: *"Please oppose Rep Lee's HB88 — it's terrible, and you should vote no."*

The constituent is writing to **their** legislator, but the bill in question was introduced by **someone else**. The constituent may not know — or care about — bills their rep has personally sponsored. They care about what's on the floor, what's moving, what's threatening something they love. The current `search_bills` tool enforces a `legislatorId` filter that makes this entire use case impossible.

This was a model built on Corey's own experience (politically engaged, conveniently has a legislator directly implicated in the legislation he cares about most). That is a low-probability user profile. The modal user is someone who wants to respond to advocacy context they've received elsewhere.

### 1.2 — The Platform Pivot

Getting the tool into users' hands quickly is more important than feature completeness on the custom web frontend. The fastest path to real users is a **ChatGPT App** (custom GPT), where:

- Zero setup friction (no MCP configuration, no BYOLLM explanation)
- Users already have ChatGPT accounts
- Very little UI control is needed or possible — the conversation IS the UI
- The MCP server is the only technical piece that matters at launch

This invalidates the architectural assumption that drove the Next.js web frontend (Epics 5, parts of 6, and all of Epic 4's UI component stories). The custom web UI remains valuable as a landing page and long-term home, but it should not gate the first real-user launch.

### 1.3 — Discovery Context

Identified during test conversations (2026-03-27), after Story 4-3 was placed in `review` status. Stories 4-4 through 4-7 have not yet been started. The window to redirect with minimal rework is now — before any of those stories are implemented.

The MCP bill search redesign research (2026-03-21) already identified the `search_bills` interface problem and proposed a concrete fix. That research is an input to this proposal.

---

## Section 2: Impact Analysis

### 2.1 — Epic Impact

| Epic | Status | Impact |
|---|---|---|
| Epic 1 — Foundation | done | None. Infrastructure, logging, rate limiting, retry utility all remain valid. |
| Epic 2 — Legislator Lookup | done | **Moderate.** `lookup_legislator` must be expanded to support name/district lookup. Address-to-district resolution should become a separate `resolve_address` tool. Both are backward-compatible additions. |
| Epic 3 — Bill Search | done | **Moderate.** `search_bills` must be redesigned to make `legislatorId` optional and add sponsor/session/floor-sponsor filters. Research already done (2026-03-21). Cache layer architecture is sound; this is a tool interface + cache function change. |
| Epic 4 — Draft Flow | in-progress | **Major.** The 4-step structured wizard must be replaced with a rules-based system prompt. 4-3 (in review) should be closed once the new system prompt supersedes it. 4-4 through 4-7 need reconception. 4-6 (UI components) is likely dropped from MVP. |
| Epic 5 — Send Message | backlog | **Defer.** `mailto:` and clipboard copy are web UI delivery actions. In a ChatGPT App, ChatGPT surfaces contact info and the user acts directly. These stories may still be relevant for the long-term web experience but should not block the ChatGPT launch. |
| Epic 6 — Discovery/Onboarding | backlog | **Rethink.** Landing page still needed, but the primary CTA changes from "here's how to set up MCP" to "here's the ChatGPT link." BYOLLM setup content can be a secondary path. |
| Epic 7 — Operator | backlog | None. Observability stories remain as-planned. |
| Epic 8 — Developer | backlog | Minor. Tool documentation stories will need to reflect the updated tool interfaces. |
| Epic E5 — Eval Harness | in-progress | **Minor.** The harness infrastructure is reusable. Test cases will need to be updated once the new system prompt is written. The harness can be used to evaluate the reworked flow. |

### 2.2 — Story Impact

**Stories that must change:**

| Story | Status | What Changes |
|---|---|---|
| 4-3 Medium and Formality Selection | review | Manual test runs (Tasks 2-3) should not be completed. The new system prompt will supersede the existing agent-instructions.md. Status should move to `done` (the formality + medium capture behavior it validated is still needed; the new system prompt will incorporate those learnings). |
| 4-4 Voice-Calibrated Draft Generation | backlog | Needs rewrite — story assumes the 4-step wizard already delivered address and legislator context. New story must accommodate a more open flow. |
| 4-5 Draft Revision Loop | backlog | Largely survives; the revision loop rules (don't restart the flow, preserve citations) remain valid regardless of platform. Minor rewrite only. |
| 4-6 ProgressStrip and DraftCard UI Components | backlog | **Drop from MVP.** These are web UI components incompatible with the ChatGPT App model. Defer to post-launch web experience. |
| 4-7 System Prompt Token Footprint Optimization | backlog | Remains relevant — ChatGPT has context window considerations. Keep but may need reframing. |

**New stories needed (see Section 3 for detail):**

| Proposed Story | Epic | Notes |
|---|---|---|
| `resolve_address` MCP tool | Epic 2 | Split address-to-district from legislator lookup |
| Enhanced `lookup_legislator` | Epic 2 | Add name/district/committee search modes |
| `search_bills` interface redesign | Epic 3 | Make `legislatorId` optional; add sponsor/session/floor-sponsor filters |
| Reworked system prompt (rules-based) | New Epic 4 | Replace 4-step wizard with behavioral rules for ChatGPT App |
| ChatGPT App configuration | New Epic 4 | GPT tool configuration, system prompt upload, public publishing |

### 2.3 — Artifact Conflicts

**PRD:**
- FR6, FR7, FR8, FR11 specify bills filtered "to a specific legislator." These FRs need to be updated to reflect that legislator-filtering is optional, not required.
- FR13 specifies "2–3 issue framings derived from the legislator's record" — this must be generalized to allow bill discovery without a constituent's specific legislator as anchor.
- FR25, FR26 specify Claude.ai and ChatGPT as the verified platforms — ChatGPT App is a different mode from connecting MCP tools to ChatGPT manually. FR25/FR26 should be updated.
- MVP Strategy section: "BYOLLM" framing should acknowledge ChatGPT App as the primary launch path.

**Architecture:**
- The address-to-district resolution responsibility is currently embedded in `lookup_legislator`. This needs to be split.
- `SearchBillsParams` type contract needs to change (all filters become optional).
- The web frontend as the "primary constituent interface" assumption is now secondary to the ChatGPT App.

**UX Design Specification:**
- The 4-step progress strip and flow diagrams are built around the structured wizard. These remain valuable for the web experience but no longer govern the primary launch path.

**System Prompt:**
- `system-prompt/agent-instructions.md` must be completely rewritten — the 4-step wizard is replaced with a rules-based approach (see Section 3 for the new behavioral rules).

### 2.4 — Technical Impact

**MCP tool changes required (no new dependencies, no schema migration):**

1. `resolve_address` — new tool, extracted from `lookup_legislator`. Takes `{street, zone}`, returns district identifiers + session. All GIS logic already exists; this is a refactor + new tool registration.

2. `lookup_legislator` — new optional search modes: `byName` (partial match on legislator name), `byDistrict` (chamber + district number). Currently only operates by address. `LookupLegislatorResult` type shape is likely unchanged.

3. `search_bills` — redesign per the 2026-03-21 research document. `legislatorId` becomes `sponsorId?: string`; add `session?: string`, `floorSponsorId?: string`. Cache function signature changes from `searchBillsByTheme(sponsorId, theme)` to `searchBills(params: SearchBillsParams)`. `SearchBillsResult` type in `packages/types/` changes (remove required `legislatorId` field). Impact on `apps/web`: `SearchBillsResult.legislatorId` is used in BillCard rendering — needs to become optional.

---

## Section 3: Recommended Approach — Direct Adjustment + MVP Scope Reduction

### 3.1 — Selected Path: Option 1 (Direct Adjustment) + Option 3 (MVP Scope Reduction)

**Option 1 (Direct Adjustment):** Modify existing stories and add new ones within the restructured plan. The MCP tool layer (Epics 1-3) is solid; it needs interface evolution, not rearchitecting. The system prompt layer (Epic 4) needs a rewrite, not a restart.

**Option 3 (MVP Scope Reduction):** Remove Epic 4-6 (web UI components) from MVP. Defer Epic 5 (send actions web UI). Refocus Epic 6 on a minimal landing page that directs users to the ChatGPT App rather than explaining BYOLLM setup.

**Hybrid rationale:** The tool layer changes are Medium scope (well-understood from the 2026-03-21 research). The system prompt rewrite is High-effort creative/product work. The scope reduction is necessary to make the ChatGPT App launch achievable without the web frontend being complete.

### 3.2 — Effort and Risk

| Change Area | Effort | Risk | Notes |
|---|---|---|---|
| `resolve_address` tool (refactor) | Low | Low | Extracts existing GIS logic; no new behavior |
| `lookup_legislator` name/district search | Medium | Low | New query modes; same result type |
| `search_bills` redesign | Medium | Low | Research done; adds "all bills" mode; FTS5 still available for cross-legislator search |
| System prompt rewrite (rules-based) | High | Medium | Core product work; behavioral testing still required |
| ChatGPT App configuration + publish | Medium | Medium | Platform-specific; requires testing across GPT behavior |
| PRD + epic file updates | Medium | Low | Documentation work |
| Drop/defer Epic 5 + 4-6 | Low | Low | No work to undo; stories are backlog |

### 3.3 — Timeline Impact

The ChatGPT App path **accelerates** time-to-real-users because:
- No web frontend required for first launch
- No BYOLLM setup friction for users
- The MCP server + system prompt + GPT config is a smaller deliverable set

The tradeoff: the custom web experience (ProgressStrip, DraftCard, SendActions, ReadingPreferences) becomes a Phase 2 target.

---

## Section 4: Detailed Change Proposals

### 4.1 — New Behavioral Rules for System Prompt

The 4-step wizard is replaced by a set of behavioral rules. The conversation can flow in any order but must satisfy these invariants before generating a draft:

**Core Rules (non-negotiable):**

1. **Empathy and validation first.** Before any legislative research, acknowledge the constituent's experience and feelings. Their personal story is the anchor for everything that follows. "Validate before inform" remains the core UX principle.

2. **Link action to lived experience.** Whatever legislative action is cited must connect back to how it affects the constituent or people they care about. The draft must not be a dry legislative summary.

3. **Substantiation required.** Make the strongest claim the retrieved data supports — no more, no less. If data supports a pattern ("you've sponsored three bills restricting Medicaid access across two sessions"), name it. If data supports only one specific act, cite that act. If data supports nothing, write around the constituent's experience without attributing any legislative record. Never assert a position the tools didn't return. The zero-result path produces a letter grounded entirely in the constituent's concern — no fabricated citations, no inferred positions.

4. **No editorializing.** Present the legislator's record objectively. "Voted no on SB 22" is acceptable. "Clearly doesn't care about working families" is not. Intent, motivation, and character judgments are forbidden.

5. **Medium and formality are required inputs.** Capture both before drafting. Mirror the constituent's voice.

**New flow capability (vs. old wizard):**

The constituent may arrive knowing a specific bill by number, a legislator by name (not their own), a general issue area, or nothing at all. The system prompt must handle all entry points without forcing a rigid sequence. `resolve_address` is for address-to-district resolution; `lookup_legislator` surfaces contact info and legislator details — both remain useful even when the constituent knows who they're writing to, since contact info still needs to be retrieved.

6. **Sponsored bills only.** The tools surface bills a legislator sponsored or co-sponsored. They do not surface how a legislator voted on bills introduced by others. Do not imply otherwise.

**Bill discovery strategy:**

When a specific legislator is known and the constituent has not arrived with a specific bill in mind, call `search_bills({ sponsorId })` to load their full bill list and reason over it directly. The LLM is better at semantic relevance than FTS5. Theme/keyword search (`query`) is the right tool when searching across all legislators (finding a specific bill by number or subject without a known sponsor).

### 4.2 — `search_bills` Interface Redesign

```
Story: [3.5 + new] search_bills MCP Tool — Interface Redesign
Section: Tool parameter schema

OLD:
{ legislatorId: string (required), theme: string (required) }

NEW — all parameters are optional filters; any combination restricts results:
{
  query?: string          // freeform FTS5 full-text search (title/summary)
  billId?: string         // normalized bill ID match — strips/pads zeros and normalizes prefix
                          // "HB88" matches HB0088, HB088, etc. regardless of zero-padding
                          // combine with chamber to narrow when chamber is known;
                          // if chamber is unknown, put the number in query instead
  sponsorId?: string      // filter to bills sponsored by this legislator
  floorSponsorId?: string // filter by floor sponsor
  session?: string        // filter to a specific session (e.g. "2026GS")
  chamber?: 'house' | 'senate'  // filter to one legislative chamber
  count?: number          // page size; default 50, max 100
  offset?: number         // pagination offset; default 0
}
```

**No required parameters.** Any filter may be omitted; omitting all returns all cached bills (paginated). Filters compose — e.g. `{ sponsorId, session }` returns all bills that legislator sponsored in that session.

**Cache layer dispatch:**
- `billId` provided → direct equality lookup; other filters still apply
- `query` provided → FTS5 MATCH with any provided filters as WHERE clauses
- Neither provided → direct table scan with any provided filters as WHERE clauses

**When a specific legislator is known and no specific bill was provided, the no-query path is preferred.** Call `search_bills({ sponsorId })` to load their full bill list and let the LLM reason over it directly. Theme keyword search was an approximation of LLM reasoning — with a full bill list in context, the LLM can identify relevant bills semantically, recognize patterns across sessions, and make proportional claims from complete data. Utah legislators typically sponsor 10–30 bills per session; well within context window limits.

Cache function: `searchBills(params: SearchBillsParams): SearchBillsResult` replaces `searchBillsByTheme(sponsorId, theme)`.

`SearchBillsResult` in `packages/types/`:

```typescript
{
  bills: Bill[]     // page of results
  total: number     // total matching records (for pagination)
  offset: number    // offset used for this page
  count: number     // number of bills returned in this page
}
```

Remove required `legislatorId` field from result. The caller always knows what filters they passed.

**Rationale:** The Epic 3 retrospective and the 2026-03-21 research both identified the required `legislatorId` and the `THEME_QUERIES` expansion map as blocking design errors. Making all params optional filters produces a composable, self-consistent interface — each param narrows results regardless of what other params are present. Pagination makes the "all bills" mode safe at any scale.

### 4.3 — `resolve_address` New Tool

```
Story: [new story in Epic 2] resolve_address MCP Tool
Section: Tool definition

OLD: Address-to-district resolution is embedded inside lookup_legislator

NEW: Separate tool
Name: resolve_address
Input: { street: string, zone: string }
Output: {
  houseDistrict: number,
  senateDistrict: number,
  resolvedAddress: string   // string (existing type — geocoder's canonical form of the address)
}
```

District boundaries come from GIS data on a redistricting cycle, not a legislative session cycle — the current Utah map is valid 2022–2032. Session context is not meaningful here and is dropped from the output. The LLM gets district numbers; `search_bills` handles session logic internally.

**Rationale:** The current `lookup_legislator` bundles two responsibilities: GIS resolution and legislator data retrieval. Separating them makes each tool independently useful. `resolve_address` returns district identifiers; a follow-up `lookup_legislator({ chamber, district })` retrieves contact info. The LLM can also call `lookup_legislator` directly by name without ever needing an address.

### 4.4 — `lookup_legislator` Enhancement

```
Story: [modify Epic 2] lookup_legislator — Add Name/District Search Modes
Section: Tool parameter schema

OLD: { street: string, zone: string }

NEW — address resolution removed (now in resolve_address); two independent search modes:
{
  // Mode A — name search
  name?: string                    // partial match on legislator name

  // Mode B — district lookup (chamber and district are a required pair)
  chamber?: 'house' | 'senate'
  district?: number                // required when chamber is provided, and vice versa
}
```

At least one mode must be provided. Chamber and district are always a required pair — there is no meaningful "House District 14" without specifying the chamber, and district numbers do not overlap between chambers.

**Rationale:** Address resolution is now in `resolve_address`. `lookup_legislator` is purely for retrieving legislator contact info and details. A constituent who knows their rep by name — or an LLM that has district identifiers from `resolve_address` — can retrieve contact info directly without an address.

### 4.5 — Epic 4 Restructure

```
Epic 4: Revised Story Breakdown

KEEP (with modifications):
  4-1: System Prompt and Behavioral Rules (DONE — but needs full rewrite of agent-instructions.md)
  4-2: Empathetic Issue Discovery (DONE — core behavior unchanged)
  4-3: Medium and Formality Selection (REVIEW → DONE — learnings incorporated into new prompt)
  4-4: Voice-Calibrated Draft Generation (BACKLOG — rewrite to accommodate open-flow)
  4-5: Draft Revision Loop (BACKLOG — minor changes only)
  4-7: System Prompt Token Optimization (BACKLOG — reframe for ChatGPT context)

DROP FROM MVP:
  4-6: ProgressStrip and DraftCard UI Components — web UI incompatible with ChatGPT App model

ADD:
  4-X: ChatGPT App Configuration and Publishing
       — GPT tool connections (resolve_address, lookup_legislator, search_bills)
       — System prompt upload and GPT configuration
       — Public GPT publishing and verification testing
       — End-to-end testing across realistic use cases (including "oppose someone else's bill")
```

### 4.6 — PRD Updates Required

| FR | Current Text | Required Change |
|---|---|---|
| FR6 | "bills sponsored or co-sponsored by a specific Utah legislator" | Add: "or any bill by session/theme when no specific legislator is provided" |
| FR7 | "the identified legislator's vote record" | Clarify: vote record = bill outcome for sponsored bills only. Full voting record (how a legislator voted on others' bills) is deferred to the OpenStates data source migration — the cache layer survives unchanged. |
| FR8 | "filtered to a specific legislator" | Change: `sponsorId` is optional filter; tool can search all bills |
| FR13 | "2–3 issue framings derived from the legislator's record" | Generalize: framings can derive from any relevant bills, not only the constituent's legislator's sponsored bills |
| FR25/FR26 | "Claude.ai and ChatGPT" platform verification | Add ChatGPT App (custom GPT) as first-class verified platform |
| MVP Strategy | "BYOLLM" as primary model | Update: ChatGPT App is primary launch path. Parallel effort to qualify for Anthropic's Claude app/extension marketplace. BYOLLM (manual MCP setup) remains a fallback path but is no longer the primary onboarding story. |

---

## Section 5: Implementation Handoff

### 5.1 — Change Scope Classification

**Major** — Fundamental replan across Epic 4, PRD updates, and tool interface changes across multiple done epics. Requires PM/Architect review before dev resumes.

### 5.2 — Handoff Recipients and Responsibilities

**Product Manager (Corey):**
- Approve or adjust the PRD FR updates (Section 4.6)
- Confirm the new behavioral rules for the system prompt (Section 4.1)
- Decide on ChatGPT App as primary launch path vs. BYOLLM parity
- Close story 4-3 (mark done — learnings captured, manual test completion not needed given system prompt rewrite)

**Solution Architect / SM (BMAD workflows):**
- Update `epics.md`: restructure Epic 4 per Section 4.5
- Create new story files for: `resolve_address` tool, `lookup_legislator` enhancement, `search_bills` redesign, ChatGPT App config
- Revise story 4-4 and 4-5 to accommodate open-flow model
- Update `sprint-status.yaml` to reflect dropped/deferred stories
- Update `architecture.md` to reflect tool atomicization and ChatGPT App as primary deployment target

**Development team (sequential, per story-workflow):**
- Implement tool changes per the new story files (order: `search_bills` redesign → `resolve_address` → `lookup_legislator` name/district → new system prompt)
- Rewrite `system-prompt/agent-instructions.md` per the behavioral rules in Section 4.1

### 5.3 — Success Criteria

- [ ] `search_bills` accepts calls without `legislatorId` and returns relevant results
- [ ] `resolve_address` is a distinct tool callable independently of legislator lookup
- [ ] `lookup_legislator` accepts name and district as search inputs
- [ ] New system prompt handles all three entry-point scenarios: specific bill known, legislator-scoped concern, and general concern
- [ ] ChatGPT App is configured, published, and end-to-end tested
- [ ] "Oppose Rep Lee's HB88" use case works end-to-end in the ChatGPT App
- [ ] Core behavioral rules hold: empathy first, citation required, no editorializing

### 5.4 — Stories Not to Start Until This Proposal Is Approved

- Story 4-4 (do not start — spec will change)
- Story 4-5 (do not start — dependency on new system prompt)
- Story 4-6 (drop from sprint — do not start)
- Story 4-7 (hold until new system prompt is written)
- Epic 5 stories (defer — not on critical path for ChatGPT App launch)

---

## Appendix: Checklist Completion Status

| Section | Status |
|---|---|
| 1.1 Identify triggering issue | [x] Done |
| 1.2 Define core problem | [x] Done |
| 1.3 Assess impact + evidence | [x] Done |
| 2.1 Current epic impact | [x] Done |
| 2.2 Required epic changes | [x] Done |
| 2.3 Future epic impact | [x] Done |
| 2.4 Epic invalidation check | [x] Done — 4-6 dropped |
| 2.5 Epic resequencing | [x] Done — see section 4.5 |
| 3.1 PRD conflicts | [x] Done |
| 3.2 Architecture conflicts | [x] Done |
| 3.3 UX spec conflicts | [x] Done — web flow deferred |
| 3.4 Other artifacts | [x] Done — E5 harness flagged |
| 4.1 Option 1 (Direct Adjustment) | [x] Viable — recommended |
| 4.2 Option 2 (Rollback) | [x] Not viable — no completed work to undo |
| 4.3 Option 3 (MVP Review) | [x] Viable — adopted partially (scope reduction) |
| 4.4 Selected path + rationale | [x] Done |
| 5.1 Issue summary | [x] Done |
| 5.2 Epic + artifact impact | [x] Done |
| 5.3 Recommended path | [x] Done |
| 5.4 PRD MVP impact | [x] Done |
| 5.5 Handoff plan | [x] Done |
