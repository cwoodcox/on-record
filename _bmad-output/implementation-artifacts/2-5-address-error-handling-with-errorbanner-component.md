# Story 2.5: Address Error Handling with ErrorBanner Component

Status: ready-for-dev

## Story

As a **constituent**,
I want a clear, actionable error message when my address can't be resolved,
so that I know exactly what to fix rather than hitting a dead end.

## Acceptance Criteria

1. **Given** a P.O. Box, rural route, or out-of-state address is submitted **When** the GIS lookup fails to resolve to a Utah legislative district **Then** the tool returns an `AppError` identifying the specific issue type (P.O. Box detected / out-of-state / unresolvable) with a corrective action (e.g., "Use your street address rather than a P.O. Box") (FR37)

2. **And** the error response arrives within 3 seconds (NFR15)

3. **And** no PII (address value) appears in server logs — always `'[REDACTED]'` in any log output that references the address (NFR7)

4. **And** the `ErrorBanner` UI component in `apps/web/src/components/ErrorBanner.tsx` renders the error with: source badge, error message, and action button or link

5. **And** `ErrorBanner` uses `role="alert"` so screen readers announce it immediately on render (NFR11)

6. **And** the recoverable `ErrorBanner` variant includes a "Try again" or "Correct address" action that allows the constituent to re-enter their address without a full page reload

## Tasks / Subtasks

- [ ] Task 1: Enhance MCP tool error classification in `lookup_legislator` (AC: 1, 2, 3)
  - [ ] Inspect UGRC GIS API response for address-type indicators: P.O. Box patterns (regex: `/^p\.?o\.?\s*box/i`), missing geocode result (empty results array), out-of-state result (FIPS state code != Utah `49`)
  - [ ] Map each failure mode to a specific `AppError` using `createAppError()` from `packages/types/`:
    - P.O. Box: `{ source: 'gis-api', nature: 'P.O. Box addresses cannot be geocoded to a legislative district', action: 'Use your street address (e.g., 123 Main St) rather than a P.O. Box' }`
    - Out-of-state: `{ source: 'gis-api', nature: 'That address is outside Utah', action: 'Enter a Utah street address to find your state legislators' }`
    - No district found (rural route / unresolvable): `{ source: 'gis-api', nature: 'Could not resolve that address to a legislative district', action: 'Try a nearby street address or check that your ZIP code is correct' }`
    - GIS API failure (network/timeout): `{ source: 'gis-api', nature: 'Address lookup service is temporarily unavailable', action: 'Wait a moment and try again' }` (surface only after 2 retries exhausted via `retryWithDelay`)
  - [ ] Ensure all log statements that reference the address use `'[REDACTED]'` (NFR7) — never the raw address string
  - [ ] Write/extend unit tests in `tools/legislator-lookup.test.ts` for each error variant, mocking UGRC API responses at the HTTP boundary
  - [ ] Verify error response arrives within 3 seconds under test (NFR15 — ensure `retryWithDelay` timeout window <= 10s is preserved)

- [ ] Task 2: Create `ErrorBanner` React component (AC: 4, 5, 6)
  - [ ] Create `apps/web/src/components/ErrorBanner.tsx` (PascalCase, one component per file — no barrel file)
  - [ ] Install shadcn/ui `Alert` and `Badge` components if not already present: `pnpm --filter web exec npx shadcn@latest add alert badge`
  - [ ] Component props interface (all string props — decoupled from AppError type):
    ```typescript
    interface ErrorBannerProps {
      source: string        // e.g. 'gis-api' -> human-readable badge text
      message: string       // nature field from AppError
      action: string        // action field from AppError (display text)
      onAction?: () => void // callback for recoverable variant
      actionHref?: string   // link href for non-recoverable external fallback
    }
    ```
  - [ ] Anatomy: source badge (small pill) + error message text + action button (recoverable) or link (non-recoverable)
  - [ ] Use `role="alert"` on the root element (NFR11 — screen readers announce immediately)
  - [ ] Amber-tinted styling (not red) using Tailwind tokens from `globals.css` — civic warmth per UX spec
  - [ ] Both recoverable/non-recoverable variants via props (no separate component files)
  - [ ] Touch target for action button: min 44x44px height (NFR12)
  - [ ] Write Vitest + React Testing Library unit tests in `apps/web/src/components/ErrorBanner.test.tsx`
    - [ ] Test: renders source badge, message, and action correctly
    - [ ] Test: `role="alert"` is present on root element
    - [ ] Test: `onAction` callback is invoked when action button is clicked
    - [ ] Test: renders `<a>` link when `actionHref` provided and `onAction` omitted

- [ ] Task 3: Set up Vitest for `apps/web` (prerequisite for Task 2 tests)
  - [ ] Add to `apps/web/package.json` devDependencies: `vitest@^4`, `@vitejs/plugin-react@^4`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `jsdom@^26`
  - [ ] Create `apps/web/vitest.config.ts` with React plugin, jsdom environment, and `@` alias
  - [ ] Add `"test": "vitest run"` script to `apps/web/package.json`
  - [ ] Create `apps/web/src/test/setup.ts` with `import '@testing-library/jest-dom'`
  - [ ] Run `pnpm install` from monorepo root to update `pnpm-lock.yaml` (required — mismatched lockfile causes ERR_PNPM_OUTDATED_LOCKFILE in CI)
  - [ ] Do NOT modify `ci.yml` — web test CI step is intentionally deferred to a later story

- [ ] Task 4: Integration verification (AC: 1-6)
  - [ ] `pnpm --filter mcp-server test` passes (no regressions)
  - [ ] `pnpm --filter web typecheck` passes (ErrorBanner is fully type-safe)
  - [ ] `pnpm --filter web lint` passes (no ESLint violations)
  - [ ] `pnpm --filter web test` passes (all ErrorBanner tests green)

## Dev Notes

### Scope — What Story 2.5 IS and IS NOT

**Story 2.5 scope:**
- Enhanced error classification in `lookup_legislator` MCP tool (P.O. Box / out-of-state / unresolvable / API failure)
- `ErrorBanner` React component (`apps/web/src/components/ErrorBanner.tsx`) with `role="alert"`, source badge, message, and action
- Vitest setup for `apps/web` (prerequisite for ErrorBanner tests)
- Unit tests for both the MCP tool error paths and the React component

**NOT in Story 2.5:**
- The `lookup_legislator` MCP tool base implementation — that is Story 2.4. Story 2.5 extends its error classification.
- The `LegislatorCard` component — that is Story 2.6.
- Wiring `ErrorBanner` into a full address entry form/page — built and tested in isolation here; page integration in later stories.
- CI workflow changes — `ci.yml` is not modified. Web tests run locally but are not yet in CI pipeline.
- shadcn/ui `Toast` — not needed for this story.

### Current Codebase State (Epic 1 complete; Stories 2.1–2.4 precede this)

**Infrastructure delivered by Epic 1:**
- `packages/types/index.ts` exports: `AppError`, `isAppError`, `createAppError`, `Legislator`, `LookupLegislatorResult`, `SearchBillsResult`, `AnalyticsEvent`
- `apps/mcp-server/src/lib/retry.ts`: `retryWithDelay<T>(fn, attempts, delayMs)` — 2 retries, delays 1s and 3s
- `apps/mcp-server/src/lib/logger.ts`: pino singleton with `source` field on every log entry
- `apps/mcp-server/src/cache/schema.ts` + `db.ts`: SQLite schema initialized, WAL mode enabled
- `apps/mcp-server/src/middleware/`: logging, CORS, rate-limit middleware in place
- `apps/mcp-server/src/index.ts`: Hono server with MCP transport + health check at `/health`
- `apps/mcp-server/eslint.config.js`: ESLint 9 flat config — `no-console` (only `console.error` allowed), `no-floating-promises`, `no-restricted-imports` (better-sqlite3 confined to cache/)
- `apps/web/src/app/globals.css`: Tailwind v4 `@theme` tokens via shadcn/ui CSS variable system (oklch-based palette)
- `apps/web/components.json`: shadcn/ui `new-york` style, `@/components` alias, lucide icon library
- `apps/web/package.json`: has `@on-record/types: workspace:*`, `class-variance-authority`, `clsx`, `lucide-react`, `radix-ui`, `tailwind-merge`

**Expected state after Stories 2.1–2.4 (this story depends on 2.4 being done):**
- `apps/mcp-server/src/tools/legislator-lookup.ts` — MCP tool wired and registered with Hono/MCP server
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — existing test file to extend for error classification
- `apps/mcp-server/src/providers/utah-legislature.ts` — Utah Legislature API provider
- `apps/mcp-server/src/cache/legislators.ts` — legislator cache read/write

### AppError Type Contract

```typescript
// packages/types/index.ts — already exported, do not duplicate
export interface AppError {
  source: 'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app'
  nature: string   // human-readable — what failed
  action: string   // what to try next
}

// Always use the factory, not object literals
export function createAppError(
  source: AppError['source'],
  nature: string,
  action: string,
): AppError {
  return { source, nature, action }
}
```

All four error variants use `source: 'gis-api'`. Always use `createAppError()` to ensure field completeness — never construct `AppError` objects inline.

### Error Classification Logic

Add to or call from `apps/mcp-server/src/tools/legislator-lookup.ts`.

**P.O. Box — detect BEFORE making the GIS call (saves latency):**
```typescript
const PO_BOX_PATTERN = /^p\.?o\.?\s*box\b/i
if (PO_BOX_PATTERN.test(address.trim())) {
  return createAppError(
    'gis-api',
    'P.O. Box addresses cannot be geocoded to a legislative district',
    'Use your street address (e.g., 123 Main St) rather than a P.O. Box',
  )
}
```

**Out-of-state — after UGRC geocode returns a result with non-Utah geography:**
Treat a successful geocode that returns no Utah legislative district as potentially out-of-state:
```typescript
return createAppError(
  'gis-api',
  'That address appears to be outside Utah',
  'Enter a Utah street address to find your state legislators',
)
```

**No district found — empty SGID political layer result after successful geocode:**
```typescript
return createAppError(
  'gis-api',
  'Could not resolve that address to a legislative district',
  'Try a nearby street address or check that your ZIP code is correct',
)
```

**GIS API network failure — after `retryWithDelay` exhausts 2 retries:**
```typescript
return createAppError(
  'gis-api',
  'Address lookup service is temporarily unavailable',
  'Wait a moment and try again',
)
```

**Logging pattern (all cases — NFR7 requires `[REDACTED]`):**
```typescript
// Correct
logger.error(
  { source: 'gis-api', address: '[REDACTED]', errorType: 'po-box' },
  'P.O. Box address submitted — cannot geocode',
)

// Wrong — both of these are violations
logger.error({ source: 'gis-api', address }, 'GIS lookup failed')  // PII leak
console.log('GIS error:', address)  // double violation: console.log + PII
```

### ErrorBanner Component Design

**UX Spec reference** [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Custom Components" -> "ErrorBanner"]:
- Anatomy: source badge + error message + action button or link
- Variants: recoverable (retry/correct action); non-recoverable (fallback path)
- Accessibility: `role="alert"` — announced immediately to screen readers on render
- Styling: amber-tinted (not red) — civic warmth, not alarm
- Error messages must answer three questions: What went wrong? Why? What to do next?

**Correct example:**
> "We couldn't find legislators for that address. Try checking your ZIP code or entering a nearby city."

**Incorrect example:**
> "An error occurred."

**Reference sketch (adapt to actual shadcn/ui components installed):**
```tsx
// apps/web/src/components/ErrorBanner.tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface ErrorBannerProps {
  source: string
  message: string
  action: string
  onAction?: () => void
  actionHref?: string
}

export function ErrorBanner({ source, message, action, onAction, actionHref }: ErrorBannerProps) {
  return (
    <Alert role="alert" className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-700 dark:text-amber-400">
          {source}
        </Badge>
        <div className="flex-1">
          <AlertDescription className="text-sm">{message}</AlertDescription>
          <div className="mt-2">
            {onAction ? (
              <button
                onClick={onAction}
                className="min-h-[44px] px-2 text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
              >
                {action}
              </button>
            ) : actionHref ? (
              <a
                href={actionHref}
                className="text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
              >
                {action}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{action}</p>
            )}
          </div>
        </div>
      </div>
    </Alert>
  )
}
```

This is a reference sketch — adapt based on actual shadcn/ui `Alert` and `Badge` component APIs after running `shadcn@latest add`.

**Install via:**
```bash
pnpm --filter web exec npx shadcn@latest add alert badge
```

This creates:
- `apps/web/src/components/ui/alert.tsx`
- `apps/web/src/components/ui/badge.tsx`

These are auto-generated shadcn/ui primitives — do not edit them directly (architecture rule). `ErrorBanner.tsx` imports from them.

**CRITICAL: No barrel files.** Import directly:
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
```

Do NOT create `apps/web/src/components/index.ts` or `apps/web/src/components/ui/index.ts`.

### Vitest Setup for `apps/web`

Story 1.5 explicitly deferred web Vitest ("Vitest setup for `apps/web` — web has no tests yet; added in later stories (2.6, 4.6)"). Story 2.5 introduces it one story early because `ErrorBanner` requires a test harness.

**devDependencies to add to `apps/web/package.json`:**
```json
"@testing-library/jest-dom": "^6",
"@testing-library/react": "^16",
"@testing-library/user-event": "^14",
"@vitejs/plugin-react": "^4",
"jsdom": "^26",
"vitest": "^4"
```

Use `vitest@^4` to match the mcp-server's Vitest 4.0.18 major version.

**`apps/web/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**`apps/web/src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom'
```

**CRITICAL:** After adding devDependencies, run `pnpm install` from the monorepo root to regenerate `pnpm-lock.yaml`. Committing only `package.json` changes without updating the lockfile causes `ERR_PNPM_OUTDATED_LOCKFILE` in CI. This was a lesson learned in Sprint 1 (post-Story 1.5 code review).

### ESLint for `apps/web`

`apps/web` uses `eslint-config-next` (flat config in `eslint.config.mjs`). The ErrorBanner component must pass:
- No unused variables
- No `any` types
- React import not required (Next.js auto-imports React in JSX files)

There is no `no-console` restriction in `apps/web` (that rule is scoped to `apps/mcp-server` only). However, avoid `console.log` in production component code.

**ESLint 9 flat config lesson (from Story 1.5 code review):** If adding new `no-restricted-imports` rules to any `eslint.config.js`, keep all patterns for the same file scope in one config object — multiple separate objects targeting the same file scope cause the last one to silently win.

### Testing Patterns

**MCP server error classification tests (extend existing file):**
```typescript
// apps/mcp-server/src/tools/legislator-lookup.test.ts
import { describe, it, expect, vi } from 'vitest'
import { isAppError } from '@on-record/types'

describe('lookup_legislator — error classification', () => {
  it('returns AppError with po-box guidance for P.O. Box address', async () => {
    const result = await invokeTool({ address: 'PO Box 123, Salt Lake City UT 84101' })
    expect(isAppError(result)).toBe(true)
    if (isAppError(result)) {
      expect(result.source).toBe('gis-api')
      expect(result.action).toMatch(/street address/i)
    }
  })

  it('returns AppError for out-of-state address', async () => {
    // Mock UGRC to return empty district result for a non-Utah geocode
    // vi.mocked(fetch).mockResolvedValueOnce(mockEmptyDistrictResponse())
  })

  it('returns AppError for unresolvable rural address', async () => {
    // Mock UGRC geocode success but empty SGID political district query
  })

  it('never logs raw address value', async () => {
    // Spy on logger.error and confirm '[REDACTED]' not raw address
    const logSpy = vi.spyOn(logger, 'error')
    await invokeTool({ address: '123 Main St, Provo UT 84601' })
    for (const call of logSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('123 Main St')
    }
  })
})
```

**React component tests:**
```typescript
// apps/web/src/components/ErrorBanner.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBanner } from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders source badge, message, and action', () => {
    render(
      <ErrorBanner
        source="gis-api"
        message="P.O. Box addresses cannot be geocoded"
        action="Use your street address instead"
        onAction={() => {}}
      />
    )
    expect(screen.getByText('gis-api')).toBeInTheDocument()
    expect(screen.getByText('P.O. Box addresses cannot be geocoded')).toBeInTheDocument()
    expect(screen.getByText('Use your street address instead')).toBeInTheDocument()
  })

  it('has role="alert" for immediate screen reader announcement', () => {
    render(<ErrorBanner source="gis-api" message="Error" action="Try again" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onAction when action button is clicked', async () => {
    const onAction = vi.fn()
    render(
      <ErrorBanner source="gis-api" message="Error" action="Try again" onAction={onAction} />
    )
    await userEvent.click(screen.getByText('Try again'))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('renders anchor link when actionHref provided without onAction', () => {
    render(
      <ErrorBanner source="gis-api" message="Error" action="Visit help" actionHref="/help" />
    )
    const link = screen.getByRole('link', { name: 'Visit help' })
    expect(link).toHaveAttribute('href', '/help')
  })
})
```

**Vitest rejection test note** (from Sprint 1 learnings): When testing async rejection paths with fake timers, attach the `.rejects` assertion BEFORE calling `vi.runAllTimersAsync()` to avoid `PromiseRejectionHandledWarning`. Relevant if testing the `retryWithDelay` timeout path in error classification tests.

### Architectural Guardrails Summary

1. **No barrel files** — `ErrorBanner.tsx` imported directly by consumers. No `components/index.ts` or `components/ui/index.ts`.
2. **Shared types in `packages/types/` only** — `AppError`/`createAppError` already exported from there. `ErrorBannerProps` uses individual `string` props (not an `AppError` object directly) to remain decoupled from MCP types.
3. **`strict: true`** everywhere — no `any`, no `@ts-ignore`. All props explicitly typed. Return types annotated on async functions.
4. **`console.log` forbidden in `apps/mcp-server/`** — error classification logic in the tool layer uses pino logger only. ESLint enforces this.
5. **better-sqlite3 imports confined to `apps/mcp-server/src/cache/`** — error classification in the tool layer must not import from cache internals or touch SQLite directly.
6. **Addresses always `'[REDACTED]'` in logs** — `LookupLegislatorResult.resolvedAddress` may contain the actual address for the LLM response; logs never log the raw value.
7. **Touch targets 44x44px** — the action button in `ErrorBanner` must meet NFR12 (`min-h-[44px]`).
8. **Dark mode** — amber styling uses Tailwind `dark:` prefix variants. Test visually in both light and dark modes.
9. **`prefers-color-scheme`** — dark mode defaults to system preference via the existing `@custom-variant dark` in `globals.css`. No additional CSS needed.
10. **Mock at provider boundary in tests** — unit tests mock UGRC HTTP calls (not the database or SQLite). Tests never import `better-sqlite3` directly.

### Project Structure Notes

**Files to create:**
```
apps/web/
├── src/
│   ├── components/
│   │   ├── ErrorBanner.tsx             NEW: custom ErrorBanner component
│   │   ├── ErrorBanner.test.tsx        NEW: Vitest + RTL unit tests
│   │   └── ui/
│   │       ├── alert.tsx               NEW: shadcn/ui add alert (auto-generated)
│   │       └── badge.tsx               NEW: shadcn/ui add badge (auto-generated)
│   └── test/
│       └── setup.ts                    NEW: Vitest global setup (@testing-library/jest-dom)
└── vitest.config.ts                    NEW: Vitest config for web app
```

**Files to modify:**
```
apps/web/package.json                   MODIFIED: add "test" script + vitest/RTL devDependencies
pnpm-lock.yaml                          MODIFIED: regenerated after pnpm install (monorepo root)
apps/mcp-server/src/tools/
├── legislator-lookup.ts                MODIFIED: add error classification logic
└── legislator-lookup.test.ts           MODIFIED: add tests for each error variant
```

**Files NOT touched:**
```
apps/mcp-server/src/lib/retry.ts        no changes (retryWithDelay correct as-is)
packages/types/index.ts                 no changes (AppError already defined correctly)
.github/workflows/ci.yml                no changes (web test CI step deferred to later story)
apps/mcp-server/eslint.config.js        no changes
apps/web/src/app/globals.css            no changes (design tokens already defined)
apps/web/components.json                no changes
```

### References

- FR37: Non-residential/ambiguous address error handling [Source: `_bmad-output/planning-artifacts/prd.md` -> "Functional Requirements" -> "Operator & System"]
- NFR15: GIS API failure returns human-readable error within 3 seconds [Source: `_bmad-output/planning-artifacts/prd.md` -> "Non-Functional Requirements" -> "Integration"]
- NFR7: No PII in logs / no persistent storage of user addresses [Source: `_bmad-output/planning-artifacts/prd.md` -> "Non-Functional Requirements" -> "Security"]
- NFR11: WCAG 2.1 AA / screen reader / role="alert" [Source: `_bmad-output/planning-artifacts/prd.md` -> "Non-Functional Requirements" -> "Accessibility"]
- NFR12: 44x44px touch targets [Source: `_bmad-output/planning-artifacts/prd.md` -> "Non-Functional Requirements" -> "Accessibility"]
- AppError three-field format and createAppError factory [Source: `_bmad-output/planning-artifacts/architecture.md` -> "Error Response Format (three-field standard)"]
- ErrorBanner component spec [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Custom Components" -> "ErrorBanner"]
- Alert as ErrorBanner base primitive [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Design System Components" table]
- Implementation roadmap order [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Implementation Roadmap" -> "Phase 1 — MVP critical"]
- Error feedback patterns [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Feedback Patterns" -> "Error — Recoverable and Specific"]
- Screen reader / role="alert" [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` -> "Screen Reader Experience"]
- Epic 2 Story 2.5 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md` -> "Story 2.5: Address Error Handling with ErrorBanner Component"]
- Logging discipline / console.log forbidden in mcp-server [Source: `_bmad-output/planning-artifacts/architecture.md` -> "Process Patterns" -> "MCP Server Logging Rule"]
- No barrel files rule [Source: `_bmad-output/planning-artifacts/architecture.md` -> "Structure Patterns" -> "No barrel files"]
- Pino log address redaction [Source: `_bmad-output/planning-artifacts/architecture.md` -> "Communication Patterns" -> "Pino Log Structure"]
- Vitest for web deferred note [Source: `_bmad-output/implementation-artifacts/1-5-cicd-pipeline-and-developer-readme.md` -> "NOT in Story 1.5"]
- ESLint 9 flat config no-restricted-imports collision [Source: `_bmad-output/implementation-artifacts/1-5-cicd-pipeline-and-developer-readme.md` -> "Review Follow-ups (AI)" -> HIGH finding]
- pnpm-lock.yaml sync requirement [Source: project MEMORY.md -> "Code Review Findings Patterns" -> "Always run pnpm install and commit updated pnpm-lock.yaml"]
- Vitest rejection test ordering [Source: project MEMORY.md -> "Code Review Findings Patterns" -> "Vitest rejection tests: attach .rejects assertion BEFORE vi.runAllTimersAsync()"]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
