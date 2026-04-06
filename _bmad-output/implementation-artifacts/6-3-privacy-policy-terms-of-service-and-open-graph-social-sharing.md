# Story 6-3: Privacy Policy, Terms of Service, and Open Graph Social Sharing

Status: done

## Story

As a **visitor**,
I want to access the privacy policy and terms of service from the landing page and share the tool on social media with a proper preview,
So that I trust On Record's data practices, understand the terms of use, and can easily spread the word through my network.

## Acceptance Criteria

1. Privacy policy page is accessible at `/privacy` (`apps/web/src/app/privacy/page.tsx`) and the content states: address is collected for legislator lookup only, retained for session duration only, not sold or shared with third parties, and not persistently stored (FR32).
2. Terms of service page is accessible at `/terms` (`apps/web/src/app/terms/page.tsx`) and the content covers: description of the service, appropriate use, no warranty, limitation of liability, governing law (Utah), and contact information.
3. A site-wide footer component (`apps/web/src/components/Footer.tsx`) renders on every page via `apps/web/src/app/layout.tsx` and links to both `/privacy` and `/terms`.
4. Open Graph meta tags are added to the root layout or landing page metadata export: `og:title`, `og:description`, `og:image` (value: `/og-image.png`), `og:type` (`website`), and `og:url`.
5. A placeholder `og-image.png` (1200×630px) is placed at `apps/web/public/og-image.png`.
6. Both `/privacy` and `/terms` pages are statically generated (SSG) — no `'use client'` directive, no dynamic data fetching.
7. `pnpm --filter web typecheck` exits 0 and `pnpm --filter web build` exits 0.

## Tasks / Subtasks

- [x] Task 1: Create `apps/web/src/components/Footer.tsx` (AC: 3)
  - [ ] Simple semantic `<footer>` with links to `/privacy` and `/terms` using Next.js `<Link>` from `next/link`
  - [ ] Uses Tailwind design tokens (no hardcoded hex values) — use `text-[color:var(--on-record-accent)]` pattern or Tailwind token classes
  - [ ] Meets 44×44px touch target minimum for all links (NFR12)
  - [ ] Keyboard navigable with visible focus indicator: `focus-visible:` ring, never `outline: none` without replacement
  - [ ] Footer text is accessible — sufficient contrast (≥4.5:1 WCAG AA, NFR11)
  - [ ] No barrel file (`components/index.ts`) — named export from `Footer.tsx` directly
  - [ ] No `'use client'` directive — footer is a server component

- [x] Task 2: Add `Footer` to root layout (AC: 3)
  - [ ] Import `Footer` from `'../components/Footer'` in `apps/web/src/app/layout.tsx`
  - [ ] Place `<Footer />` inside `<body>` after `{children}`
  - [ ] Do NOT add 'use client' to layout — keep it a server component
  - [ ] Layout already imports `globals.css` — no additional CSS imports needed

- [x] Task 3: Add Open Graph metadata to landing page (AC: 4)
  - [ ] In `apps/web/src/app/page.tsx`, update or add the `metadata` export (Next.js App Router `Metadata` type from `next`):
    ```typescript
    export const metadata: Metadata = {
      title: 'On Record — Contact Your Utah Legislator',
      description: 'Write your Utah state representative or senator in minutes. On Record guides you through the process using your own chatbot.',
      openGraph: {
        title: 'On Record — Contact Your Utah Legislator',
        description: 'Write your Utah state representative or senator in minutes.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
        type: 'website',
        url: 'https://getonrecord.org',
      },
    }
    ```
  - [ ] If `page.tsx` already exports metadata (from Story 6.1 implementation), merge OG tags into that object rather than creating a second export
  - [ ] `og:image` references `/og-image.png` (relative path is correct — Next.js resolves from `public/`)

- [x] Task 4: Add `og-image.png` placeholder to `public/` (AC: 5)
  - [ ] Create a valid 1200×630 PNG at `apps/web/public/og-image.png`
  - [ ] The image can be a simple branded placeholder (dark navy background `#1e3a4f`, white "On Record" text) — it does NOT need to be production-quality for this story; the acceptance criterion is only that a valid file exists at the correct path and dimensions
  - [ ] Do NOT use the existing SVG assets (`next.svg`, `vercel.svg`) as the OG image
  - [ ] Standard OG image dimensions: 1200×630px (2:1 aspect ratio is correct for most platforms)

- [x] Task 5: Create `apps/web/src/app/privacy/page.tsx` (AC: 1, 6)
  - [ ] File path: `apps/web/src/app/privacy/page.tsx`
  - [ ] No `'use client'` directive — statically generated server component
  - [ ] Export `metadata: Metadata` with `{ title: 'Privacy Policy — On Record' }`
  - [ ] Semantic HTML: `<main>`, `<h1>`, `<h2>`, `<p>`, `<ul>` — no raw divs for content
  - [ ] Required content (must address all points in AC 1):
    - What data is collected: home address (entered by the user to identify their legislators)
    - Purpose: address is used only for legislator lookup — no other purpose
    - Retention: address is not stored beyond the session; no persistent storage
    - Third parties: address is not sold or shared with third parties
    - Contact information for privacy questions
  - [ ] Plain language — 8th grade reading level target (matches Epic 6 brand voice)
  - [ ] Uses Tailwind prose-style layout; respects design tokens (no hardcoded hex)
  - [ ] Skip link compatibility: page has a `<main id="main-content">` or equivalent for skip link target (NFR11)

- [x] Task 6: Create `apps/web/src/app/terms/page.tsx` (AC: 2, 6)
  - [ ] File path: `apps/web/src/app/terms/page.tsx`
  - [ ] No `'use client'` directive — statically generated server component
  - [ ] Export `metadata: Metadata` with `{ title: 'Terms of Service — On Record' }`
  - [ ] Semantic HTML: `<main>`, `<h1>`, `<h2>`, `<p>`, `<ul>`
  - [ ] Required content sections (all must be present per AC 2):
    - **Description of the service**: On Record is a civic tool that helps Utah residents contact their state legislators
    - **Appropriate use**: tool is for lawful civic communication; not for spam, harassment, or misrepresentation
    - **No warranty**: service provided as-is; no guarantee of accuracy or availability
    - **Limitation of liability**: project maintainers are not liable for outcomes of constituent messages
    - **Governing law**: disputes governed by Utah law
    - **Contact information**: how to reach the project maintainer
  - [ ] Plain language — 8th grade reading level target where possible (legal sections may use standard legal phrasing)
  - [ ] Uses same Tailwind layout pattern as `/privacy`

- [x] Task 7: Final verification (AC: 7)
  - [ ] `pnpm --filter web typecheck` — zero TypeScript errors
  - [ ] `pnpm --filter web build` — successful build, no 404 for `/privacy`, `/terms`, or `/og-image.png`
  - [ ] Confirm `Footer.tsx` does NOT have `'use client'`
  - [ ] Confirm no `components/index.ts` barrel file was created
  - [ ] Confirm `og-image.png` is in `apps/web/public/` (not `apps/web/src/`)
  - [ ] Confirm both policy pages export `metadata` (not just `generateMetadata`)

## Dev Notes

### Next.js App Router — Metadata API

Next.js 16 App Router uses the `Metadata` type exported from `next`. Static metadata is a named export from any `page.tsx` or `layout.tsx`:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '...',
  openGraph: { ... },
}
```

Open Graph `images` accepts an array of objects `{ url, width, height, alt }`. For `/og-image.png` from `public/`, the `url` value should be `'/og-image.png'` (relative). Next.js resolves this correctly for OG meta tag output.

Do NOT use `<Head>` tags — that's the Pages Router pattern. App Router uses the `metadata` export exclusively.

### File Locations

The web app uses the `src/` directory layout:
- Routes: `apps/web/src/app/[route]/page.tsx`
- Components: `apps/web/src/components/ComponentName.tsx`
- Global styles: `apps/web/src/app/globals.css`
- Static assets: `apps/web/public/` (served at root URL path)
- Root layout: `apps/web/src/app/layout.tsx`

### Footer Component — Server Component Pattern

The footer is a server component (no `'use client'`). Use Next.js `<Link>` for internal navigation:

```typescript
import Link from 'next/link'

export function Footer() {
  return (
    <footer>
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Service</Link>
    </footer>
  )
}
```

Named export (not default export) is preferred for non-page components — consistent with existing components (`BillCard`, `CitationTag`, `ErrorBanner`, `LegislatorCard`).

### Design Token Usage

Existing design tokens from `globals.css`:
- Primary (dark navy): `--on-record-primary: #1e3a4f`
- Accent (amber): `--on-record-accent: #c47d2e`
- Surface: `--on-record-surface: #fafaf8`
- Text: `--on-record-text: #1a1a1a`
- Error: `--on-record-error: #b91c1c`
- Success: `--on-record-success: #2e7d52`

In Tailwind v4 (`@theme inline` block in globals.css), these are mapped as:
- `text-[color:var(--on-record-accent)]`
- `bg-[color:var(--on-record-primary)]`

Or use the `--color-on-record-*` CSS custom property names defined in `@theme inline`:
- `text-on-record-accent` (if Tailwind v4 resolves these via the `--color-` prefix convention)

Check `globals.css` lines 48–55 for the exact token names registered in `@theme inline`. Do NOT hardcode `#1e3a4f` or `#c47d2e` in component files.

### Accessibility Requirements (NFR11, NFR12)

- Focus ring: `2px solid amber, 2px offset` — use `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--on-record-accent)]`
- Never `outline: none` without replacement
- Touch targets: 44×44px minimum — ensure footer links have `min-h-[44px] min-w-[44px]` or equivalent padding
- Color contrast: footer text must meet 4.5:1 against background

### OG Image — Placeholder Approach

Story 6.1 (landing page) is a prerequisite for production OG images, but for this story, a simple programmatically-created PNG is acceptable. Options:
- A solid-color 1200×630 PNG committed directly to `public/`
- If you cannot create a PNG directly, create a 1200×630 JPEG as a fallback — browsers and social platforms accept both
- The file MUST be a valid image binary, not a text file with a `.png` extension

The simplest approach: create a minimal valid PNG using a script or place a pre-generated placeholder. The content itself is not acceptance-tested — only the presence of a valid file at the correct path and dimensions matters for this story.

### Scope — What This Story IS and IS NOT

**Creates:**
- `apps/web/src/components/Footer.tsx`
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/public/og-image.png`

**Modifies:**
- `apps/web/src/app/layout.tsx` — add `<Footer />` inside `<body>`
- `apps/web/src/app/page.tsx` — add/merge Open Graph metadata

**NOT in this story:**
- `apps/web/src/app/setup/page.tsx` — created by Story 6.2; do NOT modify it unless you need to verify the footer renders there (it will automatically from the layout)
- `ReadingPreferences` component — Story 6.4; the footer from this story must leave room for it to be added later
- `ProgressStrip` component — already exists (referenced in Epic 4); do not re-implement
- Any MCP server changes — this story is frontend-only
- Legal review — the policy and terms content is a reasonable draft for MVP; no legal review is required before implementing

### Cross-Story Awareness (Epic 6 Context)

Story 6.1 (SEO-Optimized Landing Page) may have already implemented `app/page.tsx` with some metadata. Check the current state of `page.tsx` before overwriting the `metadata` export — merge OG fields into whatever is already there rather than replacing existing SEO-critical title/description tags.

Story 6.2 (BYOLLM Setup Flow) creates `app/setup/page.tsx`. The footer from this story will automatically appear on `/setup` because it's in the root layout — no additional work needed.

Story 6.4 (ReadingPreferences) will add a component to the footer area. When building `Footer.tsx`, use a layout pattern that allows the footer content to be extended (e.g., a `<div className="flex flex-col gap-2">` or `<nav>` that can have additional items added alongside the policy links).

### No Barrel Files

Do NOT create `apps/web/src/components/index.ts`. Import Footer directly:
```typescript
import { Footer } from '../components/Footer'
```
This is enforced by the project's ESLint config (CLAUDE.md architectural rule).

### `pnpm` Workspace Commands

Run checks from the repo root:
```bash
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web lint
```

### Architecture Reference

- Next.js 16.1.6 App Router metadata API [Source: apps/web/package.json]
- Tailwind v4 design tokens [Source: apps/web/src/app/globals.css]
- No barrel files in `components/` [Source: CLAUDE.md]
- No `any`, strict TypeScript [Source: CLAUDE.md]
- FR32: privacy policy linked from landing page [Source: _bmad-output/planning-artifacts/epics.md]
- FR30: SEO / Open Graph for social sharing [Source: _bmad-output/planning-artifacts/epics.md]
- NFR1: Lighthouse ≥90 — static pages satisfy this [Source: _bmad-output/planning-artifacts/epics.md]
- NFR7: no persistent PII storage — privacy policy must accurately reflect this [Source: _bmad-output/planning-artifacts/epics.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- `Footer.tsx`, `layout.tsx` (Footer import + render), and `page.tsx` (OG metadata) were already implemented before this session.
- `og-image.png` (1200×630px) was pre-generated and placed at `apps/web/public/og-image.png`.
- Created `apps/web/src/app/privacy/page.tsx` and `apps/web/src/app/terms/page.tsx` — both are static server components with no `'use client'`, exporting `metadata` with page titles.
- `pnpm --filter web typecheck` exits 0; `pnpm --filter web build` exits 0 with `/privacy` and `/terms` as static (○) routes.

### File List

- `apps/web/src/components/Footer.tsx` — new (site-wide footer with `/privacy` and `/terms` links)
- `apps/web/src/app/privacy/page.tsx` — new (privacy policy static page)
- `apps/web/src/app/terms/page.tsx` — new (terms of service static page)
- `apps/web/public/og-image.png` — new (1200×630px OG image placeholder)
- `apps/web/src/app/layout.tsx` — modified (add `<Footer />` to `<body>`)
- `apps/web/src/app/page.tsx` — modified (add/merge Open Graph metadata)

## Change Log

- 2026-03-31: Story created — ready for dev
