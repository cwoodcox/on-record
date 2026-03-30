---
validationTarget: '_bmad-output/planning-artifacts/prd.md'
validationDate: '2026-03-29'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md'
validationStepsCompleted:
  - step-v-01-discovery
  - step-v-02-format-detection
  - step-v-03-density-validation
  - step-v-04-brief-coverage-validation
  - step-v-05-measurability-validation
  - step-v-06-traceability-validation
  - step-v-07-implementation-leakage-validation
  - step-v-08-domain-compliance-validation
  - step-v-09-project-type-validation
  - step-v-10-smart-validation
  - step-v-11-holistic-quality-validation
  - step-v-12-completeness-validation
validationStatus: COMPLETE
holisticQualityRating: '4/5 - Good'
overallStatus: Warning
---

# PRD Validation Report

**PRD Being Validated:** `_bmad-output/planning-artifacts/prd.md`
**Validation Date:** 2026-03-29

## Input Documents

- PRD: `prd.md` ✓
- Research directory: available for reference during validation

## Validation Findings

## Format Detection

**PRD Structure (## Level 2 headers):**
1. Executive Summary
2. Success Criteria
3. Product Scope
4. User Journeys
5. Domain-Specific Requirements
6. Innovation & Novel Patterns
7. Web Application Requirements
8. Functional Requirements
9. Non-Functional Requirements
10. Traceability Matrix

**BMAD Core Sections Present:**
- Executive Summary: Present ✓
- Success Criteria: Present ✓
- Product Scope: Present ✓
- User Journeys: Present ✓
- Functional Requirements: Present ✓
- Non-Functional Requirements: Present ✓

**Format Classification:** BMAD Standard
**Core Sections Present:** 6/6

## Information Density Validation

**Anti-Pattern Violations:**

**Conversational Filler:** 0 occurrences

**Wordy Phrases:** 0 occurrences

**Redundant Phrases:** 0 occurrences

**Total Violations:** 0

**Severity Assessment:** Pass

**Recommendation:** PRD demonstrates excellent information density with zero violations. Every sentence carries weight without filler.

## Product Brief Coverage

**Status:** N/A - No Product Brief was provided as input

## Measurability Validation

### Functional Requirements

**Total FRs Analyzed:** 40

**Format Violations:** 0

**Subjective Adjectives Found:** 0

**Vague Quantifiers Found:** 0

**Implementation Leakage:**

- **FR27 — Warning:** Two issues:
  1. `"system prompt"` is implementation leakage — a system prompt is a specific LLM mechanism, not a user-observable capability
  2. `"4-step civic drafting flow"` is stale — the sprint change proposal (2026-03-27) explicitly replaced the 4-step wizard with a rules-based behavioral approach. FR27 has not been updated to reflect this. Recommended: rewrite FR27 around the rules-based system instructions and the ChatGPT Apps SDK as the delivery vehicle.

- **Informational references** (do not affect measurability): FR7 references "Utah Legislature API", "OpenStates data source migration", and "cache layer" in an explanatory clause; FR8 names database fields ("title, summary, or subject tags"); FR10 describes caching mechanism; FR11 includes implementation guidance ("without requiring a full session scan"); FR13 references "in the cache"; FR23 names "clipboard" as the delivery mechanism; FR36 names "Utah Legislature API" in an FR body; FR38 references "cache refresh schedule" and "data-provider configuration".

**FR Violations Total:** 1 warning

---

### Non-Functional Requirements

**Total NFRs Analyzed:** 18

**Missing Metrics:** 0

**Incomplete Template:** 0

**Implementation Leakage / Misalignment:**

- **NFR13 — Warning:** Verifies MCP spec compliance via "successful tool invocation in Claude.ai and ChatGPT at time of release." This targets the manual BYOLLM connection mode. With FR25/FR26 now establishing the ChatGPT Apps SDK as the primary verified platform, NFR13's verification target is misaligned. Recommended: update verification to include the published ChatGPT App as the primary verification target.

- **Informational:** NFR6 references "server-side configuration" as a storage mechanism (minor implementation detail).

**NFR Violations Total:** 1 warning

---

### Overall Measurability Assessment

**Total Requirements:** 58 (40 FRs + 18 NFRs)
**Warning-Level Violations:** 2 (FR27, NFR13)
**Informational Notes:** 8

**Severity: Warning**

**Recommendation:** Two requirements need targeted updates. FR27 requires a content rewrite to reflect the rules-based approach and remove the stale 4-step reference. NFR13 requires a verification target update to align with the ChatGPT Apps SDK primary platform. Remaining informational notes are acceptable context; no measurability impact.

## Traceability Validation

### Chain Validation

**Executive Summary → Success Criteria:** Intact. Vision (credible/specific constituent contact, constituent visibility) maps cleanly to all three success dimensions (User, Business, Technical).

**Success Criteria → User Journeys:** Intact. Return usage and press coverage are flagged in the PRD as lagging indicators — no dedicated journey required, correctly scoped.

**User Journeys → Functional Requirements:** Intact — all 40 FRs appear in the traceability matrix with no orphans.

**Scope → FR Alignment:** Gap identified (see below).

### Orphan Elements

**Orphan Functional Requirements:** 0

**Unsupported Success Criteria:** 0

**User Journeys Without FRs:** 0

### Issues Found

**Warning — Missing FR: ChatGPT App publication and discovery**
The MVP Strategy establishes the ChatGPT Apps SDK as the primary launch path and the sprint change proposal (Section 4.5) explicitly lists "ChatGPT App Configuration and Publishing" as a required new story. FR25/FR26 verify tool invocation within a published app, but no FR covers the act of configuring, publishing, and making the app discoverable in the ChatGPT app store — i.e., the capability that a user can find and install the app without any manual MCP configuration. This is the core zero-friction premise of the platform pivot and should have its own FR.

**Informational — NFR12 absent from traceability matrix**
NFR12 (mobile tap targets ≥ 44×44px) has no row in the traceability matrix. Should be linked to J1/J2 — first users are on phones immediately after PAC meetings; mobile accessibility directly supports the primary constituent journeys.

**Informational — Traceability matrix row label is stale**
Row "BYOLLM / MCP platform interoperability" covers FR25–FR27 and FR40. With the primary platform now being the ChatGPT Apps SDK (not BYOLLM), the label should be updated to reflect the new primary path.

### Overall Traceability Assessment

**Total Traceability Issues:** 1 warning, 2 informational
**Severity: Warning**

**Recommendation:** Add a new FR capturing the ChatGPT App configuration, publishing, and app store discovery capability — this is the primary deliverable of the platform pivot and the key zero-friction claim. Update the traceability matrix row label and add NFR12 to the matrix.

## Implementation Leakage Validation

### Leakage by Category

**Frontend Frameworks:** 0 violations
All framework references (React, Vue, Svelte, Vercel, Netlify) appear only in Web Application Requirements → Hosting — the correct section.

**Backend Frameworks:** 0 violations

**Databases:** 0 violations

**Cloud Platforms:** 0 violations

**Infrastructure:** 0 violations

**Libraries:** 0 violations
All library references (Clipboard API, mailto:) appear only in Scope and Integration Requirements sections — not in FRs/NFRs.

**Other Implementation Details:** 1 borderline
- FR23: "copy a draft text/SMS message to their clipboard" — "clipboard" names the delivery mechanism. Minimal impact; the user-observable behavior is clear. Accepted as informational (already noted in Measurability check).
- FR27: "system prompt" leakage already captured in Measurability Validation.

### Summary

**Total Implementation Leakage Violations:** 1 (FR27, already flagged)
**Informational Notes:** 1 (FR23 "clipboard")

**Severity: Pass**

**Recommendation:** No new implementation leakage beyond what was already identified in the Measurability check. PRD is clean across all major leakage categories. FR27 correction (already flagged) will resolve the one remaining violation.

## Domain Compliance Validation

**Domain:** govtech
**Complexity:** High (regulated)

### Required Special Sections — Compliance Matrix

| Requirement | Status | Notes |
|---|---|---|
| Procurement compliance | Met ✓ | Explicitly N/A — free, open-source, no RFP/vendor certification |
| Security clearance | Met ✓ | Explicitly N/A — no classified data or government network access |
| Accessibility standards | Met ✓ | Section 508 scoped out (not federally procured); WCAG 2.1 AA in scope; backed by NFR11/NFR12 |
| Transparency requirements | Met ✓ | Dedicated section: AI disclosure, data sourcing, non-editorializing, data practices |
| Privacy | Met ✓ | Compliance & Regulatory section + NFR7 |
| FedRAMP | Not addressed | FedRAMP is clearly N/A (not a cloud service operated for or by federal agencies), but not explicitly scoped out. The other govtech categories all receive explicit N/A treatment — FedRAMP should too for completeness. |

### Summary

**Required Sections Present:** 4/4 ✓
**Compliance Gaps:** 0
**Informational Notes:** 1 (FedRAMP not explicitly scoped out)

**Severity: Pass**

**Recommendation:** All required GovTech compliance sections are present and adequately documented. Add a one-line FedRAMP N/A statement to the Govtech Compliance Scope section for completeness, consistent with the treatment of Section 508, procurement, and data residency.

## Project-Type Compliance Validation

**Project Type:** web_app

### Required Sections

| Section | Status | Location |
|---|---|---|
| browser_matrix | Present ✓ | Web Application Requirements → Browser & Device Support |
| responsive_design | Present ✓ | Web Application Requirements → Responsive Design |
| performance_targets | Present ✓ | NFR1–NFR4 |
| seo_strategy | Present ✓ | Web Application Requirements → SEO & Discoverability; FR30 |
| accessibility_level | Present ✓ | NFR11 (WCAG 2.1 AA), NFR12 (44×44px tap targets) |

### Excluded Sections (Should Not Be Present)

- native_features: Absent ✓
- cli_commands: Absent ✓

### Compliance Summary

**Required Sections:** 5/5 present
**Excluded Sections Present:** 0

**Severity: Pass**

**Recommendation:** All required web_app sections present. No excluded sections found.

## SMART Requirements Validation

**Total Functional Requirements:** 40

### Scoring Summary

**All scores ≥ 3:** 97.5% (39/40)
**All scores ≥ 4:** 92.5% (37/40)
**Overall Average Score:** ~4.8/5.0

### Flagged FRs (any score < 4)

| FR | S | M | A | R | T | Avg | Issue |
|---|---|---|---|---|---|---|---|
| FR11 | 3 | 5 | 5 | 5 | 5 | 4.6 | "without requiring a full session scan" is a HOW constraint embedded in a WHAT statement |
| FR27 | 2 | 4 | 3 | 3 | 4 | 3.2 | Stale "4-step civic drafting flow" reference; "system prompt" implementation leakage; relevance and attainability uncertain given rules-based pivot |
| FR30 | 5 | 5 | 3 | 5 | 5 | 4.6 | Top-20 organic ranking is aspirational with high external dependency on search algorithms |

All other 37 FRs scored ≥ 4 on all SMART dimensions.

### Improvement Suggestions

**FR11:** Remove "without requiring a full session scan" — this is implementation guidance, not user-observable capability. Rewrite as: "The system can retrieve all bills associated with a specific legislator, returning results in under 2 seconds."

**FR27:** Full rewrite required. The 4-step wizard is being replaced by a rules-based behavioral approach (sprint change proposal). Suggested direction: "The system can provide behavioral instructions that guide a connected AI assistant to execute the constituent engagement flow — empathy-first, citation-required, non-editorializing — without manual intervention, verified by successful end-to-end completion across at least 4 of 5 independent test runs in the ChatGPT App."

**FR30:** Consider softening the attainability language: "targeting top-20 organic ranking for at least 2 of the 3 target keyword phrases within 6 months of launch, subject to search algorithm conditions." Alternatively, document this as a business goal rather than a system requirement.

### Overall Assessment

**Flagged FRs:** 3/40 (7.5%)

**Severity: Pass** (< 10% flagged)

**Recommendation:** FR quality is excellent overall. FR27 needs a priority rewrite (lowest SMART score, most stale content). FR11 benefits from removing the implementation constraint. FR30 is acceptable as-is but can be softened.

## Holistic Quality Assessment

### Document Flow & Coherence

**Assessment:** Good

**Strengths:**
- Executive Summary opens with compelling "why it exists" narrative; "form letters get ignored" establishes theory of change memorably
- User Journeys (Deb, Marcus) are rich with emotional stakes and real UX detail
- Logical flow from vision → success → scope → journeys → domain requirements → FRs
- Risk Mitigation sections are thoughtful and honest about unknowns
- Theory of change (specificity as civic mechanism) is articulated clearly throughout

**Areas for Improvement:**
- Journey 1 (Deb) still shows her opening Claude.ai for BYOLLM setup as the primary flow; the ChatGPT Apps SDK path — zero-friction, app store install — is the new primary path but has no journey representation. Downstream UX design and system prompt writing will draw from these journeys and produce designs for the wrong platform.

### Dual Audience Effectiveness

**For Humans:**
- Executive-friendly: Excellent. Vision, differentiator, and success criteria are immediately clear.
- Developer clarity: Good. Technical Constraints, Integration Requirements, and FR verification criteria give developers clear targets.
- Designer clarity: Partial. Journey narratives are rich but reflect old BYOLLM platform; ChatGPT App UI context is absent.
- Stakeholder decision-making: Good. Product Scope phasing and risk mitigations support clear decisions.

**For LLMs:**
- Machine-readable structure: Excellent. Consistent ## headers, numbered FR/NFR IDs, traceability matrix.
- UX readiness: Partial. Rich journey detail but old platform model.
- Architecture readiness: Good. NFRs are specific with measurement methods; domain constraints are well-documented.
- Epic/Story readiness: Very good. FR groupings and traceability matrix make epic breakdown straightforward.

**Dual Audience Score:** 4/5

### BMAD PRD Principles Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Information Density | Met ✓ | Zero violations detected |
| Measurability | Partial | FR27 stale/leakage; NFR13 platform misalignment |
| Traceability | Partial | Missing ChatGPT App publication FR; matrix row label stale; NFR12 absent from matrix |
| Domain Awareness | Met ✓ | Comprehensive GovTech compliance section |
| Zero Anti-Patterns | Met ✓ | Zero anti-pattern violations |
| Dual Audience | Partial | User Journeys still describe BYOLLM flow; ChatGPT App experience not represented |
| Markdown Format | Met ✓ | Consistent ## headers, tables, clean formatting throughout |

**Principles Fully Met:** 4/7

### Overall Quality Rating

**Rating: 4/5 — Good**

This is a strong PRD that would serve well for downstream UX design, architecture, and epic planning. The platform pivot has been partially propagated (MVP Strategy, FR25/FR26) but hasn't yet reached the User Journey narratives, which are what downstream agents primarily draw from. Resolving that gap would lift this to Excellent.

### Top 3 Improvements

1. **Update Journey 1 (and possibly Journey 2) for the ChatGPT Apps SDK primary path**
   Journey 1 currently shows Deb opening Claude.ai through BYOLLM setup. The new primary experience is finding the app in the ChatGPT app store and starting a conversation with zero configuration. This is the most impactful improvement — journeys are the input to UX design, system prompt writing, and epic planning. A misaligned journey propagates forward.

2. **Rewrite FR27 for the rules-based behavioral approach**
   FR27 is the single lowest-scoring FR (3.2 SMART average). The stale "4-step civic drafting flow" reference and "system prompt" leakage make it misleading for dev agents. A rewrite describing the behavioral rules capability — empathy-first, citation-required, non-editorializing — with the ChatGPT App as the primary verification target would both fix the staleness and improve SMART quality.

3. **Add FR for ChatGPT App publication and zero-friction discovery**
   The zero-friction premise ("a user can find and install the app without any MCP configuration") is the core value proposition of the platform pivot. It currently has no FR. FR25/FR26 verify tool invocation within a published app, but don't capture the publishing, app store configuration, or user discovery experience itself.

### Summary

**This PRD is:** A high-quality, dense, well-traced document that is partially coherent with the platform pivot — strong enough for downstream use, but the User Journeys and FR27 need updating to fully reflect the ChatGPT Apps SDK as the primary launch path.

**To make it great:** Propagate the platform pivot into the journey narratives and rewrite FR27.

## Completeness Validation

### Template Completeness

**Template Variables Found:** 0 — No template variables remaining ✓

### Content Completeness by Section

**Executive Summary:** Complete ✓
**Success Criteria:** Complete ✓ — all criteria measurable with specific targets
**Product Scope:** Complete ✓ — MVP, Growth, Expansion phases; explicit out-of-MVP list; risk mitigations
**User Journeys:** Partial — 4 journeys cover all user types (constituent, operator, developer) but none represents the ChatGPT Apps SDK primary experience (zero-friction app store install and first interaction)
**Domain-Specific Requirements:** Complete ✓
**Innovation & Novel Patterns:** Complete ✓
**Web Application Requirements:** Complete ✓
**Functional Requirements:** Partial — 40 FRs present; missing FR for ChatGPT App publication and app store discovery
**Non-Functional Requirements:** Complete ✓ — all 18 NFRs have specific metrics and measurement methods
**Traceability Matrix:** Complete ✓ (minor label staleness noted in traceability check)

### Section-Specific Completeness

**Success Criteria Measurability:** All measurable ✓
**User Journeys Coverage:** Partial — user types covered; ChatGPT App primary experience missing
**FRs Cover MVP Scope:** Partial — ChatGPT App publication FR missing
**NFRs Have Specific Criteria:** All 18 have specific criteria ✓

### Frontmatter Completeness

**stepsCompleted:** Present ✓
**classification:** Present ✓ (domain: govtech, projectType: web_app, complexity: high)
**inputDocuments:** Present ✓ (empty — no input documents used)
**date:** Present ✓ (created: 2026-02-18, lastEdited: 2026-03-29)

**Frontmatter Completeness:** 4/4 ✓

### Completeness Summary

**Overall Completeness:** 95% (8/10 sections fully complete; 2 partial)
**Critical Gaps:** 0
**Notable Gaps:** 2 (missing ChatGPT App journey; missing ChatGPT App publication FR)

**Severity: Warning**

**Recommendation:** No template variables. All sections present and substantially complete. Two content gaps from the platform pivot should be addressed: add a user journey for the ChatGPT Apps SDK zero-friction experience, and add an FR for app publication and app store discovery.
