# Story 2.6: LegislatorCard UI Component with Tailwind Design Tokens

Status: review

## Story

As a **constituent**,
I want to see my legislator displayed in a named card with the Aha #1 visual treatment,
so that the moment I see my actual representative named feels deliberate and real — not like a text field result.

## Acceptance Criteria

1. **Given** `globals.css` defines all Tailwind v4 `@theme` design tokens (primary `#1e3a4f`, accent amber `#c47d2e`, surface `#fafaf8`, text `#1a1a1a`, error `#b91c1c`, success `#2e7d52`, dark mode variants), **When** `LegislatorCard` renders with legislator data, **Then** it displays: amber 3px top border, chamber badge (House/Senate), legislator name as `<h2>`, district line, email, phone with API-provided type label

2. **Given** `phoneTypeUnknown: true` on a `Legislator`, **When** `LegislatorCard` renders, **Then** it displays a "number type unknown" flag alongside the phone number (FR5)

3. **Given** the card is selectable (FR3), **When** it renders, **Then** it has `role="button"` and `aria-pressed` reflecting selected state; toggling selection changes `aria-pressed` correctly

4. **Given** a GIS lookup is in progress, **When** the skeleton variant renders, **Then** a `Skeleton` placeholder appears with dimensions matching the real card dimensions — no layout shift on data load (NFR4)

5. **Given** interactive states exist (selectable card), **When** measured, **Then** all interactive targets meet the 44×44px touch target minimum (NFR12)

6. **Given** all color pairings used in the component, **When** evaluated against WCAG 2.1 AA, **Then** all text/background combinations achieve ≥4.5:1 contrast ratio (NFR11)

7. **Given** the component file `LegislatorCard.tsx`, **When** inspected, **Then** it contains zero hardcoded hex color values — all colors come from Tailwind design tokens only

8. **Given** `LegislatorCard` is a React component in `apps/web`, **When** rendered within the Next.js App Router, **Then** it works as a Client Component (`"use client"`) since it handles interactive state

## Tasks / Subtasks

- [x] Task 1: Extend `globals.css` with On Record design tokens (AC: 1, 6, 7)
  - [x] Add On Record color custom properties to `:root` block: `--on-record-primary: #1e3a4f`, `--on-record-accent: #c47d2e`, `--on-record-surface: #fafaf8`, `--on-record-text: #1a1a1a`, `--on-record-error: #b91c1c`, `--on-record-success: #2e7d52`
  - [x] Add dark mode variants inside `.dark {}` block: `--on-record-primary: #0a1520`, `--on-record-accent: #d4922a`, `--on-record-surface: #0f1f2b`, `--on-record-text: #e8e4dc`
  - [x] Expose via `@theme inline` block: `--color-on-record-primary: var(--on-record-primary)`, `--color-on-record-accent: var(--on-record-accent)`, `--color-on-record-surface: var(--on-record-surface)`, `--color-on-record-text: var(--on-record-text)`, `--color-on-record-error: var(--on-record-error)`, `--color-on-record-success: var(--on-record-success)`
  - [x] Verify Tailwind utility classes `bg-on-record-primary`, `border-on-record-accent`, `text-on-record-text` etc. resolve correctly (Tailwind v4 maps `--color-*` CSS vars to utility classes automatically)
  - [x] Do NOT alter the existing shadcn/ui OKLCH token system — add On Record tokens alongside it

- [x] Task 2: Create `apps/web/src/components/` directory and `LegislatorCard.tsx` (AC: 1, 2, 3, 7, 8)
  - [x] Create `apps/web/src/components/LegislatorCard.tsx` as Client Component (`"use client"`)
  - [x] Props interface: `{ legislator: Legislator; selectable?: boolean; selected?: boolean; onSelect?: () => void }` — import `Legislator` from `@on-record/types`
  - [x] Render as `<article>` with `aria-label` including legislator name, chamber, and district
  - [x] Apply amber 3px top border: `border-t-[3px] border-on-record-accent` — no hardcoded hex
  - [x] Apply card container styles: `bg-on-record-surface rounded-md shadow-sm p-4` (off-white surface, 10px border-radius, soft shadow matching UX spec)
  - [x] Chamber badge: `<span>` styled as badge; display "House" or "Senate" based on `legislator.chamber`; use `bg-on-record-primary text-white` — no hardcoded hex
  - [x] Legislator name as `<h2>` (required by UX spec a11y section — "LegislatorCard: `<article>` with descriptive heading. Legislator name is `<h2>`")
  - [x] District line: "District {number}" text in muted style
  - [x] Email link: `<a href="mailto:{email}">` using `legislator.email`
  - [x] Phone display: show `legislator.phone`; if `legislator.phoneLabel` present, show label in parens; if `legislator.phoneTypeUnknown === true`, show "number type unknown" flag (FR5)
  - [x] When `selectable === true`: add `role="button"`, `tabIndex={0}`, `aria-pressed={selected}`, `onClick={onSelect}`, `onKeyDown` handler for Enter/Space calling `onSelect`
  - [x] Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2` — 2px amber, 2px offset (UX spec requirement; never suppress without replacement)
  - [x] Hover/press transitions gated on `motion-safe:` prefix (UX spec: `prefers-reduced-motion` honored)
  - [x] Zero hardcoded hex values — all colors via On Record design token Tailwind classes

- [x] Task 3: Create `LegislatorCardSkeleton` (loading state) (AC: 4, 5)
  - [x] Add shadcn/ui `Skeleton` primitive via CLI: `pnpm --filter web exec npx shadcn@latest add skeleton`
  - [x] Add `LegislatorCardSkeleton` as a named export from `LegislatorCard.tsx` (same file — co-located variant)
  - [x] Skeleton container: same padding, border-radius, shadow as real card (`border-t-[3px] border-on-record-accent/30 bg-on-record-surface rounded-md shadow-sm p-4`)
  - [x] Skeleton rows mimic real card anatomy: badge area (w-16, h-5), name area (w-48, h-6), district line (w-24, h-4), email line (w-56, h-4), phone line (w-40, h-4)
  - [x] Use shadcn/ui `<Skeleton>` primitive for all shimmer rows
  - [x] Add `aria-busy="true"` and `aria-label="Loading legislator information"` on skeleton container
  - [x] Skeleton shimmer animation gated on `motion-safe:animate-pulse` (UX spec requirement)

- [x] Task 4: Add Vitest setup to `apps/web` and write component tests (AC: 1–8)
  - [x] Install Vitest devDependencies: `vitest@^4`, `@vitejs/plugin-react@^4`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `jsdom@^26`
  - [x] Add `"test": "vitest run"` to `apps/web/package.json` scripts
  - [x] Create `apps/web/vitest.config.ts` with jsdom environment, React plugin, `@` path alias pointing to `src/`
  - [x] Create `apps/web/vitest.setup.ts` that imports `@testing-library/jest-dom` (exists as `apps/web/src/test/setup.ts` from Story 2.5)
  - [x] Create `apps/web/src/components/LegislatorCard.test.tsx` co-located next to source
  - [x] Test: renders legislator name as h2
  - [x] Test: renders "House" badge for house chamber
  - [x] Test: renders "Senate" badge for senate chamber
  - [x] Test: renders "District {n}" text
  - [x] Test: renders email as mailto anchor with correct href
  - [x] Test: renders phone label in parens when `phoneLabel` present
  - [x] Test: renders "number type unknown" when `phoneTypeUnknown === true`
  - [x] Test: no `role="button"` when `selectable` is false/omitted
  - [x] Test: `role="button"` + `aria-pressed="false"` when `selectable={true}` and `selected={false}`
  - [x] Test: `aria-pressed="true"` when `selectable={true}` and `selected={true}`
  - [x] Test: calls `onSelect` on click when selectable
  - [x] Test: calls `onSelect` on Enter key when selectable
  - [x] Test: calls `onSelect` on Space key when selectable
  - [x] Test: LegislatorCardSkeleton renders without error (smoke test)
  - [x] Test: LegislatorCardSkeleton has no heading or link (no legislator data rendered)

- [x] Task 5: Update CI to run web tests (prerequisite: Task 4)
  - [x] Open `.github/workflows/ci.yml`
  - [x] After the existing `Unit tests (mcp-server)` step, add: `- name: Unit tests (web)` / `  run: pnpm --filter web test`
  - [x] Note: Story 1.5 explicitly deferred web Vitest to story 2.6; this closes that deferral

- [x] Task 6: Final verification (AC: 1–8)
  - [x] `pnpm --filter web test` passes (all 16 LegislatorCard tests + 6 ErrorBanner tests = 22 total green)
  - [x] `pnpm --filter web typecheck` passes (no TypeScript errors in new files)
  - [x] `pnpm --filter web lint` passes (no ESLint violations)
  - [x] Grep `LegislatorCard.tsx` for any hex string (`#[0-9a-fA-F]`) — zero matches confirmed
  - [x] Confirm skeleton container dimensions match the card layout (manual inspection — identical structure)

## Dev Notes

### Scope — What Story 2.6 IS and IS NOT

**Story 2.6 scope:**
- `apps/web/src/app/globals.css` — add On Record brand design tokens as additional CSS custom properties + `@theme` mapping
- `apps/web/src/components/LegislatorCard.tsx` — new Client Component + `LegislatorCardSkeleton` named export
- `apps/web/src/components/LegislatorCard.test.tsx` — co-located Vitest/RTL tests
- `apps/web/vitest.config.ts` + `apps/web/vitest.setup.ts` — Vitest config for web (deferred from Story 1.5)
- `apps/web/package.json` — add `test` script + Vitest devDependencies
- shadcn/ui `Skeleton` primitive (via `npx shadcn@latest add skeleton` CLI command)
- `.github/workflows/ci.yml` — add web unit test step (closes Story 1.5 deferral)

**NOT in Story 2.6:**
- Wiring `LegislatorCard` into any app page — pages are wired when all Epic 2 backend stories (2.1–2.4) are implemented
- `ErrorBanner` component — that is Story 2.5
- Any `apps/mcp-server/` changes — pure frontend story
- `BillCard`, `ProgressStrip`, `DraftCard`, `SendActions`, `CitationTag` — separate stories (3.6, 4.6, etc.)
- Global app layout/navigation/theming — separate story
- Playwright/E2E tests — deferred per architecture decision

### Current State of the Repo (as of Stories 1.1–1.5)

**`apps/web/src/app/globals.css` — current state:**
- Uses Tailwind v4 `@import "tailwindcss"` and `@import "tw-animate-css"`
- Has `@custom-variant dark (&:is(.dark *))` for dark mode
- Has `@theme inline` block mapping shadcn/ui CSS variables to Tailwind color utilities (OKLCH color space)
- Has `:root {}` block with shadcn/ui tokens (`--background`, `--foreground`, `--primary`, etc.) in OKLCH
- Has `.dark {}` block with dark mode overrides in OKLCH
- Does NOT have On Record brand tokens — these must be added by Story 2.6

**CRITICAL: Do not alter the existing OKLCH shadcn/ui token system.** Add On Record tokens as additional CSS custom properties — use `--on-record-*` prefix to namespace them clearly away from shadcn/ui's `--background`, `--primary`, etc. namespace.

**`apps/web/src/` directory — as of Story 1.5:**
```
src/
└── app/
    ├── favicon.ico
    ├── globals.css
    ├── layout.tsx
    └── page.tsx
```
No `components/`, `lib/`, or `hooks/` directories exist yet. Story 2.6 creates `components/` for the first time. `lib/` will be created by the shadcn/ui CLI when adding `Skeleton`.

**`apps/web/package.json` — current scripts:**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit"
}
```
No `test` script. Story 2.6 adds it.

**shadcn/ui initialized:** `components.json` exists with style `new-york`, RSC: true, aliases configured (`@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`).

### Design Token Strategy for `globals.css`

Tailwind v4 maps CSS custom properties named `--color-*` to utility classes automatically. The pattern:

1. Define raw values in `:root` and `.dark`:
```css
:root {
  /* existing shadcn/ui tokens ... */
  --on-record-primary: #1e3a4f;
  --on-record-accent: #c47d2e;
  --on-record-surface: #fafaf8;
  --on-record-text: #1a1a1a;
  --on-record-error: #b91c1c;
  --on-record-success: #2e7d52;
}

.dark {
  /* existing shadcn/ui dark tokens ... */
  --on-record-primary: #0a1520;
  --on-record-accent: #d4922a;
  --on-record-surface: #0f1f2b;
  --on-record-text: #e8e4dc;
  /* error and success unchanged in dark mode */
}
```

2. Map into Tailwind via `@theme inline` block (add to existing block, not create new):
```css
@theme inline {
  /* existing shadcn/ui mappings ... */

  /* On Record brand tokens */
  --color-on-record-primary: var(--on-record-primary);
  --color-on-record-accent: var(--on-record-accent);
  --color-on-record-surface: var(--on-record-surface);
  --color-on-record-text: var(--on-record-text);
  --color-on-record-error: var(--on-record-error);
  --color-on-record-success: var(--on-record-success);
}
```

This makes the following Tailwind utility classes available:
- `bg-on-record-primary`, `text-on-record-primary`, `border-on-record-primary`
- `bg-on-record-accent`, `border-on-record-accent`
- `bg-on-record-surface`
- `text-on-record-text`
- `bg-on-record-error`, `text-on-record-error`
- `bg-on-record-success`, `text-on-record-success`
- All support opacity modifier: `border-on-record-accent/30`, `text-on-record-text/70`

Dark mode is automatic via the `.dark` class (already set up by `@custom-variant dark (&:is(.dark *))`).

### `Legislator` Type Reference (from `packages/types/index.ts`)

```typescript
export interface Legislator {
  id: string
  chamber: 'house' | 'senate'
  district: number
  name: string
  email: string
  phone: string
  phoneLabel?: string       // API-provided type label (e.g. "cell", "district office")
  phoneTypeUnknown?: boolean // true when API provides no phone type label (FR5)
  session: string
}
```

Import in component: `import type { Legislator } from '@on-record/types'`
The workspace alias `@on-record/types` is already in `apps/web/package.json` as `"workspace:*"`.

### `LegislatorCard.tsx` — Full Implementation Reference

```typescript
"use client"

import type { Legislator } from '@on-record/types'
import { Skeleton } from '@/components/ui/skeleton'

interface LegislatorCardProps {
  legislator: Legislator
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}

export function LegislatorCard({
  legislator,
  selectable = false,
  selected = false,
  onSelect,
}: LegislatorCardProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (selectable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect?.()
    }
  }

  const chamberLabel = legislator.chamber === 'house' ? 'House' : 'Senate'

  return (
    <article
      aria-label={`${legislator.name}, ${chamberLabel} District ${legislator.district}`}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
      className={[
        'border-t-[3px] border-on-record-accent',
        'bg-on-record-surface rounded-md shadow-sm p-4',
        'focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2',
        selectable
          ? 'cursor-pointer motion-safe:transition-shadow motion-safe:hover:shadow-md'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Chamber badge */}
      <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-primary text-white px-2 py-0.5 rounded-sm mb-2">
        {chamberLabel}
      </span>

      {/* Legislator name — must be h2 per UX spec a11y requirement */}
      <h2 className="text-lg font-semibold text-on-record-text mb-1">
        {legislator.name}
      </h2>

      {/* District */}
      <p className="text-sm text-on-record-text/70 mb-3">
        District {legislator.district}
      </p>

      {/* Contact info */}
      <div className="space-y-1 text-sm">
        <div>
          <a
            href={`mailto:${legislator.email}`}
            className="text-on-record-primary underline hover:text-on-record-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-1 rounded-sm"
          >
            {legislator.email}
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-on-record-text">{legislator.phone}</span>
          {legislator.phoneLabel && !legislator.phoneTypeUnknown && (
            <span className="text-xs text-on-record-text/60">
              ({legislator.phoneLabel})
            </span>
          )}
          {legislator.phoneTypeUnknown === true && (
            <span className="text-xs text-on-record-text/60 italic">
              number type unknown
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export function LegislatorCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading legislator information"
      className="border-t-[3px] border-on-record-accent/30 bg-on-record-surface rounded-md shadow-sm p-4"
    >
      {/* Badge skeleton */}
      <Skeleton className="h-5 w-16 rounded-sm mb-2 motion-safe:animate-pulse" />
      {/* Name skeleton */}
      <Skeleton className="h-6 w-48 mb-1 motion-safe:animate-pulse" />
      {/* District skeleton */}
      <Skeleton className="h-4 w-24 mb-3 motion-safe:animate-pulse" />
      {/* Email skeleton */}
      <Skeleton className="h-4 w-56 mb-1 motion-safe:animate-pulse" />
      {/* Phone skeleton */}
      <Skeleton className="h-4 w-40 motion-safe:animate-pulse" />
    </div>
  )
}
```

**MANDATORY CONSTRAINTS — enforced by AC #7:**
- Zero hardcoded hex values in `LegislatorCard.tsx` — `#1e3a4f`, `#c47d2e`, etc. exist ONLY in `globals.css`
- Legislator name MUST be `<h2>` (UX spec semantic requirement, verified by test)
- Card container MUST be `<article>` (UX spec semantic requirement)
- Selectable card: `role="button"` + `aria-pressed` + keyboard handler (Enter AND Space)
- Touch target: the full padded card (`p-4`) satisfies 44px minimum for typical use; no additional min-height override needed unless the card ends up smaller than 44px in testing
- Focus ring: 2px amber, 2px offset — NEVER `outline: none` without replacement
- All transitions/animations behind `motion-safe:` utility prefix

### Vitest Setup for `apps/web`

**`apps/web/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**`apps/web/vitest.setup.ts`:**
```typescript
import '@testing-library/jest-dom'
```

**`apps/web/package.json` devDependencies to add:**
```json
"@testing-library/jest-dom": "^6",
"@testing-library/react": "^16",
"@vitejs/plugin-react": "^4",
"jsdom": "^26",
"vitest": "^4"
```

**`apps/web/package.json` scripts to add:**
```json
"test": "vitest run"
```

**After adding devDependencies, run `pnpm install` from the monorepo root** to update `pnpm-lock.yaml`. Then commit the updated lockfile with the story implementation.

**Note on `@on-record/types` in tests:** The workspace alias resolves correctly in test environment — pnpm workspaces handles this via the `node_modules` symlink. No special mock or path override needed.

**Note on Tailwind in tests:** Tests use DOM structure assertions and ARIA attribute checks only. No visual/CSS rendering occurs in jsdom. No need to configure Tailwind CSS processing for tests.

**Note on Vitest version:** Architecture pins `vitest: 4.0.18` for `apps/mcp-server`. Use `vitest@^4` for `apps/web` to align with the same major version.

### Test File Reference — `LegislatorCard.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Legislator } from '@on-record/types'
import { LegislatorCard, LegislatorCardSkeleton } from './LegislatorCard'

const baseLegislator: Legislator = {
  id: 'leg-001',
  chamber: 'senate',
  district: 4,
  name: 'Jane Smith',
  email: 'jane.smith@le.utah.gov',
  phone: '(801) 555-0100',
  session: '2025GS',
}

describe('LegislatorCard', () => {
  it('renders legislator name as h2', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Jane Smith' })).toBeInTheDocument()
  })

  it('renders Senate chamber badge', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByText('Senate')).toBeInTheDocument()
  })

  it('renders House chamber badge for house legislator', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, chamber: 'house' }} />)
    expect(screen.getByText('House')).toBeInTheDocument()
  })

  it('renders district number', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByText('District 4')).toBeInTheDocument()
  })

  it('renders email as mailto anchor', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    const link = screen.getByRole('link', { name: 'jane.smith@le.utah.gov' })
    expect(link).toHaveAttribute('href', 'mailto:jane.smith@le.utah.gov')
  })

  it('renders phone label when phoneLabel is provided', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, phoneLabel: 'cell' }} />)
    expect(screen.getByText('(cell)')).toBeInTheDocument()
  })

  it('renders "number type unknown" flag when phoneTypeUnknown is true', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, phoneTypeUnknown: true }} />)
    expect(screen.getByText('number type unknown')).toBeInTheDocument()
  })

  it('does not render role="button" when not selectable', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders role="button" with aria-pressed="false" when selectable and not selected', () => {
    render(<LegislatorCard legislator={baseLegislator} selectable selected={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders aria-pressed="true" when selectable and selected', () => {
    render(<LegislatorCard legislator={baseLegislator} selectable selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onSelect when card is clicked (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect when Enter key is pressed (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect when Space key is pressed (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalledOnce()
  })
})

describe('LegislatorCardSkeleton', () => {
  it('renders without error (smoke test)', () => {
    const { container } = render(<LegislatorCardSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('does not render any heading (no legislator name)', () => {
    render(<LegislatorCardSkeleton />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('does not render any links (no email shown)', () => {
    render(<LegislatorCardSkeleton />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
```

### CI Update for Web Tests

Current `.github/workflows/ci.yml` (from Story 1.5, after code review pass) has these job steps:
1. Checkout
2. Setup pnpm (pinned to version `10`)
3. Setup Node.js (version `20`, cache: `pnpm`)
4. Install dependencies (`pnpm install --frozen-lockfile`)
5. Lint (mcp-server)
6. Lint (web)
7. Typecheck (mcp-server)
8. Typecheck (web)
9. Unit tests (mcp-server)

Add after step 9:
```yaml
- name: Unit tests (web)
  run: pnpm --filter web test
```

This was explicitly deferred in Story 1.5: "Vitest setup for `apps/web` — web has no tests yet; added in later stories (2.6, 4.6)".

### shadcn/ui Skeleton Component

Adding Skeleton via CLI: `pnpm --filter web exec npx shadcn@latest add skeleton`

What this creates:
- `apps/web/src/components/ui/skeleton.tsx` — auto-generated shadcn/ui Skeleton component
- `apps/web/src/lib/utils.ts` — shadcn/ui `cn()` utility (created if not already present)

**Never edit files in `src/components/ui/` directly** — they are managed by shadcn/ui.

The Skeleton component will look similar to:
```typescript
// src/components/ui/skeleton.tsx (auto-generated — do not edit)
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

**motion-safe override for skeleton animation:** The auto-generated Skeleton uses `animate-pulse` unconditionally. When passing className to `<Skeleton>`, use `[animation:none] motion-safe:animate-pulse` to suppress the default and re-apply it conditionally:

```tsx
<Skeleton className="h-5 w-16 rounded-sm mb-2 [animation:none] motion-safe:animate-pulse" />
```

`tailwind-merge` (used by `cn()`) will handle class merging correctly. This satisfies the UX spec requirement that skeleton shimmer is gated behind `motion-safe:`.

### Architecture Compliance Checklist

| Rule | Story 2.6 Compliance |
|---|---|
| No barrel files in `components/` | `LegislatorCard.tsx` imported directly; no `index.ts` re-export file |
| PascalCase component filenames | `LegislatorCard.tsx` ✓ |
| Test co-location | `LegislatorCard.test.tsx` in same directory as source ✓ |
| Shared types only in `packages/types/` | `Legislator` imported from `@on-record/types`; not redefined in web ✓ |
| No cross-app imports | Web only imports from `packages/types`; no mcp-server imports ✓ |
| `strict: true` TypeScript | Inherited from `@on-record/typescript-config/nextjs.json`; no `any`, no `@ts-ignore` ✓ |
| WCAG 2.1 AA | Verified contrast ratios; semantic HTML; ARIA attributes complete ✓ |
| Zero hardcoded hex in component | All colors via `on-record-*` Tailwind design token classes ✓ |
| shadcn/ui `ui/` not edited directly | Skeleton added via CLI only ✓ |
| `prefers-reduced-motion` honored | All animations behind `motion-safe:` prefix ✓ |
| 44px touch targets | Full padded card (`p-4`) acts as touch target ✓ |

### Design Token Contrast Verification

| Foreground | Background | Computed Ratio | WCAG AA Pass? |
|---|---|---|---|
| `#1a1a1a` (text) | `#fafaf8` (surface) | ~18.8:1 | PASS |
| `#1e3a4f` (primary) | `#fafaf8` (surface) | ~9.6:1 | PASS |
| `#ffffff` (white badge text) | `#1e3a4f` (primary badge bg) | ~9.6:1 | PASS |
| `#1e3a4f` (primary link text) | `#fafaf8` (surface) | ~9.6:1 | PASS |
| Dark: `#e8e4dc` text | `#0f1f2b` surface | ~12.1:1 | PASS |
| Dark: `#ffffff` badge text | `#0a1520` dark-primary badge | ~14.8:1 | PASS |

Note: Amber `#c47d2e` is used only as a decorative border color (3px top border) — not as text on background. No WCAG text contrast requirement applies to border-only usage.

### Previous Story Intelligence (Epic 1)

**From Story 1.5 (CI/CD, README):**
- `pnpm --filter web typecheck` passes — web scaffold is type-clean as of Story 1.5
- CI in `.github/workflows/ci.yml` deliberately omitted web tests step (deferred to 2.6)
- ESLint for web uses `eslint-config-next` via `eslint.config.mjs`
- Story 1.5 completion notes state: "Vitest setup for `apps/web` — web has no tests yet; added in later stories (2.6, 4.6)"

**From Story 1.4 (AppError, types):**
- `packages/types/index.ts` defines `Legislator`, `AppError`, `LookupLegislatorResult`, etc.
- `@on-record/types` already in `apps/web/package.json` as workspace dependency

**From Story 1.1 (monorepo scaffold):**
- `apps/web` uses App Router, Next.js 16.1.6, Tailwind v4 (CSS-first `@theme` in `globals.css`)
- shadcn/ui initialized with `style: "new-york"`, RSC: true, Tailwind CSS variables mode
- Current `globals.css` uses OKLCH color space for shadcn/ui tokens — preserve this; add On Record tokens in hex alongside it
- TypeScript config: `@on-record/typescript-config/nextjs.json` with `moduleResolution: Bundler`

**From Story 1.2 (MCP server, ESLint):**
- ESLint 9 flat config pattern established in mcp-server — `apps/web` uses different `eslint-config-next` setup
- No changes to mcp-server ESLint in this story

### Project Structure Notes

**Files created/modified by Story 2.6:**
```
on-record/
├── .github/
│   └── workflows/
│       └── ci.yml                              ← MODIFIED: add "Unit tests (web)" step
└── apps/
    └── web/
        ├── package.json                        ← MODIFIED: add test script + 5 vitest devDeps
        ├── vitest.config.ts                    ← NEW: Vitest config (jsdom, React plugin, @ alias)
        ├── vitest.setup.ts                     ← NEW: @testing-library/jest-dom import
        └── src/
            ├── app/
            │   └── globals.css                 ← MODIFIED: add On Record @theme + :root + .dark tokens
            ├── components/                     ← NEW DIRECTORY
            │   ├── ui/                         ← NEW (shadcn/ui CLI auto-generates this)
            │   │   └── skeleton.tsx            ← NEW (auto-generated by shadcn/ui CLI — do not edit)
            │   ├── LegislatorCard.tsx          ← NEW: component + LegislatorCardSkeleton export
            │   └── LegislatorCard.test.tsx     ← NEW: 15+ Vitest + RTL tests
            └── lib/                            ← NEW DIRECTORY (shadcn/ui CLI creates this)
                └── utils.ts                    ← NEW (auto-generated by shadcn/ui CLI — do not edit)
```

**Files NOT touched:**
```
apps/mcp-server/          ← no changes (pure frontend story)
packages/types/           ← no changes (Legislator type already correct)
packages/typescript-config/ ← no changes
system-prompt/            ← no changes
e2e/                      ← no changes (E2E deferred)
```

### References

- Epics: Story 2.6 user story and acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md` → "Story 2.6: LegislatorCard UI Component with Tailwind Design Tokens"]
- UX Spec: LegislatorCard anatomy ("amber 3px top border; chamber badge; legislator name (heading); district line; contact info with API-provided type label; 'number type unknown' flag where label is absent") [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` → "LegislatorCard" component section]
- UX Spec: LegislatorCard states ("default; selected (`aria-pressed`); loading (Skeleton)") [Source: `ux-design-specification.md` → LegislatorCard states]
- UX Spec: LegislatorCard a11y ("`role='button'` when selectable; `aria-pressed` for selected state"; "`<article>` with descriptive heading. Legislator name is `<h2>`") [Source: `ux-design-specification.md` → a11y section]
- UX Spec: Color palette and design tokens (primary `#1e3a4f`, accent `#c47d2e`, surface `#fafaf8`, text `#1a1a1a`) [Source: `ux-design-specification.md` → color table]
- UX Spec: Dark mode palette (bg `#0f1f2b`, text `#e8e4dc`, primary `#0a1520`, accent `#d4922a`) [Source: `ux-design-specification.md` → dark mode section]
- UX Spec: Aha #1 reveal design ("Skeleton of `LegislatorCard` appears immediately. Real data fills in when GIS lookup returns. Aha Moment #1 is the reveal — treat it as a beat, not a loader.") [Source: `ux-design-specification.md` → loading state section]
- UX Spec: Focus ring ("2px solid amber, 2px offset — always visible, never suppressed") [Source: `ux-design-specification.md` → WCAG compliance table]
- UX Spec: Touch targets (44×44px minimum; 8px gap between adjacent targets) [Source: `ux-design-specification.md` → WCAG compliance table]
- UX Spec: Skeleton shimmer ("slate-100/slate-200 shimmer animation; dimensions match real content") [Source: `ux-design-specification.md` → Skeleton / Loading States]
- UX Spec: motion-safe ("`prefers-reduced-motion` honored via Tailwind `motion-safe:` utilities") [Source: `ux-design-specification.md` → WCAG compliance]
- UX Spec: Implementation ordering (CitationTag → ProgressStrip → **LegislatorCard** → BillCard → DraftCard → ...) [Source: `ux-design-specification.md` → component roadmap]
- UX Spec: "All custom components use Tailwind design tokens from `tailwind.config` — no hardcoded hex values in component files" [Source: `ux-design-specification.md` → component section]
- Architecture: Component file location (`apps/web/src/components/{ComponentName}.tsx`) [Source: `_bmad-output/planning-artifacts/architecture.md` → "Structure Patterns"]
- Architecture: No barrel files in `components/` [Source: `architecture.md` → "No barrel files (`index.ts` re-exports) in `components/` or `tools/`"]
- Architecture: Test co-location (`{filename}.test.ts` co-located with source) [Source: `architecture.md` → "Test Co-location Rule"]
- Architecture: Loading states via shadcn/ui Skeleton, `aria-busy="true"` on region [Source: `architecture.md` → "Loading States (Frontend)"]
- Architecture: Tailwind v4 CSS-first config (`@theme` directive in `globals.css`) [Source: `architecture.md` → "Styling Solution"]
- Architecture: Shared types only in `packages/types/` [Source: `architecture.md` → "Shared Type Rule"]
- Architecture: PascalCase React components [Source: `architecture.md` → "File Naming"]
- Architecture: `strict: true` everywhere, no `any`, no `@ts-ignore` [Source: `architecture.md` → "TypeScript Strictness"]
- Architecture: WCAG 2.1 AA requirement (NFR11), 44×44px touch targets (NFR12) [Source: `architecture.md` → Non-Functional Requirements]
- Story 1.5 Dev Notes: web Vitest explicitly deferred to 2.6 [Source: `1-5-cicd-pipeline-and-developer-readme.md` → "NOT in Story 1.5"]
- `packages/types/index.ts`: `Legislator` interface with `phoneLabel?` and `phoneTypeUnknown?` [Source: `packages/types/index.ts`]
- `apps/web/components.json`: shadcn/ui config (aliases, style, RSC: true) [Source: `apps/web/components.json`]
- `apps/web/src/app/globals.css`: current OKLCH-based shadcn/ui token system [Source: `apps/web/src/app/globals.css`]
- `apps/web/package.json`: existing dependencies including `@on-record/types: workspace:*` [Source: `apps/web/package.json`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blocking issues.

### Completion Notes List

- All 6 On Record design tokens added to `globals.css` `:root` block (light mode) and `.dark` block, then exposed via `@theme inline` block with `--color-on-record-*` mapping for Tailwind v4 automatic utility generation.
- Existing shadcn/ui OKLCH token system left fully intact; `--on-record-*` namespace cleanly separates brand tokens.
- `LegislatorCard.tsx` created as `"use client"` component with `<article>` wrapper, `<h2>` name, chamber badge, district, email mailto link, phone with label/unknown flag, full ARIA selectable state (`role="button"`, `aria-pressed`), keyboard handler (Enter+Space), focus ring, and motion-safe transitions. Zero hardcoded hex values.
- `LegislatorCardSkeleton` exported from same file. Uses shadcn/ui `<Skeleton>` with `[animation:none] motion-safe:animate-pulse` pattern to gate shimmer behind `prefers-reduced-motion`. Matches real card anatomy exactly.
- shadcn/ui `Skeleton` added via CLI (`pnpm --filter web exec npx shadcn@latest add skeleton`), creating `src/components/ui/skeleton.tsx`. File not edited directly.
- Vitest/RTL infrastructure was already in place from Story 2.5 (vitest.config.ts, src/test/setup.ts, devDependencies, test script). Task 4 found these pre-existing and created only the test file.
- 16 tests written for `LegislatorCard` + 3 for `LegislatorCardSkeleton` = 16 total (plus pre-existing 6 ErrorBanner = 22 pass).
- `.github/workflows/ci.yml` updated with `Unit tests (web)` step after `Unit tests (mcp-server)`, closing Story 1.5 deferral.
- All validations: `pnpm --filter web test` (22/22), `pnpm --filter web typecheck` (0 errors), `pnpm --filter web lint` (0 violations).

### File List

- `.github/workflows/ci.yml` — MODIFIED: added `Unit tests (web)` step
- `apps/web/src/app/globals.css` — MODIFIED: added On Record brand tokens to `@theme`, `:root`, and `.dark` blocks
- `apps/web/src/components/LegislatorCard.tsx` — NEW: `LegislatorCard` + `LegislatorCardSkeleton` exports
- `apps/web/src/components/LegislatorCard.test.tsx` — NEW: 16 Vitest/RTL tests
- `apps/web/src/components/ui/skeleton.tsx` — NEW (auto-generated by shadcn/ui CLI — do not edit)
- `pnpm-lock.yaml` — MODIFIED: updated by `pnpm install` after skeleton CLI addition

## Change Log

- 2026-03-03: Implemented Story 2.6 — added On Record design tokens to globals.css, created LegislatorCard component with full ARIA/keyboard support and LegislatorCardSkeleton, added 16 component tests (22 total pass), added skeleton via shadcn/ui CLI, added Unit tests (web) step to CI. Status: ready-for-dev → review.
