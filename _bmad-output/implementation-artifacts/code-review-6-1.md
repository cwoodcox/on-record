# Code Review: Story 6.1 — SEO-Optimized Landing Page

**Review Date:** Saturday, April 4, 2026
**Reviewer:** Gemini CLI
**Status:** review (requires minor action)

## Triage Report

### 🟡 Important (Action Recommended)

1.  **Hardcoded Hex Colors in `page.tsx`**:
    *   **Issue**: `page.tsx` uses hardcoded hex values (e.g., `bg-[#1e3a4f]`, `text-[#c47d2e]`) for brand colors instead of the semantic Tailwind tokens defined in `globals.css` (e.g., `bg-on-record-primary`).
    *   **Impact**: Violates the "no hardcoding" rule established in the Story 6.3 spec and increases maintenance debt. Dark mode support is currently handled via manual hex overrides (`dark:bg-[#0f1f2b]`) rather than inheriting from the theme.
    *   **Action**: Replace hex codes with theme-aware tokens like `bg-on-record-primary` and `text-on-record-accent`.

2.  **Conflicting Metadata/Description**:
    *   **Issue**: `page.tsx` exports a `metadata` object that overrides the one in `layout.tsx`. The `description` in `page.tsx` ("...guides you through the process using your own chatbot") differs from the more descriptive one in `layout.tsx` ("...surface their voting record, and send a personal, cited message").
    *   **Impact**: Dilutes the SEO impact of the carefully crafted description from the 6.1 spec.
    *   **Action**: Consolidate metadata in `layout.tsx` or ensure `page.tsx` only overrides what is strictly necessary (e.g., specific OG tags).

3.  **Missing `metadataBase`**:
    *   **Issue**: The build/test log warns that `metadataBase` is not set.
    *   **Impact**: Required for Next.js to resolve relative Open Graph image paths to absolute URLs. Social media previews may fail to render the image on some platforms.
    *   **Action**: Add `metadataBase: new URL('https://getonrecord.org')` to the `metadata` export in `layout.tsx`.

### 🟢 Minor (Optimization Suggested)

1.  **Meta Description Length**:
    *   **Issue**: The active meta description in `page.tsx` is ~125 characters, and the one in `layout.tsx` is ~188 characters.
    *   **Impact**: The 6.1 spec specifically requested a range of 150–160 characters for optimal search engine display.
    *   **Action**: Refine the description to hit the 150-160 character sweet spot.

2.  **Phantom Font Reference in `globals.css`**:
    *   **Issue**: `globals.css` still references `var(--font-geist-mono)` for `--font-mono`, but the Geist font is no longer imported in `layout.tsx`.
    *   **Impact**: Cleanliness issue; refers to a non-existent variable.
    *   **Action**: Remove the reference if Geist Mono is not used, or re-add the import if mono text is needed.

---

## Detailed Review Findings

### 1. Accessibility & UX
- **Skip Link**: Correctly implemented as the first focusable element with appropriate `sr-only` and focus states.
- **Reading Level**: Successfully avoided technical jargon. Concepts like "MCP" and "LLM" are effectively translated to "AI assistant" and "chatbot."
- **Tap Targets**: Verified 44×44px minimum height/width on all interactive elements in both the hero and the new footer.
- **Heading Hierarchy**: Properly structured with a single `<h1>` and semantic `<h2>` sections.

### 2. Performance & SEO
- **SSG**: Confirmed `○ (Static)` at build time. No `'use client'` found in `page.tsx`.
- **Fonts**: Atkinson Hyperlegible is correctly integrated via `next/font/google` and mapped to `font-sans`.
- **Keywords**: Target keywords ("Utah legislator," etc.) are present in the layout metadata.

### 3. Brand Compliance
- **Branding**: The "On Record" wordmark uses the correct color split (Slate/Amber) as specified.
- **Tokens**: `Footer.tsx` uses the `var(--on-record-*)` pattern, which is more robust than the hex codes found in `page.tsx`.
