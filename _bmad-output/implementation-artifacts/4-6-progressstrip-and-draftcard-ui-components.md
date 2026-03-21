# Story 4.6: ProgressStrip and DraftCard UI Components

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to see where I am in the flow and have my draft displayed in a clear, formatted card with the citation pill visible,
so that I can review the output confidently before I decide to send.

## Parallelization Note

This story is **independent of Stories 4.4 and 4.5** and can be implemented before them. Rationale:

- `ProgressStrip` takes only a `currentStep: 1|2|3|4` prop — no dependency on draft generation logic
- `DraftCard` takes a `draftBody: string` prop — it is a display component that does not care how the draft was produced
- Both components can be built and fully unit-tested with mock/fixture props without 4.4 or 4.5 being in place
- Integration into the live chatbot flow (wiring 4.4's output to DraftCard) is 4.4's scope, not 4.6's

## Acceptance Criteria

### ProgressStrip

1. **Given** the constituent is anywhere in the core flow, **when** `ProgressStrip` renders with `currentStep={n}`, **then** it shows exactly 4 segments labeled (in order): `Address`, `Your Rep`, `Your Issue`, `Send`

2. **Given** `ProgressStrip` renders, **when** inspected, **then** the root element is `<nav aria-label="Form progress">` and the segment with index matching `currentStep` carries `aria-current="step"` — no other segment carries `aria-current="step"`

3. **Given** `currentStep={3}` (for example), **when** `ProgressStrip` renders, **then** steps 1 and 2 appear visually completed (amber fill / `bg-on-record-accent` or equivalent), step 3 is active (white / `bg-white`), and step 4 is dim (muted opacity / `opacity-40` or equivalent) — using only Tailwind design tokens, no hardcoded hex values

4. **Given** the constituent is on the landing page or the post-send success state, **when** the parent conditionally renders `ProgressStrip`, **then** it must be possible to hide `ProgressStrip` entirely (the component itself accepts any `className` or is simply not rendered — hiding is parent-controlled, not built into the component)

5. **Given** viewport width < 640px (mobile), **when** `ProgressStrip` renders, **then** segment text collapses to icon-only (or abbreviated) indicators with only the current step labeled; at ≥ 640px (sm breakpoint), all four labels are visible — implemented via Tailwind `sm:` responsive classes (no JavaScript resize logic)

6. **Given** the ProgressStrip component, **when** keyboard focus is on the active step indicator, **then** focus ring appears: 2px solid amber, 2px offset (Tailwind `focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2`); step segments are NOT interactive buttons (no `onClick`) — they are purely informational nav landmarks

### DraftCard

7. **Given** a draft has been generated, **when** `DraftCard` renders with `medium="email"` and `formality="conversational"`, **then** it displays a medium badge labeled `Email` and a formality badge labeled `Conversational` in the header row

8. **Given** `DraftCard` renders, **when** inspected, **then** an AI disclosure placeholder element is present in the header row (e.g., a `<span>` or `<p>` with text `AI-generated draft` or similar); the disclosure element must accommodate future replacement with a richer disclosure link without layout restructuring

9. **Given** `medium="email"`, **when** `DraftCard` renders, **then** the draft body `<div>` uses generous line-height (Tailwind `leading-relaxed` or `leading-loose`) with paragraph spacing (`space-y-4` between paragraphs); character count is NOT shown

10. **Given** `medium="text"` and `draftBody` length is ≥ 130 characters (within 30 chars of the 160-char SMS segment limit), **when** `DraftCard` renders, **then** a character count indicator is visible showing `{N}/160` where N is `draftBody.length`; when `draftBody.length < 130`, no character count is shown

11. **Given** `DraftCard` renders, **when** inspected, **then** the draft body is rendered as a selectable `<div>` or `<p>` — NOT wrapped in a `<button>` or any element with `role="button"`; the `CitationTag` renders **inline within the draft body area** (below or at end of draft text) referencing the provided `billId`, `session`, and `voteDate`

12. **Given** `isRevising={true}` is passed to `DraftCard`, **when** it renders, **then** the card applies a subtle reduced opacity (Tailwind `opacity-60` or similar) to signal the being-revised state — the draft body text remains visible and selectable

13. **Given** draft generation is in progress, **when** `DraftCardSkeleton` renders, **then** it has `aria-busy="true"` and `aria-label="Generating draft…"` (or equivalent); skeleton dimensions approximate a populated DraftCard to prevent layout shift (NFR4)

14. **Given** all interactive states in both components, **then** no hardcoded hex color values appear in `ProgressStrip.tsx` or `DraftCard.tsx` — only Tailwind design tokens (`on-record-accent`, `on-record-surface`, `on-record-primary`, `on-record-text`)

## Tasks / Subtasks

- [x] Task 1: Implement `ProgressStrip` component (AC: 1–6)
  - [x] Create `apps/web/src/components/ProgressStrip.tsx`
  - [x] Root element: `<nav aria-label="Form progress">` with 4 segments: Address / Your Rep / Your Issue / Send
  - [x] Segment styling: completed = `bg-on-record-accent` (amber), active = `bg-white` (or `bg-on-record-surface`), upcoming = amber with `opacity-40`
  - [x] `aria-current="step"` on the active segment only
  - [x] Mobile: segment labels hidden (`hidden sm:block`), active label always visible; desktop: all 4 labels visible
  - [x] No hardcoded hex values; focus-visible ring on focusable elements only (step indicators are not buttons)
  - [x] Create `apps/web/src/components/ProgressStrip.test.tsx` covering AC 1–6

- [x] Task 2: Implement `DraftCard` component (AC: 7–14)
  - [x] Create `apps/web/src/components/DraftCard.tsx`
  - [x] Header row: medium badge + formality badge + AI disclosure placeholder (`<span>AI-generated draft</span>` or similar)
  - [x] Email variant: `leading-relaxed` line-height, `space-y-4` paragraph spacing, no character count
  - [x] Text/SMS variant: compact block; show `{N}/160` character count indicator when `draftBody.length >= 130`
  - [x] Draft body: selectable `<div>` (not button); `CitationTag` rendered below draft text using `CitationTagProps`
  - [x] `isRevising` prop: apply `opacity-60` to card body when true
  - [x] `DraftCardSkeleton` exported component with `aria-busy="true"` (follows `BillCardSkeleton` / `LegislatorCardSkeleton` pattern)
  - [x] Create `apps/web/src/components/DraftCard.test.tsx` covering AC 7–14

- [x] Task 3: Update sprint status (AC: all)
  - [x] Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `4-6-progressstrip-and-draftcard-ui-components` → `review`

## Dev Notes

### What This Story Is

Pure UI component work. No MCP tools, no SQLite, no system-prompt changes. Two new React components plus their Vitest unit tests. These components will be integrated into the live chatbot flow by 4.4/4.5/5.x stories — this story only defines and tests the components in isolation.

**Deliverables:**
1. `apps/web/src/components/ProgressStrip.tsx` (new)
2. `apps/web/src/components/ProgressStrip.test.tsx` (new)
3. `apps/web/src/components/DraftCard.tsx` (new)
4. `apps/web/src/components/DraftCard.test.tsx` (new)
5. `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

No new npm packages required. No changes to `packages/types/` (component props are UI-only, not shared MCP types). No changes to `apps/mcp-server/`.

### Reuse Existing Patterns — Do Not Reinvent

**Must reuse these exact existing components:**

- `CitationTag` from `./CitationTag` — import `CitationTag` and `CitationTagProps` directly from `apps/web/src/components/CitationTag.tsx`. Do NOT re-implement the pill formatting logic; pass the props through.
- `Skeleton` from `@/components/ui/skeleton` — same shadcn/ui primitive used by `BillCardSkeleton`, `LegislatorCardSkeleton`
- Design token pattern from `BillCard.tsx` and `LegislatorCard.tsx` — use `on-record-accent`, `on-record-surface`, `on-record-primary`, `on-record-text` classes throughout; no hardcoded hex

**Pattern established in previous stories:**
- `"use client"` directive at top of every component file
- `[animation:none] motion-safe:animate-pulse` on skeleton elements (BillCardSkeleton pattern)
- `aria-busy="true"` on skeleton wrapper div
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2` for focus rings

### `ProgressStrip` Implementation Guide

```typescript
// apps/web/src/components/ProgressStrip.tsx
"use client"

const STEPS = [
  { label: 'Address', shortLabel: '1' },
  { label: 'Your Rep', shortLabel: '2' },
  { label: 'Your Issue', shortLabel: '3' },
  { label: 'Send', shortLabel: '4' },
] as const

interface ProgressStripProps {
  currentStep: 1 | 2 | 3 | 4
}
```

**Segment states (index 0-based, currentStep 1-based):**
- `index < currentStep - 1` → completed: `bg-on-record-accent` (amber filled)
- `index === currentStep - 1` → active: `bg-white border border-on-record-accent`, carries `aria-current="step"`
- `index > currentStep - 1` → upcoming: `bg-on-record-accent opacity-40`

**Mobile collapse pattern:**
```tsx
{/* Mobile: show short label or icon-only, except active step which always shows full label */}
<span className="sm:hidden">
  {isActive ? step.label : step.shortLabel}
</span>
{/* Desktop: always show full label */}
<span className="hidden sm:block">{step.label}</span>
```

**No onClick handlers** — `ProgressStrip` is a read-only navigation landmark. Steps are `<div>` or `<li>` elements, not `<button>`.

### `DraftCard` Implementation Guide

```typescript
// apps/web/src/components/DraftCard.tsx
"use client"

import { CitationTag } from './CitationTag'
import type { CitationTagProps } from './CitationTag'
import { Skeleton } from '@/components/ui/skeleton'

interface DraftCardProps {
  medium: 'email' | 'text'
  formality: 'conversational' | 'formal'
  draftBody: string
  citation: CitationTagProps  // { billId, session, voteDate? }
  isRevising?: boolean
}
```

**Badge labels:**
- `medium="email"` → badge text: `Email`
- `medium="text"` → badge text: `Text / SMS`
- `formality="conversational"` → badge text: `Conversational`
- `formality="formal"` → badge text: `Formal`

**AI disclosure placeholder:**
```tsx
<span className="text-xs text-on-record-text/50 italic">AI-generated draft</span>
```
Keep this as a plain `<span>` so future enhancement (link, icon, modal trigger) replaces it in-place without layout shift.

**Character count (text/SMS variant only):**
```tsx
{medium === 'text' && draftBody.length >= 130 && (
  <p className="text-xs text-on-record-text/60 text-right mt-1">
    {draftBody.length}/160
  </p>
)}
```

**Draft body (selectable, not button):**
```tsx
<div className={['text-on-record-text', medium === 'email' ? 'leading-relaxed space-y-4' : 'leading-normal'].join(' ')}>
  {draftBody}
</div>
```
For email variant with multi-paragraph drafts, split by `\n\n` and render each paragraph in a `<p>` tag inside the `space-y-4` wrapper. Do NOT wrap the whole `<div>` in a `<button>`.

**CitationTag placement** — render below draft text within the card body, not in the header:
```tsx
<div className="mt-3">
  <CitationTag {...citation} />
</div>
```

**`isRevising` state:**
```tsx
<div className={isRevising ? 'opacity-60' : ''}>
  {/* card body content */}
</div>
```

**`DraftCardSkeleton` — follow exact BillCardSkeleton pattern:**
```tsx
export function DraftCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Generating draft…"
      className="bg-on-record-surface rounded-md shadow-sm p-4"
    >
      {/* Header row skeleton */}
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-sm [animation:none] motion-safe:animate-pulse" />
        <Skeleton className="h-5 w-24 rounded-sm [animation:none] motion-safe:animate-pulse" />
        <Skeleton className="h-5 w-32 rounded-sm [animation:none] motion-safe:animate-pulse" />
      </div>
      {/* Draft body skeleton — multi-line to approximate email length */}
      <Skeleton className="h-4 w-full mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-5/6 mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-4/5 mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-full mb-4 [animation:none] motion-safe:animate-pulse" />
      {/* CitationTag skeleton */}
      <Skeleton className="h-5 w-56 rounded-full [animation:none] motion-safe:animate-pulse" />
    </div>
  )
}
```

### Testing Patterns (Follow BillCard.test.tsx Exactly)

Test file structure for `ProgressStrip.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressStrip } from './ProgressStrip'

describe('ProgressStrip', () => {
  it('renders all 4 step labels', () => { ... })
  it('root element is nav with aria-label="Form progress"', () => { ... })
  it('active step has aria-current="step"', () => { ... })
  it('no other segment has aria-current="step" when step 2 is active', () => { ... })
  it('renders "Address" as first label', () => { ... })
  it('renders "Your Rep" as second label', () => { ... })
  it('renders "Your Issue" as third label', () => { ... })
  it('renders "Send" as fourth label', () => { ... })
})
```

Test file structure for `DraftCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DraftCard, DraftCardSkeleton } from './DraftCard'

const baseCitation = { billId: 'HB0042', session: '2026GS', voteDate: '2026-02-15' }

describe('DraftCard', () => {
  it('renders medium badge "Email" when medium="email"', () => { ... })
  it('renders medium badge "Text / SMS" when medium="text"', () => { ... })
  it('renders formality badge "Conversational" when formality="conversational"', () => { ... })
  it('renders formality badge "Formal" when formality="formal"', () => { ... })
  it('renders AI disclosure placeholder text', () => { ... })
  it('draft body is not wrapped in a button', () => { ... })
  it('renders CitationTag with billId text', () => { ... })
  it('does NOT show character count when medium="text" and draftBody < 130 chars', () => { ... })
  it('shows {N}/160 character count when medium="text" and draftBody >= 130 chars', () => { ... })
  it('does NOT show character count when medium="email" even if draftBody >= 130 chars', () => { ... })
  it('applies opacity class when isRevising=true', () => { ... })
  it('does not apply opacity class when isRevising is not set', () => { ... })
})

describe('DraftCardSkeleton', () => {
  it('renders with aria-busy="true"', () => { ... })
})
```

**Key assertion patterns from BillCard.test.tsx:**
- `expect(screen.queryByRole('button')).not.toBeInTheDocument()` — verify draft body is NOT a button
- `expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()` — skeleton aria-busy check
- `expect(element.className).toContain('opacity-60')` — opacity class assertion

**Character count test (AC 10 — specify exact key phrase for toContain):**
```typescript
it('shows character count when text >= 130 chars', () => {
  const longDraft = 'A'.repeat(135)
  render(<DraftCard medium="text" formality="conversational" draftBody={longDraft} citation={baseCitation} />)
  expect(screen.getByText('135/160')).toBeInTheDocument()
})
```

### Architecture Compliance

**Component location:** `apps/web/src/components/` — one component per file, PascalCase filename.

**No barrel files:** Consumers import directly:
```typescript
import { ProgressStrip } from '@/components/ProgressStrip'
import { DraftCard, DraftCardSkeleton } from '@/components/DraftCard'
```
Do NOT create or modify any `index.ts` in `components/`.

**No `any`, no `@ts-ignore`.** TypeScript strict mode enforced.

**`"use client"` required** — both components use JSX and will be used in client-rendered contexts. Put `"use client"` as the very first line of each file.

**No new npm packages** — all needed dependencies already exist (`@testing-library/react`, `vitest`, `@/components/ui/skeleton`, `CitationTag`).

**No changes to `packages/types/`** — DraftCard props are UI-only, not shared MCP types. If a future story needs to pass `DraftContent` across server/client boundaries, it can add the type then.

**No `console.log`** — this rule applies to `apps/mcp-server/` not `apps/web/`, but avoid debug logs in components anyway.

### Design Token Reference

From `apps/web/src/app/globals.css`:

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `on-record-primary` | `#1e3a4f` | `#0a1520` | Chamber badge, deep slate elements |
| `on-record-accent` | `#c47d2e` | `#d4922a` | Amber — completed steps, badges, borders |
| `on-record-surface` | `#fafaf8` | `#0f1f2b` | Card backgrounds |
| `on-record-text` | `#1a1a1a` | `#e8e4dc` | Body text, labels |

Use `text-on-record-text/60` for muted text, `bg-on-record-accent/15` for light amber fills.

### Accessibility Requirements (NFR11, NFR12)

- `ProgressStrip` uses `<nav aria-label="Form progress">` as root — do NOT use `<div>` as root
- `aria-current="step"` on active segment — do NOT set on all steps
- Step segments are informational, not interactive — no `role="button"`, no `onClick`
- DraftCard draft body: `<div>` or `<p>`, never `<button>` — screen readers must be able to read draft without activating it
- `DraftCardSkeleton`: `aria-busy="true"` and descriptive `aria-label` so screen readers announce "Generating draft…"
- Focus ring on any focusable element: `focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2`

### Previous Story Learnings (Story 4.2 + Epic 3 Retro)

- **`[animation:none] motion-safe:animate-pulse`** pattern on Skeleton elements: static by default, pulse only when `prefers-reduced-motion` is not set — established in BillCardSkeleton, LegislatorCardSkeleton
- **CitationTag import**: import both `CitationTag` (component) and `CitationTagProps` (interface) from `./CitationTag` — do NOT copy the formatting logic
- **`formatVoteDate` reuse**: if DraftCard needs to display the vote date in a non-CitationTag context, import `formatVoteDate` from `./CitationTag` rather than re-implementing date formatting
- **Tests with `makeBill()` helper**: follow the same pattern with a `makeProps()` helper function in test files to avoid repetition

### Project Structure Notes

Files this story touches:

```
apps/web/src/components/
  ProgressStrip.tsx          ← NEW
  ProgressStrip.test.tsx     ← NEW
  DraftCard.tsx              ← NEW
  DraftCard.test.tsx         ← NEW
  CitationTag.tsx            ← READ ONLY (import from here)
  ui/skeleton.tsx            ← READ ONLY (import from here)
_bmad-output/implementation-artifacts/
  sprint-status.yaml         ← MODIFY (status → review)
```

Do NOT touch:
- `apps/mcp-server/` — no MCP changes in this story
- `packages/types/` — no shared type additions needed
- `apps/web/src/app/globals.css` — design tokens already defined
- `apps/web/src/components/CitationTag.tsx` — import only, do not modify

### References

- Story 4.6 requirements: [`_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.6]
- FR17–FR21 (draft content requirements): [`_bmad-output/planning-artifacts/epics.md` — Epic 4]
- NFR4 (loading states): [`_bmad-output/planning-artifacts/epics.md` — NonFunctional Requirements]
- NFR11 (WCAG 2.1 AA, aria): [`_bmad-output/planning-artifacts/epics.md` — NonFunctional Requirements]
- NFR12 (44×44px touch targets): [`_bmad-output/planning-artifacts/epics.md` — NonFunctional Requirements]
- ProgressStrip anatomy: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Custom Components → ProgressStrip"]
- DraftCard anatomy: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Custom Components → DraftCard"]
- Mobile ProgressStrip collapse: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Mobile (< 640px) — Primary Design Target"]
- ProgressStrip nav pattern: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Screen Reader Experience"]
- Design tokens: [`apps/web/src/app/globals.css` — `@theme inline` + `:root` block]
- CitationTag (reuse): [`apps/web/src/components/CitationTag.tsx`]
- BillCard / BillCardSkeleton (pattern): [`apps/web/src/components/BillCard.tsx`]
- BillCard tests (test pattern): [`apps/web/src/components/BillCard.test.tsx`]
- LegislatorCard (pattern): [`apps/web/src/components/LegislatorCard.tsx`]
- Architecture — component structure: [`_bmad-output/planning-artifacts/architecture.md` — "Complete Project Directory Structure"]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. All tests passed on first run.

### Completion Notes List

- Implemented `ProgressStrip` component as a `<nav aria-label="Form progress">` with `<ol>/<li>` segments following AC 1–6 exactly. Added optional `className` prop for AC4 parent-controlled visibility. Segment states: completed=`bg-on-record-accent`, active=`bg-white border border-on-record-accent` with `aria-current="step"`, upcoming=`bg-on-record-accent opacity-40`. Mobile collapse via `sm:hidden`/`hidden sm:block` pattern. 18 unit tests cover all ACs including no-button, no-hex-color, aria-current assertions.
- Implemented `DraftCard` component with header row (medium badge, formality badge, AI disclosure `<span>`), selectable draft body (not a button), character count for text/SMS ≥130 chars, `CitationTag` below draft, `isRevising` → `opacity-60` on card body. `DraftCardSkeleton` follows `BillCardSkeleton` pattern with `aria-busy="true"` and `aria-label="Generating draft…"`. 22 unit tests cover all ACs 7–14.
- Full regression suite: 88 web tests + 191 mcp-server tests all pass. TypeScript strict mode passes with no errors.

### File List

apps/web/src/components/ProgressStrip.tsx
apps/web/src/components/ProgressStrip.test.tsx
apps/web/src/components/DraftCard.tsx
apps/web/src/components/DraftCard.test.tsx
_bmad-output/implementation-artifacts/sprint-status.yaml
_bmad-output/implementation-artifacts/4-6-progressstrip-and-draftcard-ui-components.md

## Change Log

- 2026-03-20: Implemented `ProgressStrip` and `DraftCard` UI components with full unit test coverage (40 tests total: 18 ProgressStrip + 22 DraftCard). All ACs 1–14 satisfied. Sprint status updated to review.
