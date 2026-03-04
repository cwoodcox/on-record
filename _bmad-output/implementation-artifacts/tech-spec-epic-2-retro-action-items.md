---
title: 'Epic 2 Retro Action Items'
slug: 'epic-2-retro-action-items'
created: '2026-03-04'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript (NodeNext, strict)
  - Vitest
files_to_modify:
  - apps/mcp-server/src/tools/legislator-lookup.ts
  - apps/mcp-server/src/tools/legislator-lookup.test.ts
  - ~/.claude/projects/-Users-coreywoodcox-Developer-cwoodcox-on-record/memory/MEMORY.md
code_patterns:
  - resolveAddressToDistricts throws AppError for all failures (semantic + transient)
  - isAppError() used in catch block to distinguish AppError from unexpected errors
test_patterns:
  - Assert specific nature/action string values, not type-only checks
---

# Tech-Spec: Epic 2 Retro Action Items

**Created:** 2026-03-04

## Overview

### Problem Statement

Three critical-path action items from the Epic 2 retrospective block the start of Epic 3:

1. **CI typecheck is failing** in `apps/mcp-server/` because `tools/legislator-lookup.ts` contains a duplicate inline `ugrcGeocode()` function that reimplements the GIS logic already in `lib/gis.ts`. The TypeScript errors in that duplicate are a symptom of the duplication — the fix is to remove it entirely and import `resolveAddressToDistricts` from `gis.ts`.

2. **MEMORY.md's create-story parallelism guidance is incomplete.** It currently says "create-story agents for sequential stories can run in parallel" without distinguishing independent stories from stories that produce interfaces/functions consumed by later stories. This caused Story 2.4's spec to describe reimplementing GIS logic that Story 2.1 would create.

3. **MEMORY.md is missing two code review checklist items** that the retro identified as recurring gaps: (a) check for architectural duplication with existing files, and (b) error-path tests must assert specific `nature`/`action` values, not type-only checks.

### Solution

- **Item 1:** Remove `ugrcGeocode()` from `legislator-lookup.ts`. Import `resolveAddressToDistricts` from `../lib/gis.js`. Update the tool handler to use it. Update `legislator-lookup.test.ts` to assert the new error messages from `gis.ts` (6 assertions). Verify `pnpm --filter mcp-server typecheck` exits 0.
- **Items 2 & 3:** Update MEMORY.md with the corrected parallelism rule and two code review checklist items.

### Scope

**In Scope:**
- `apps/mcp-server/src/tools/legislator-lookup.ts` — remove `ugrcGeocode()`, import `resolveAddressToDistricts`
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — update 6 error message assertions to match `gis.ts`
- `MEMORY.md` — parallelism rule correction + 2 code review checklist items
- Verify CI typecheck passes after the refactor

**Out of Scope:**
- Any changes to `lib/gis.ts`
- Adding new tests (only updating existing assertions)
- Epic 3 story creation

---

## Context for Development

### Key Behavioral Difference: ugrcGeocode vs resolveAddressToDistricts

The current `ugrcGeocode()` (in the tool) has a **mixed return**:
- Returns `AppError` for semantic failures (low score, out-of-state) → caller uses `isAppError()` check
- Throws `AppError` for transient failures → caller's catch block handles

`resolveAddressToDistricts()` (in `gis.ts`) **always throws** for all failures — semantic and transient. It also handles retry internally via `retryWithDelay`. The tool no longer needs to wrap it with `retryWithDelay`.

**Impact on the call site:**
1. `retryWithDelay(() => ugrcGeocode(...), 2, 1000)` → `await resolveAddressToDistricts(street, zone)`
2. The `isAppError(geocodeResult)` return-value check is removed entirely
3. The catch block is updated: if the caught error `isAppError(err)`, forward it directly. The non-AppError branch is intentional defensive dead code — `gis.ts` always wraps failures as AppErrors before throwing, so in practice `isAppError(err)` is always true. The fallback branch is kept as a safety net for any future unexpected error path.
4. `geocodeResult.resolvedAddress` (from `gis.ts` return value) replaces the manually built `${street}, ${zone}` string — the `makeGeocodeResponse` fixture omits `matchAddress`, so `gis.ts` falls back to `${street}, ${zone}` automatically — the existing happy-path test assertion passes unchanged

### Error Message Changes (test assertions to update)

`gis.ts` uses different user-facing strings than `ugrcGeocode()` did:

| Scenario | Old (ugrcGeocode) | New (gis.ts) | Path in catch |
|---|---|---|---|
| Geocode HTTP failure (transient, retries exhausted) | `'Address lookup service is temporarily unavailable'` / `'Wait a moment and try again'` | `'Address lookup failed — the GIS service did not respond'` / `'Try again in a few seconds. If the problem persists, verify your address is a valid Utah street address.'` | `isAppError(err)` = true → forward |
| Network rejection (non-AppError, transient) | `'Address lookup service is temporarily unavailable'` / `'Wait a moment and try again'` | Same as above — gis.ts wraps the network error as AppError before throwing | `isAppError(err)` = true → forward |
| Score < 70 (semantic) | `'Could not resolve that address to a legislative district'` | `'Your address could not be confidently located in Utah'` / `'Check that the address is a valid Utah street address (not a P.O. Box or out-of-state address) and try again.'` | `isAppError(err)` = true → forward |
| Empty district results (out-of-state) | `'That address appears to be outside Utah'` | `'Your address could not be matched to a Utah legislative district'` / `'Verify the address is within Utah. P.O. Boxes and rural routes may not resolve correctly — use a physical street address.'` | `isAppError(err)` = true → forward |
| Non-AppError (defensive fallback — unreachable with current gis.ts) | n/a | `'Address lookup service is temporarily unavailable'` / `'Wait a moment and try again'` | `isAppError(err)` = false → generic fallback |

P.O. Box errors originate in the tool itself (before any gis.ts call) — those messages don't change.

### Imports After Refactor

Remove from `legislator-lookup.ts`:
- `retryWithDelay` (gis.ts handles retries internally)
- `getEnv` (gis.ts reads env internally)
- `AppError` type (no longer in the `geocodeResult` union type)

Keep:
- `isAppError` (used in catch block)
- `createAppError` (used in catch block fallback + P.O. Box + cache miss)
- `LookupLegislatorResult` type (unchanged)

Add:
- `import { resolveAddressToDistricts } from '../lib/gis.js'`

### Codebase Patterns

- All imports use `.js` extensions (NodeNext)
- `exactOptionalPropertyTypes: true` — no `undefined` assigned to optional properties explicitly
- `console.log` is forbidden in `apps/mcp-server/` — use `logger.*`
- Pino logger: every log call includes `source` field; addresses always `'[REDACTED]'`
- `AppError` format: `{ source, nature, action }` three-field only

### Files to Reference

| File | Purpose |
|---|---|
| `apps/mcp-server/src/tools/legislator-lookup.ts` | File to refactor — remove ugrcGeocode, import resolveAddressToDistricts |
| `apps/mcp-server/src/tools/legislator-lookup.test.ts` | Tests to update — 6 error message assertions |
| `apps/mcp-server/src/lib/gis.ts` | Source of truth — resolveAddressToDistricts signature and error messages |

---

## Implementation Plan

### Tasks

**Task 1: Refactor `tools/legislator-lookup.ts`**

File: `apps/mcp-server/src/tools/legislator-lookup.ts`

1. Remove the `GeocodeResponse` and `DistrictResponse` type definitions (lines 22–27)
2. Remove the entire `ugrcGeocode()` function (lines 29–114)
3. Remove imports: `retryWithDelay`, `getEnv`, `AppError` type (the `AppError` type import in the union is no longer needed; `isAppError` and `createAppError` stay)
4. Add import: `import { resolveAddressToDistricts } from '../lib/gis.js'`
5. In the tool handler, replace the `geocodeResult` declaration and `retryWithDelay` call with:
   ```typescript
   let geocodeResult: Awaited<ReturnType<typeof resolveAddressToDistricts>>
   try {
     geocodeResult = await resolveAddressToDistricts(street, zone)
   } catch (err) {
     if (isAppError(err)) {
       logger.error(
         { source: 'gis-api', address: '[REDACTED]', nature: err.nature },
         'GIS lookup failed',
       )
       return { content: [{ type: 'text', text: JSON.stringify(err) }] }
     }
     logger.error(
       { source: 'gis-api', address: '[REDACTED]', err },
       'Unexpected GIS error',
     )
     return {
       content: [{
         type: 'text',
         text: JSON.stringify(
           createAppError('gis-api', 'Address lookup service is temporarily unavailable', 'Wait a moment and try again'),
         ),
       }],
     }
   }
   ```
6. Remove the `isAppError(geocodeResult)` block entirely (was the semantic failure return-value check)
7. Remove the `logger.debug({ source: 'gis-api', address: '[REDACTED]' }, 'GIS lookup succeeded')` line — it no longer sits at the right point in the flow. Keep `const districts = geocodeResult` unchanged.
8. Replace `resolvedAddress: \`${street}, ${zone}\`` with `resolvedAddress: geocodeResult.resolvedAddress`

**Task 2: Update `tools/legislator-lookup.test.ts`**

File: `apps/mcp-server/src/tools/legislator-lookup.test.ts`

Update the following 6 assertions (do not change test structure, only the expected string values):

| Test name | What to change |
|---|---|
| `'returns AppError JSON with source "gis-api" when UGRC geocode fails (HTTP error)'` | `nature` → `'Address lookup failed — the GIS service did not respond'`; `action` → `'Try again in a few seconds. If the problem persists, verify your address is a valid Utah street address.'` |
| `'returns AppError JSON with source "gis-api" when geocode score < 70'` | `nature` → `'Your address could not be confidently located in Utah'` |
| `'forwards the upstream AppError (does not re-wrap) when geocode returns semantic error'` | `nature` → `'Your address could not be confidently located in Utah'`; also update the test name to `'forwards the AppError thrown by resolveAddressToDistricts for semantic failures'` and remove any inline comments referencing ugrcGeocode return-value semantics |
| `'returns out-of-state AppError when district lookup returns empty results (NaN districts)'` | `nature` → `'Your address could not be matched to a Utah legislative district'`; `action` regex → `/physical street address/i` (full string: `'Verify the address is within Utah. P.O. Boxes and rural routes may not resolve correctly — use a physical street address.'`) |
| `'returns unresolvable AppError when geocode score is below threshold'` | `nature` → `'Your address could not be confidently located in Utah'`; `action` regex → `/valid utah street address/i` (full string: `'Check that the address is a valid Utah street address (not a P.O. Box or out-of-state address) and try again.'`) |
| `'returns GIS API unavailable AppError (network failure) after retries exhausted — non-AppError path'` | `nature` → `'Address lookup failed — the GIS service did not respond'`; `action` → `'Try again in a few seconds. If the problem persists, verify your address is a valid Utah street address.'` |

**Task 3: Verify typecheck and tests pass**

```bash
pnpm --filter mcp-server typecheck
pnpm --filter mcp-server test
```

Both must exit 0 before continuing.

**Task 4: Commit the code fix**

Stage only the two modified files (`legislator-lookup.ts` and `legislator-lookup.test.ts`):
```
git commit -m "$(cat <<'EOF'
feat(retro-2): remove ugrcGeocode duplicate, import resolveAddressToDistricts from gis.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Task 5: Update MEMORY.md — parallelism rule**

In the "Story Workflow (BMAD)" section, replace:
> `create-story agents for sequential stories can run in parallel`

With:
> `create-story agents can run in parallel ONLY for genuinely independent stories (no shared interfaces/output). If story B consumes an interface or function produced by story A, run create-story for A first, wait for its spec to be written, then run B.`

**Task 6: Update MEMORY.md — code review checklist items**

Add to the "Code Review Findings Patterns" section (two new bullets):
> - For any new file: check it doesn't duplicate logic already present elsewhere in the codebase — cross-layer duplication (tools/ reimplementing lib/) is as likely as same-layer
> - Error-path tests must assert specific `nature` and `action` string values — type-only checks (`typeof result.nature === 'string'`) are insufficient

### Acceptance Criteria

**AC1 — Typecheck passes**
Given the refactored `legislator-lookup.ts`,
When `pnpm --filter mcp-server typecheck` runs,
Then it exits 0 with no errors.

**AC2 — Tests pass**
Given the updated test assertions,
When `pnpm --filter mcp-server test` runs,
Then all tests pass (no regressions).

**AC3 — No duplicate GIS logic**
Given the refactored file,
When reviewing `tools/legislator-lookup.ts`,
Then `ugrcGeocode`, `GeocodeResponse`, `DistrictResponse` are absent; `resolveAddressToDistricts` is imported from `'../lib/gis.js'`.

**AC4 — resolvedAddress uses gis.ts return value**
Given the refactored tool handler,
When a valid address resolves successfully,
Then `result.resolvedAddress` comes from `geocodeResult.resolvedAddress` (not a manually built string).

**AC5 — Error forwarding**
Given any failure from `resolveAddressToDistricts`,
When `isAppError(err)` is true in the catch block,
Then the AppError is forwarded directly (not re-wrapped in a new generic error).

**AC6 — MEMORY.md parallelism rule updated**
Given the updated MEMORY.md,
When reading the Story Workflow section,
Then it states that parallel create-story is only safe for genuinely independent stories, with explicit guidance on dependent stories.

**AC7 — MEMORY.md review checklist updated**
Given the updated MEMORY.md,
When reading the Code Review Findings Patterns section,
Then it includes both: (a) architectural duplication check, and (b) error-path test specificity requirement.

---

## Additional Context

### Dependencies

- No new packages required
- `gis.ts` is unchanged — `resolveAddressToDistricts` signature and behavior are already correct

### Testing Strategy

- Run `pnpm --filter mcp-server typecheck` after Task 1 to confirm green
- Run `pnpm --filter mcp-server test` after Task 2 to confirm all tests pass
- No new tests needed — existing test coverage is sufficient after assertion updates

### Notes

- The `makeGeocodeResponse` fixture in the test doesn't include `matchAddress`, so `resolveAddressToDistricts` will fall back to `${street}, ${zone}` — the existing `resolvedAddress` assertion (`'123 S State St, 84111'`) passes unchanged.
- `retryWithDelay` is no longer imported by the tool (gis.ts handles it internally). Remove the import to keep the file clean.
- The test comment "The user-facing message must be the friendly copy, NOT the internal 'GIS geocoding request failed (HTTP 500)'" remains valid — `gis.ts`'s error messages are also user-friendly, just different strings.
