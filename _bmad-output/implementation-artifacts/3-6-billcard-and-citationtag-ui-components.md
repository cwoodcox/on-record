# Story 3.6: `BillCard` and `CitationTag` UI Components

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to see bills displayed as cards with an inline citation pill,
so that I can verify the legislative data at a glance before it goes into my draft.

## Acceptance Criteria

1. **Given** `search_bills` returns bill data, **when** `BillCard` renders, **then** it displays: issue theme pill (when provided), bill ID (amber, monospace font), bill title, vote result + vote date (muted text when present), and a `CitationTag`
2. **Given** a `Bill` object, **when** `CitationTag` renders, **then** it displays a pill in the format: `{billId} · {sessionLabel} · {dateLabel}` — where `sessionLabel` formats e.g. `"2026GS"` → `"2026 General Session"` and `dateLabel` formats e.g. `"2026-02-15"` → `"Feb 15, 2026"` (voteDate field; omitted when `voteDate` is undefined)
3. **Given** `CitationTag` is built as a standalone component, **when** DraftCard is implemented in Epic 4, **then** `CitationTag` can be imported and reused directly from `./CitationTag` without modification
4. **Given** `selectable={true}`, **when** `BillCard` renders, **then** it has `role="button"` and `aria-pressed` reflecting the current selection state; keyboard activation (Enter or Space) triggers `onSelect`
5. **Given** bills are loading, **when** `BillCardSkeleton` renders, **then** it has `aria-busy="true"`, renders `Skeleton` rows matching the expected card dimensions (no layout shift), and shows no real bill content
6. **Given** interactive states, **when** touch-screen users tap `BillCard`, **then** the tap target meets the 44×44px minimum (NFR12); all text/background color pairs meet ≥4.5:1 WCAG AA contrast (NFR11)
7. **Given** the codebase, **when** `BillCard.tsx` and `CitationTag.tsx` are reviewed, **then** zero hardcoded hex values appear — all colors use Tailwind `on-record-*` design tokens from `globals.css`
8. `pnpm --filter web typecheck` exits 0
9. `pnpm --filter web test` exits 0 (all pre-existing tests pass; new tests added for both components)
10. `pnpm --filter web lint` exits 0

## Tasks / Subtasks

- [x] Task 1: Create `apps/web/src/components/CitationTag.tsx` (AC: 2, 3, 6, 7)
  - [x] Add `"use client"` directive at top
  - [x] Define `CitationTagProps`: `{ billId: string; session: string; voteDate?: string }`
  - [x] Implement `formatSession(session: string): string` — see Dev Notes for logic
  - [x] Implement `formatVoteDate(isoDate: string): string` — parse with `Date.UTC` to avoid timezone off-by-one (see Dev Notes)
  - [x] Export `CitationTag({ billId, session, voteDate }: CitationTagProps)` — renders a `<span>` pill with the formatted text; when `voteDate` is defined append ` · {dateLabel}` segment; when absent, render only `{billId} · {sessionLabel}`
  - [x] Styling: `text-sm font-mono text-on-record-text/70 bg-on-record-surface border border-on-record-accent/30 rounded-full px-2.5 py-0.5 inline-block` — all tokens, no hex

- [x] Task 2: Create `apps/web/src/components/CitationTag.test.tsx` (AC: 2, 9)
  - [x] Test: renders `billId · sessionLabel` when `voteDate` is undefined
  - [x] Test: renders `billId · sessionLabel · dateLabel` when `voteDate` is provided
  - [x] Test: formats `"2026GS"` → `"2026 General Session"`
  - [x] Test: formats `"2025GS"` → `"2025 General Session"`
  - [x] Test: formats `voteDate = "2026-02-15"` → `"Feb 15, 2026"` (UTC-safe, no off-by-one)
  - [x] Test: formats `voteDate = "2026-03-01"` → `"Mar 1, 2026"`

- [x] Task 3: Create `apps/web/src/components/BillCard.tsx` (AC: 1, 4, 5, 6, 7)
  - [x] Add `"use client"` directive
  - [x] Import `type { Bill } from '@on-record/types'`
  - [x] Import `{ Skeleton } from '@/components/ui/skeleton'`
  - [x] Import `{ CitationTag } from './CitationTag'`
  - [x] Define `BillCardProps`: `{ bill: Bill; theme?: string; selectable?: boolean; selected?: boolean; onSelect?: () => void }`
  - [x] Implement `handleKeyDown`: Enter or Space triggers `onSelect?.()` when `selectable`
  - [x] Export `BillCard` — renders `<article>` with:
    - `role={selectable ? 'button' : undefined}`, `tabIndex={selectable ? 0 : undefined}`
    - `aria-pressed={selectable ? selected : undefined}`
    - `aria-label` including bill title (see Dev Notes for exact format)
    - `onClick`, `onKeyDown` when selectable
    - Border treatment matching `LegislatorCard` pattern (`border-t-[3px] border-on-record-accent`)
    - `focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2`
    - `motion-safe:transition-shadow motion-safe:hover:shadow-md` when selectable
    - Theme pill (`{theme}` in a small amber span) — only when `theme` is defined
    - Bill ID: amber, monospace — `text-on-record-accent font-mono font-semibold`
    - Bill title: `text-on-record-text font-semibold`
    - Vote result + date (muted): only when `bill.voteResult` is defined; `text-sm text-on-record-text/60`
    - `<CitationTag billId={bill.id} session={bill.session} voteDate={bill.voteDate} />`
    - Minimum touch target: ensure `min-h-[44px]` when `selectable`
  - [x] Export `BillCardSkeleton` — same card shell with `aria-busy="true"` and `aria-label="Loading bill information"`; Skeleton rows matching title, meta, citation heights; `[animation:none] motion-safe:animate-pulse` on each Skeleton

- [x] Task 4: Create `apps/web/src/components/BillCard.test.tsx` (AC: 1, 4, 5, 6, 9)
  - [x] Define `makeBill(overrides?)` fixture (see Dev Notes)
  - [x] Test: renders bill ID in the document
  - [x] Test: renders bill title in the document
  - [x] Test: renders theme pill when `theme` prop is provided
  - [x] Test: does NOT render theme pill when `theme` prop is omitted
  - [x] Test: renders vote result and vote date (muted) when `bill.voteResult` is defined
  - [x] Test: does NOT render vote result section when `bill.voteResult` is undefined
  - [x] Test: renders `CitationTag` — verify the bill ID text appears inside (integration with CitationTag)
  - [x] Test: no `role="button"` when `selectable` is false/undefined
  - [x] Test: renders `role="button"` with `aria-pressed="false"` when `selectable` and `selected={false}`
  - [x] Test: renders `aria-pressed="true"` when `selectable` and `selected={true}`
  - [x] Test: calls `onSelect` on click when selectable
  - [x] Test: calls `onSelect` on Enter key when selectable
  - [x] Test: calls `onSelect` on Space key when selectable
  - [x] `BillCardSkeleton`: smoke test (`aria-busy="true"` in DOM)
  - [x] `BillCardSkeleton`: no heading rendered (no bill title shown)

- [x] Task 5: Final verification (AC: 8–10)
  - [x] `pnpm --filter web typecheck` exits 0
  - [x] `pnpm --filter web test` exits 0 — all pre-existing + new tests pass
  - [x] `pnpm --filter web lint` exits 0
  - [x] Confirm no hardcoded hex values in `BillCard.tsx` or `CitationTag.tsx`
  - [x] Confirm no barrel files created or modified (`components/index.ts` must not exist)

## Dev Notes

### Scope — What Story 3.6 IS and IS NOT

**In scope:**
- `apps/web/src/components/CitationTag.tsx` — CREATE NEW
- `apps/web/src/components/CitationTag.test.tsx` — CREATE NEW
- `apps/web/src/components/BillCard.tsx` — CREATE NEW
- `apps/web/src/components/BillCard.test.tsx` — CREATE NEW

**NOT in scope:**
- `DraftCard.tsx` — Epic 4 (Story 4.6); `CitationTag` should be built for reuse but DraftCard itself is not built here
- `apps/mcp-server/` — no changes; MCP tool is complete from Story 3.5
- `packages/types/` — no changes; `Bill` and `SearchBillsResult` are already defined and correct
- `apps/web/src/app/` — no page-level changes; components are standalone at this stage
- `apps/web/src/components/ui/` — do not modify shadcn primitives; add new shadcn components via `pnpm --filter web exec npx shadcn@latest add <name>` if needed (but only `Skeleton` should be required — already installed)

### Architecture Boundaries (ENFORCE)

1. **No barrel files**: Do NOT create or modify `components/index.ts`. Import `CitationTag` directly from `'./CitationTag'` in BillCard.
2. **No hex values**: Only Tailwind `on-record-*` tokens from `globals.css`. Do not use `#c47d2e` etc.
3. **`strict: true`**: No `any`, no `@ts-ignore`, no non-null assertions except where provably safe (e.g. `split` on a known ISO string).
4. **`"use client"` required**: Both components use hooks/events — they are Client Components.
5. **Shared types from `@on-record/types`**: Import `Bill` from `'@on-record/types'`. Do NOT redefine it locally.
6. **Test co-location**: Tests live next to source — `CitationTag.test.tsx` next to `CitationTag.tsx`.

### Design Token Reference

Available Tailwind tokens (from `globals.css` `@theme inline` block):

```
bg-on-record-primary     → #1e3a4f  (dark mode: #0a1520)  — Deep warm slate
bg-on-record-accent      → #c47d2e  (dark mode: #d4922a)  — Warm amber
bg-on-record-surface     → #fafaf8  (dark mode: #0f1f2b)  — Off-white
text-on-record-text      → #1a1a1a  (dark mode: #e8e4dc)  — Near-black
text-on-record-error     → #b91c1c
text-on-record-success   → #2e7d52

Opacity modifier: text-on-record-text/70 (muted), /60 (more muted), /30 (ghost)
Accent opacity:   border-on-record-accent/30 (light citation border)
```

Dark mode is handled automatically via `.dark` class on `:root` — use standard Tailwind tokens and dark mode variant only if token doesn't cover it. The `on-record-*` tokens already switch via CSS variables.

### `CitationTag` Implementation

**Props:**
```typescript
interface CitationTagProps {
  billId: string
  session: string
  voteDate?: string  // ISO 8601: "2026-02-15" — optional (undefined when bill has no vote)
}
```

**Session label formatter:**
```typescript
function formatSession(session: string): string {
  const year = session.slice(0, 4)
  const type = session.slice(4)
  // GS = General Session; SS = Special Session (rare but handle gracefully)
  const typeLabel =
    type === 'GS' ? 'General Session' :
    type === 'SS' ? 'Special Session' :
    type  // fallback: render raw suffix (e.g. "S1" for first special session)
  return `${year} ${typeLabel}`
}
```

**Vote date formatter — UTC-SAFE (critical — avoid timezone off-by-one bug):**
```typescript
function formatVoteDate(isoDate: string): string {
  // Parse as UTC to prevent timezone shift (e.g. "2026-02-15" parsed locally
  // in UTC-7 becomes Feb 14 — this is the bug pattern caught in Story 3.4).
  const [year, month, day] = isoDate.split('-').map(Number)
  const d = new Date(Date.UTC(year!, month! - 1, day!))
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
```

**Rendered JSX:**
```typescript
export function CitationTag({ billId, session, voteDate }: CitationTagProps) {
  const sessionLabel = formatSession(session)
  const parts = [billId, sessionLabel]
  if (voteDate !== undefined) {
    parts.push(formatVoteDate(voteDate))
  }

  return (
    <span className="inline-block text-sm font-mono text-on-record-text/70 bg-on-record-surface border border-on-record-accent/30 rounded-full px-2.5 py-0.5">
      {parts.join(' · ')}
    </span>
  )
}
```

Note: `CitationTag` has no interactive states — no `tabIndex`, no `role`, no event handlers. It is purely presentational.

### `BillCard` Implementation

**Props:**
```typescript
interface BillCardProps {
  bill: Bill
  theme?: string        // search theme (e.g. "healthcare") — shown as pill; omit to hide pill
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}
```

**Pattern:** Follow `LegislatorCard.tsx` exactly — same `article` shell, same `handleKeyDown`, same className array pattern with `.filter(Boolean).join(' ')`.

**Aria label:** Use `bill.title` — e.g. `aria-label={bill.title}`. Unlike LegislatorCard which names a person, BillCard can use the bill title directly.

**Theme pill:** Only when `theme !== undefined`:
```tsx
{theme !== undefined && (
  <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-accent/15 text-on-record-accent px-2 py-0.5 rounded-sm mb-2">
    {theme}
  </span>
)}
```

**Bill ID (amber, monospace):**
```tsx
<p className="text-on-record-accent font-mono font-semibold text-base mb-1">
  {bill.id}
</p>
```

**Bill title:**
```tsx
<h3 className="text-on-record-text font-semibold mb-2">
  {bill.title}
</h3>
```

(Use `h3` not `h2` — BillCards appear in a list within a larger section that has its own `h2`; semantic heading level should descend from page structure.)

**Vote result + date (muted, only when present):**
```tsx
{bill.voteResult !== undefined && (
  <p className="text-sm text-on-record-text/60 mb-3">
    {bill.voteResult}
    {bill.voteDate !== undefined && ` · ${bill.voteDate}`}
  </p>
)}
```

Wait — the raw `voteDate` is ISO format. For the muted text inside BillCard (separate from CitationTag), you can render the raw date or format it. Keep it simple: render `bill.voteResult` + `bill.voteDate` unformatted here since `CitationTag` already shows the formatted date. Or format it too for consistency — dev's choice, but be explicit in the component. Either approach is valid; CitationTag is the canonical citation. The muted line in BillCard is supplementary context.

**CitationTag integration:**
```tsx
<CitationTag billId={bill.id} session={bill.session} voteDate={bill.voteDate} />
```

**Touch target on selectable state:**
```tsx
selectable ? 'min-h-[44px]' : '',
```

**`BillCardSkeleton` skeleton row heights** (should match BillCard's actual content heights to prevent layout shift):
- Theme pill skeleton: `h-5 w-20`
- Bill ID skeleton: `h-5 w-24`
- Title skeleton: `h-6 w-3/4`
- Vote info skeleton: `h-4 w-40` (or omit if optional — show one line of skeleton regardless)
- CitationTag skeleton: `h-5 w-56`

All Skeleton uses: `[animation:none] motion-safe:animate-pulse` (same as `LegislatorCardSkeleton`).

### `BillCard` Test Fixture

```typescript
import type { Bill } from '@on-record/types'

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'HB0042',
    session: '2026GS',
    title: 'Utah Healthcare Access Act',
    summary: 'Expands Medicaid access for low-income residents',
    status: 'Enrolled',
    sponsorId: 'RRabbitt',
    voteResult: 'Pass',
    voteDate: '2026-02-15',
    ...overrides,
  }
}
```

### Testing Framework

- **Vitest** with **jsdom** environment — `apps/web/vitest.config.ts`
- **React Testing Library** — `@testing-library/react`, `@testing-library/user-event`
- **jest-dom matchers** — setup via `apps/web/src/test/setup.ts`
- Run: `pnpm --filter web test`

**Test imports pattern** (from `LegislatorCard.test.tsx` and `ErrorBanner.test.tsx`):
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Bill } from '@on-record/types'
import { BillCard, BillCardSkeleton } from './BillCard'
```

No `userEvent` needed unless testing async interactions. `fireEvent.click` and `fireEvent.keyDown` are sufficient for BillCard.

**Touch target test pattern** (from `ErrorBanner.test.tsx`):
```typescript
it('has min-h-[44px] class when selectable for touch target compliance', () => {
  render(<BillCard bill={makeBill()} selectable />)
  const button = screen.getByRole('button')
  expect(button.className).toContain('min-h-[44px]')
})
```

### CitationTag Test — Timezone Safety Assertion

To prove the UTC fix works, include this specific edge case:
```typescript
it('formats voteDate "2026-03-01" as "Mar 1, 2026" without timezone off-by-one', () => {
  render(<CitationTag billId="HB0042" session="2026GS" voteDate="2026-03-01" />)
  // If parsed as local time in UTC-7, this would show Feb 28 — the UTC fix prevents this
  expect(screen.getByText(/Mar 1, 2026/)).toBeInTheDocument()
})
```

### Previous Story Intelligence (Story 3.5 + Code Review Patterns)

From Story 3.5 and prior code reviews — patterns to apply here:

1. **Timezone off-by-one bug** — Story 3.4 code review found that parsing ISO dates without UTC context causes dates to appear one day earlier in UTC-7 timezones. The `formatVoteDate` function above uses `Date.UTC` + `timeZone: 'UTC'` to prevent this. Test with a date at a month boundary (e.g., March 1) to prove the fix.
2. **Test assertion quality** — Use specific matchers: `toBeInTheDocument()`, not `toBeTruthy()`. For className checks, use `.toContain()`. Avoid `typeof x === 'string'` — use `toBeTypeOf` or structural assertions.
3. **No duplicate imports** — Import `Bill` once from `@on-record/types`. Don't split across two import statements.
4. **Mock boundary for unit tests** — `CitationTag` and `BillCard` are pure UI components with no external dependencies. No mocking needed — test the real implementations with RTL.
5. **Pattern from `LegislatorCard`** — The exact className array pattern with `.filter(Boolean).join(' ')` is established; replicate it.

### Git Intelligence

Recent commits:
- `fix(story-3.5): address code review findings — error handling and test quality`
- `feat(story-3.5): implement search_bills MCP tool with retry logic`

Patterns to follow:
- Commit per task: `feat(story-3.6): create CitationTag component and tests`
- Then: `feat(story-3.6): create BillCard component and tests`
- Final: `chore(story-3.6): mark story review-ready, update sprint-status`

### `lib/utils.ts` — `cn()` utility

The web app has `apps/web/src/lib/utils.ts` with a `cn()` shadcn utility (combines `clsx` + `tailwind-merge`). You may use it for conditional class merging instead of the `.filter(Boolean).join(' ')` array pattern — both are valid. `LegislatorCard` uses the array pattern; either is fine for consistency.

### Project Structure Notes

```
apps/web/src/components/
  CitationTag.tsx          ← CREATE: reusable citation pill
  CitationTag.test.tsx     ← CREATE: CitationTag unit tests
  BillCard.tsx             ← CREATE: BillCard + BillCardSkeleton
  BillCard.test.tsx        ← CREATE: BillCard unit tests
  LegislatorCard.tsx       ← reference: DO NOT MODIFY
  LegislatorCard.test.tsx  ← reference: DO NOT MODIFY
  ErrorBanner.tsx          ← reference: DO NOT MODIFY
  ErrorBanner.test.tsx     ← reference: DO NOT MODIFY
  ui/
    skeleton.tsx            ← already installed; import directly
    badge.tsx               ← available if needed
    alert.tsx               ← available if needed
```

No barrel `index.ts` — import components directly by path.

### References

- [Source: apps/web/src/components/LegislatorCard.tsx] — Reference implementation: `article` shell, selectable pattern, `handleKeyDown`, className array, `LegislatorCardSkeleton` with `[animation:none] motion-safe:animate-pulse`
- [Source: apps/web/src/components/LegislatorCard.test.tsx] — Reference test suite: `role="button"`, `aria-pressed`, click + keyboard tests, Skeleton smoke tests
- [Source: apps/web/src/components/ErrorBanner.test.tsx] — Touch target test pattern (`className.toContain('min-h-[44px]')`)
- [Source: apps/web/src/app/globals.css] — Tailwind v4 `@theme inline` and `:root` brand tokens (`on-record-primary`, `on-record-accent`, `on-record-surface`, `on-record-text`)
- [Source: packages/types/index.ts#Bill] — `Bill` interface: `{ id, session, title, summary, status, sponsorId, voteResult?, voteDate? }`
- [Source: packages/types/index.ts#SearchBillsResult] — `{ bills: Bill[], legislatorId, session }` — the `theme` was the search input, not stored on `Bill`
- [Source: apps/web/package.json] — Dependencies confirmed: `@on-record/types`, `@testing-library/react`, `@testing-library/user-event`, `vitest`, `lucide-react` (available for icons if needed)
- [Source: apps/web/vitest.config.ts] — `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`, alias `@` → `./src`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6] — Original AC: theme pill, bill number amber monospace, vote result + date muted, CitationTag pill format, selectable role/aria, Skeleton, 44px touch targets, WCAG AA, no hex values
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#BillCard/CitationTag] — Component anatomy, meta text scale (`text-sm` for citation), no interactive states on CitationTag, reusable in DraftCard (Epic 4)
- [Source: _bmad-output/implementation-artifacts/3-5-search-bills-mcp-tool-with-retry-logic.md] — Story 3.5 completion: `SearchBillsResult` has `bills: Bill[]`; individual `bill.session` and `bill.voteDate` are the fields CitationTag reads

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers encountered.

### Completion Notes List

- Implemented `CitationTag.tsx` with UTC-safe date formatting using `Date.UTC` + `timeZone: 'UTC'` to prevent timezone off-by-one bug (pattern from Story 3.4). Conditional spread pattern `{...(bill.voteDate !== undefined ? { voteDate: bill.voteDate } : {})}` used in `BillCard` to satisfy `exactOptionalPropertyTypes: true`.
- Implemented `BillCard.tsx` following `LegislatorCard` pattern exactly: `article` shell, `.filter(Boolean).join(' ')` className array, `handleKeyDown` Enter/Space, `aria-pressed`, `min-h-[44px]` for touch target compliance.
- Implemented `BillCardSkeleton` with `aria-busy="true"`, five Skeleton rows matching content dimensions, `[animation:none] motion-safe:animate-pulse` on each.
- All 46 tests pass (6 CitationTag + 16 BillCard + pre-existing 18 LegislatorCard + 6 ErrorBanner). Typecheck exits 0, lint exits 0.
- No hex values, no barrel files, no mcp-server changes, no types changes — scope boundary enforced.

### File List

- `apps/web/src/components/CitationTag.tsx` — CREATED
- `apps/web/src/components/CitationTag.test.tsx` — CREATED
- `apps/web/src/components/BillCard.tsx` — CREATED
- `apps/web/src/components/BillCard.test.tsx` — CREATED
- `_bmad-output/implementation-artifacts/3-6-billcard-and-citationtag-ui-components.md` — MODIFIED (status, task checkboxes, dev record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status: review)

## Change Log

- 2026-03-09: Implemented `CitationTag` and `BillCard` UI components with full test coverage. 4 new files created, 46 tests passing, typecheck and lint clean. Story marked for review.
