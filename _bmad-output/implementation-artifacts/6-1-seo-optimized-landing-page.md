# Story 6.1: SEO-Optimized Landing Page

## Story Metadata

- **Story ID:** 6.1
- **Story Key:** 6-1-seo-optimized-landing-page
- **Epic:** 6 — Anyone Can Discover and Set Up the Tool
- **Status:** ready-for-dev
- **Date Created:** 2026-03-31

---

## User Story

As a **visitor**,
I want a clear, plain-language landing page that explains On Record and what it does,
So that I understand the tool and trust it enough to set it up — even if I've never heard of MCP.

---

## Acceptance Criteria

**Given** a visitor arrives at the root URL (`/`)
**When** the page loads
**Then** `app/page.tsx` is a **Server Component with no `'use client'` directive** — it is statically generated (SSG) at build time and served from the Vercel CDN (NFR1)
**And** the page explains the tool's purpose and the BYOLLM concept in language accessible to a non-technical PAC attendee — 8th grade reading level target (no jargon like "MCP", "API", or "LLM" in body copy)
**And** the page achieves Lighthouse performance score ≥90 on mobile and desktop (NFR1)
**And** `<head>` meta tags include: `title`, `description`, and keyword-targeting content for "contact Utah legislator," "write my state representative Utah," "email Utah state senator" (FR30)
**And** the primary CTA button links to `/setup` (the BYOLLM setup flow — Story 6.2) and is visually distinct using the amber accent color (FR29)
**And** the page is fully navigable by keyboard with visible focus indicators on all interactive elements (NFR11)
**And** all tap targets (buttons, links) meet 44×44px minimum on mobile (NFR12)
**And** a "Skip to main content" link is the first focusable element, visually hidden until focused (NFR11)
**And** the page renders correctly on 375px viewport (mobile-first)

**Given** a search engine crawls the page
**When** it reads the `<head>`
**Then** the `<title>` tag contains the brand name "On Record" and a civic-action phrase
**And** the `<meta name="description">` tag is 150–160 characters and contains at least one target keyword
**And** the `<link rel="canonical">` tag points to the canonical URL

**Given** a visitor uses a screen reader
**When** they navigate the page
**Then** a single `<main>` landmark is present
**And** the page heading hierarchy starts at `<h1>` (exactly one), then `<h2>` for sections
**And** all images have descriptive `alt` attributes (or `alt=""` for decorative images)

---

## Technical Requirements

### File Deliverables

| File | Action | Notes |
|---|---|---|
| `apps/web/src/app/page.tsx` | **Replace** | Full landing page — remove all Next.js scaffold placeholder content |
| `apps/web/src/app/layout.tsx` | **Update** | Replace placeholder `metadata` with On Record SEO metadata |
| `apps/web/src/app/globals.css` | **No change** | Brand tokens already defined — use them as-is |

No new components are required for this story. Build the landing page entirely within `page.tsx` using Tailwind utility classes and the existing On Record brand tokens. Do not create a separate component file for page sections — keep it self-contained.

### SSG / Rendering

`app/page.tsx` must be a **React Server Component** (no `'use client'`). Next.js App Router renders Server Components as static HTML by default at build time. Do not add `export const dynamic = 'force-dynamic'` or any runtime config. The page must produce zero client-side JavaScript for its own interactivity (it has none — it is purely static content + links).

### Metadata (layout.tsx)

Replace the default `Metadata` export in `layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: 'On Record — Contact Your Utah Legislator',
  description:
    'Write your Utah state representative or senator in minutes. On Record helps you find your legislator, surface their voting record, and send a personal, cited message — using AI you already have.',
  keywords: 'contact Utah legislator, write my state representative Utah, email Utah state senator',
  openGraph: {
    title: 'On Record — Contact Your Utah Legislator',
    description:
      'Find your Utah legislator, surface their record, and send a personal cited message in minutes.',
    url: 'https://getonrecord.org',
    siteName: 'On Record',
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://getonrecord.org',
  },
};
```

Open Graph image (`og:image`) is deferred to Story 6.3 — do not add it here.

### Font: Atkinson Hyperlegible

The UX spec calls for **Atkinson Hyperlegible** (Google Fonts, free, open-source) as the primary typeface — not Geist. This story must:

1. Replace the Geist font imports in `layout.tsx` with Atkinson Hyperlegible via `next/font/google`.
2. Apply the font variable as the body `font-family`.

```typescript
import { Atkinson_Hyperlegible } from 'next/font/google';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
});
```

Update `layout.tsx` body className to use `atkinson.variable` and wire it into the CSS `--font-sans` token.

In `globals.css` `@theme inline` block, change:
```css
--font-sans: var(--font-geist-sans);
```
to:
```css
--font-sans: var(--font-atkinson);
```

The `--font-geist-mono` / `Geist_Mono` import can remain for code snippets if any appear; otherwise remove it.

### Brand Tokens (already in globals.css — use these)

```
--on-record-primary: #1e3a4f   (deep warm slate — top bar, headings)
--on-record-accent:  #c47d2e   (warm amber — primary CTA, highlights)
--on-record-surface: #fafaf8   (off-white — page background)
--on-record-text:    #1a1a1a   (near-black — body text)
--on-record-error:   #b91c1c
--on-record-success: #2e7d52
```

Dark mode tokens are in `.dark { }` block. The landing page inherits dark mode automatically via `prefers-color-scheme` (no toggle — toggle is Story 6.4).

### Landing Page Layout (page.tsx)

Structure the page as a single scrollable column (mobile-first, max-width constrained on desktop):

```
<a> Skip to main content (visually hidden, first focusable)
<header> — top bar: "On Record" wordmark in deep slate, amber accent on brand name
<main id="main-content">
  Section 1: Hero — headline, sub-headline, primary CTA
  Section 2: How it works — 3-step explainer (no jargon)
  Section 3: Who it's for — Deb-persona vignette, trust signals
  Section 4: FAQ — 3–4 common questions (accordion optional, plain HTML acceptable)
<footer> — links: /setup, /privacy (placeholder for 6.3), GitHub repo; legal text
```

**Copy guidance (8th grade reading level — plain language):**

- Headline (h1): something like "Write your Utah legislator in minutes — in your own voice."
- Sub-headline: explain BYOLLM without using that word. E.g.: "On Record works inside Claude.ai or ChatGPT — an AI subscription you already have. No new account. No extra cost."
- How it works (3 steps):
  1. "Connect On Record to your AI assistant (takes about 2 minutes)"
  2. "Tell it what you care about and your home address"
  3. "Get a personal, cited message to send — in your words, not a template"
- CTA button text: "Get started →" or "Connect On Record →"
- Do not use: MCP, API, LLM, API key, JSON, server — anywhere in visible body copy.

**Accessibility requirements for copy:**

- `<h1>`: exactly one, at the top of `<main>` (hero headline)
- `<h2>`: one per major section ("How it works", "Who it's for", "Questions")
- `role="list"` not required on `<ul>` unless resetting list styles; use semantic HTML throughout
- CTA button: use `<a>` with `href="/setup"` styled as a button (not `<button>` — it navigates)
- All icons: `aria-hidden="true"` if decorative

### Tailwind Implementation

Use only Tailwind utility classes and the brand token CSS variables. No inline styles. No custom CSS except what is already in `globals.css`.

Key classes to use for brand colors:
- `bg-[#1e3a4f]` or `text-[var(--on-record-primary)]` for deep slate
- `bg-[#c47d2e]` or `text-[var(--on-record-accent)]` for amber CTA
- `bg-[#fafaf8]` or `bg-[var(--on-record-surface)]` for off-white background

Min tap target size: ensure all links/buttons have `min-h-[44px] min-w-[44px]` or equivalent padding.

Focus indicator: do not suppress the browser default focus outline. Add `focus-visible:ring-2 focus-visible:ring-[#c47d2e]` to interactive elements for the amber focus ring.

### Performance (Lighthouse ≥90)

- No client-side JS for this page (Server Component — no hydration cost)
- Font loading: `next/font` handles optimal loading strategy automatically (no layout shift)
- Images: use `next/image` for any image assets with explicit `width` and `height`. No images are strictly required for this story — avoid adding image assets that aren't designed yet.
- No third-party scripts on this page (analytics, chat widgets)
- `<link rel="canonical">` is handled via the `metadata.alternates.canonical` export — no manual tag needed.

---

## Tests

This story requires a **Playwright E2E test** (not a Vitest unit test — the value is verifying the rendered HTML structure and accessibility).

**Test file:** `apps/web/e2e/landing-page.spec.ts` (create; `e2e/` at monorepo root per architecture spec)

**Test cases:**

```typescript
// 1. Page loads and has correct title
test('landing page has correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/On Record/);
});

// 2. Meta description contains keyword
test('meta description contains target keyword', async ({ page }) => {
  await page.goto('/');
  const metaDescription = page.locator('meta[name="description"]');
  await expect(metaDescription).toHaveAttribute('content', /Utah/);
});

// 3. Single h1
test('page has exactly one h1', async ({ page }) => {
  await page.goto('/');
  const h1s = page.locator('h1');
  await expect(h1s).toHaveCount(1);
});

// 4. Primary CTA links to /setup
test('primary CTA links to /setup', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: /get started|connect on record/i });
  await expect(cta).toHaveAttribute('href', '/setup');
});

// 5. Skip link is first focusable element
test('skip link is first focusable element', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('href', '#main-content');
});

// 6. All tap targets ≥44px on mobile viewport
test('CTA tap target meets 44px minimum on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const cta = page.getByRole('link', { name: /get started|connect on record/i });
  const box = await cta.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
```

Note: The `e2e/` directory may not exist yet — create it at the monorepo root (`/e2e/`) per the architecture spec. If a `playwright.config.ts` already exists at the root, use it; if not, create a minimal one pointing at `http://localhost:3000`.

**No Vitest unit tests are required** for a static Server Component page with no logic. Do not write unit tests for page markup.

---

## Cross-Story Context

### What 6.2 Expects from This Story

Story 6.2 implements `/setup`. The primary CTA in 6.1 must link to `/setup` exactly — do not use query params or anchors. The `/setup` route does not exist yet; the link will 404 in dev until 6.2 is implemented. That is acceptable — do not create a placeholder `/setup` page in this story.

### What 6.3 Expects from This Story

Story 6.3 adds Open Graph `og:image`, `/privacy`, and `/terms`. The `layout.tsx` metadata export in this story should NOT include `openGraph.images` — 6.3 will add it when the OG image asset exists. The footer may include placeholder `/privacy` and `/terms` links (they will 404 until 6.3).

### What 6.4 Expects from This Story

Story 6.4 adds dark mode / ReadingPreferences toggle in the footer. This story should include a footer `<nav>` region so 6.4 can append the toggle without restructuring. Dark mode colors are already in `globals.css` and will apply automatically via `prefers-color-scheme` — no additional work needed in this story.

---

## Architecture Compliance Checklist

- No `'use client'` in `page.tsx` — this is a static Server Component
- No barrel files — import directly from component files
- No shared types needed — this story has no data contracts
- No `console.log` — not applicable (no MCP server code in this story)
- TypeScript `strict: true` — no `any`, no `@ts-ignore`
- Tailwind v4 CSS-first config — no `tailwind.config.js` changes; all tokens in `globals.css` `@theme inline`
- `next/font/google` for Atkinson Hyperlegible — do not use `<link>` tags or CDN font loading
- `next/image` for any images — do not use `<img>` tags
- File naming: `page.tsx`, `layout.tsx` (framework-enforced lowercase)
- Playwright E2E test file in `e2e/` at monorepo root

---

## Key Constraints / Anti-Patterns to Avoid

- **Do not write "MCP", "API", "LLM", "JSON", or "server" in any visible body copy.** Non-technical target audience. The setup page (6.2) will handle technical steps.
- **Do not add any JavaScript to this page** (no state, no event handlers, no `'use client'`). It must be fully static.
- **Do not create additional component files** for page sections. Keep all markup in `page.tsx`.
- **Do not add `next/image` imports and then use `<img>` tags** — be consistent.
- **Do not invent new brand colors** — use only the tokens defined in `globals.css`.
- **Do not suppress the default focus outline** — enhance it with the amber ring, don't remove it.
- **Do not add `<link rel="canonical">` manually** in JSX — the `metadata.alternates.canonical` export handles it.
- **Do not add Open Graph image** in this story — deferred to 6.3.

---

## Dev Notes

- The existing `page.tsx` is the default Next.js scaffold (Next.js logo, "edit this file" placeholder, Vercel links). **Replace it entirely.** Do not preserve any scaffold content.
- The existing `layout.tsx` metadata (`title: 'Create Next App'`, `description: 'Generated by create next app'`) must be replaced with On Record SEO metadata.
- The existing font imports (`Geist`, `Geist_Mono`) must be replaced with `Atkinson_Hyperlegible`. Check that `--font-geist-sans` references in `globals.css` are updated to `--font-atkinson`.
- The brand tokens in `globals.css` (already present from Story 2.6) are ready to use — do not re-declare them.
- `apps/web/src/components/` contains `BillCard`, `CitationTag`, `ErrorBanner`, `LegislatorCard` — these are NOT used on the landing page. Do not import them.
- Check whether `playwright.config.ts` exists at the monorepo root. If not, create a minimal one. If it does exist, add the landing page test to the existing suite.
