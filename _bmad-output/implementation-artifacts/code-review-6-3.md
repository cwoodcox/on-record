# Code Review: Story 6.3 — Privacy Policy, Terms of Service, and Open Graph Social Sharing

**Review Date:** Saturday, April 4, 2026
**Reviewer:** Gemini CLI
**Status:** review (requires minor action)

## Triage Report

### 🟡 Important (Action Recommended)

1.  **Missing `metadataBase` in `layout.tsx`**:
    *   **Issue**: The `metadataBase` property is missing from the root metadata export.
    *   **Impact**: During build, Next.js warns about this. It's necessary for resolving relative social image paths (like `/og-image.png`) to absolute URLs. This may cause Open Graph images to fail on some social platforms.
    *   **Action**: Add `metadataBase: new URL('https://getonrecord.org')` to the `metadata` export in `apps/web/src/app/layout.tsx`.

### 🟢 Minor (Optimization Suggested)

1.  **Redundant Metadata in `page.tsx`**:
    *   **Issue**: `apps/web/src/app/page.tsx` repeats the `openGraph` configuration already present in `layout.tsx`.
    *   **Impact**: While Next.js merges these, maintaining two slightly different versions of the description can lead to SEO inconsistency.
    *   **Action**: Consolidate common OG metadata in `layout.tsx` and only override specific fields in `page.tsx` if necessary.

---

## Detailed Review Findings

### 1. Content & Legal Compliance
- **Privacy Policy**: Correctly states that addresses are used only for lookup, not persistently stored, and shared only with UGRC.
- **Terms of Service**: Covers service description, appropriate use (prohibiting spam/harassment), no warranty, limitation of liability, and Utah governing law.
- **Tone**: Both pages maintain the requested 8th-grade reading level and "On Record" brand voice.

### 2. Accessibility & Design Tokens
- **Design Tokens**: The implementation of 6.3 consistently uses design tokens (e.g., `bg-[color:var(--on-record-primary)]`) instead of hardcoded hex values in the new components (`Footer.tsx`) and pages.
- **Touch Targets**: All footer links meet the 44×44px minimum target size.
- **Focus States**: High-contrast focus rings are present on all links.
- **Semantic HTML**: Pages use `<main>`, `<section>`, and `<h1-2>` appropriately for structure.

### 3. Technical Requirements
- **SSG**: Verified that `/privacy` and `/terms` are statically generated at build time.
- **Assets**: `og-image.png` is present at the correct path and dimensions.
- **Build/Typecheck**: Both pass clean (except for the `metadataBase` warning).
