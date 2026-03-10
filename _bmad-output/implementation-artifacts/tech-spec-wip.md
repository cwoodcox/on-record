---
title: 'Fix getBillDetail Session Param and Non-JSON Response Handling'
slug: 'fix-get-bill-detail-session-param'
created: '2026-03-09'
status: 'in-progress'
stepsCompleted: [1, 2, 3]
tech_stack: ['TypeScript', 'Vitest']
files_to_modify:
  - 'apps/mcp-server/src/providers/types.ts'
  - 'apps/mcp-server/src/providers/utah-legislature.ts'
  - 'apps/mcp-server/src/providers/utah-legislature.test.ts'
  - 'apps/mcp-server/src/cache/refresh.test.ts'
code_patterns:
  - 'retryWithDelay wraps fetch — never double-wrap'
  - 'AppError: { source, nature, action } three-field format'
  - 'url(...segments) appends apiKey as final path segment'
test_patterns:
  - 'Attach .rejects assertion BEFORE vi.runAllTimersAsync()'
  - 'fetchMock.mockResolvedValueOnce for happy path'
  - 'fetchMock.mockRejectedValue for failure path'
---

# Tech-Spec: Fix getBillDetail Session Param Bug

**Created:** 2026-03-09

## Overview

### Problem Statement

`getBillDetail(billId)` ignores the session it should query and always calls
the internal `getCurrentSession()` helper (a calendar heuristic). This is
correct during an active session but breaks during inter-session periods.

Today (2026-03-09) is **after** the `2026GS` end date of 2026-03-06, so
`getSessionsForRefresh` returns `['2026GS', '2025GS']`. When
`getBillsBySession('2025GS')` hydrates each bill stub it calls
`this.getBillDetail('HB0004')` — but the URL constructed is
`/bills/2026GS/HB0004/<token>` instead of `/bills/2025GS/HB0004/<token>`.
The API rejects the mismatched session, the fetch fails after retries, and
the entire bills cache warm-up aborts with:

```
Bills cache warm-up failed — serving stale data
nature: "Failed to fetch bill detail for HB0004 from Utah Legislature API"
```

### Solution

Two fixes:

1. **Session param:** Add a `session: string` parameter to `getBillDetail` in both the `LegislatureDataProvider` interface and `UtahLegislatureProvider`. Update `getBillsBySession` to pass the session it received through to each `getBillDetail` call. Remove the `getCurrentSession()` call inside `getBillDetail`.

2. **Non-JSON response guard:** Replace `res.json()` with `res.text()` → `JSON.parse()` in all three fetch blocks in `utah-legislature.ts`. The Utah Legislature API returns HTTP 200 with plain-text body `Invalid request` for bad inputs (confirmed by curl). `res.ok` does not catch this; `res.json()` then throws a cryptic parse error. Explicitly detect a non-JSON body and throw a descriptive error instead.

### Scope

**In Scope:**
- Fix `getBillDetail` signature in interface and implementation
- Fix `getBillsBySession` call site inside the provider
- Replace `res.json()` with `res.text()` + `JSON.parse()` guard in all three fetch blocks (`getLegislatorsByDistrict`, `getBillsBySession`, `getBillDetail`)
- Update affected tests

**Out of Scope:**
- Any other callers — `getBillDetail` is only called from within `getBillsBySession`; no tools or cache modules invoke it directly
- Changes to `getCurrentSession()` — it is still used by `getLegislatorsByDistrict` and can remain

---

## Context for Development

### Codebase Patterns

- `console.log` is **FORBIDDEN** in `apps/mcp-server/` — only `console.error` permitted (ESLint enforced). Do not add any logging calls.
- `url(...segments)` method appends `this.apiKey` as the final path segment automatically; do not add it manually.
- `retryWithDelay` is already used inside `getBillDetail` — do **not** wrap it again in `getBillsBySession`.
- `no any`, `strict: true` — all types must be explicit.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/mcp-server/src/providers/types.ts` | `LegislatureDataProvider` interface — update `getBillDetail` signature |
| `apps/mcp-server/src/providers/utah-legislature.ts` | Implementation — update method + call site |
| `apps/mcp-server/src/providers/utah-legislature.test.ts` | 3 direct call sites to update + 1 new URL-verification test |
| `apps/mcp-server/src/cache/refresh.test.ts` | `makeProvider` factory defines `getBillDetail` mock — update type signature |

### Technical Decisions

- Keep `getBillDetail` on the public `LegislatureDataProvider` interface (it is tested directly and is part of the provider abstraction contract).
- Remove the `getCurrentSession()` call inside `getBillDetail` entirely — the caller always knows the session and must supply it.
- The `getCurrentSession()` helper in `utah-legislature.ts` can remain; it is still used by `getLegislatorsByDistrict`.

---

## Implementation Plan

### Tasks

Tasks are ordered lowest-dependency first.

**Task 0 — Add non-JSON response guard to all three fetch blocks** (`providers/utah-legislature.ts`)

The Utah Legislature API returns HTTP 200 + plain-text `Invalid request` for bad inputs. `res.ok` is true, so execution proceeds to `res.json()`, which throws a cryptic JSON parse error. Replace all three `res.json()` calls with `res.text()` + explicit `JSON.parse()` inside a try/catch.

Apply this pattern to the fetch callback inside `getLegislatorsByDistrict`, `getBillsBySession`, and `getBillDetail`:

```ts
// Before:
const res = await fetch(url)
if (!res.ok) throw new Error(`Legislature API responded with HTTP ${res.status}`)
return res.json() as Promise<unknown>

// After:
const res = await fetch(url)
if (!res.ok) throw new Error(`Legislature API responded with HTTP ${res.status}`)
const text = await res.text()
let parsed: unknown
try {
  parsed = JSON.parse(text)
} catch {
  throw new Error(`Legislature API returned non-JSON response: ${text}`)
}
return parsed
```

> The variable name `parsed` conflicts with the outer Zod `parsed` variable in each method — use a different name such as `rawJson` to avoid shadowing.

**Task 1 — Update the interface** (`providers/types.ts`, line 16)

Change:
```ts
getBillDetail(billId: string): Promise<BillDetail>
```
To:
```ts
getBillDetail(billId: string, session: string): Promise<BillDetail>
```

**Task 2 — Fix the implementation** (`providers/utah-legislature.ts`)

2a. Update `getBillDetail` signature and remove `getCurrentSession()` call inside it:

```ts
// Before (line 164-165):
async getBillDetail(billId: string): Promise<BillDetail> {
  const session = getCurrentSession()
  const url = this.url('bills', session, billId)

// After:
async getBillDetail(billId: string, session: string): Promise<BillDetail> {
  const url = this.url('bills', session, billId)
```

2b. Update the call site inside `getBillsBySession` (line 149):

```ts
// Before:
parsed.data.map((stub) => this.getBillDetail(stub.number))

// After:
parsed.data.map((stub) => this.getBillDetail(stub.number, session))
```

**Task 3 — Update tests** (`providers/utah-legislature.test.ts`)

3a. Update the 3 existing `getBillDetail` call sites to pass `'2026GS'` as session:
- Line 368: `provider.getBillDetail('HB0001')` → `provider.getBillDetail('HB0001', '2026GS')`
- Line 386: `provider.getBillDetail('HB0001')` → `provider.getBillDetail('HB0001', '2026GS')`
- Line 397: `provider.getBillDetail('HB0001')` → `provider.getBillDetail('HB0001', '2026GS')`

3b. Add a new test inside `describe('getBillDetail')` verifying the session is used in the URL (not hardcoded):

```ts
it('builds URL using the provided session, not getCurrentSession()', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => mockBillDetailResponse,
  })

  const promise = provider.getBillDetail('HB0001', '2025GS')
  await vi.runAllTimersAsync()
  await promise

  const calledUrl = fetchMock.mock.calls[0][0] as string
  expect(calledUrl).toContain('/bills/2025GS/HB0001/')
})
```

**Task 4 — Update refresh test mock type** (`cache/refresh.test.ts`)

The `makeProvider` factory (line 81) stubs `getBillDetail` with an explicit generic type. Update it to match the new signature:

```ts
// Before:
getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),

// After:
getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
```

> Note: `getBillDetail` is never actually called in `refresh.test.ts` — this is purely a TypeScript type alignment. The mock always throws "not implemented" and is never invoked.

### Acceptance Criteria

**AC1 — Happy path session routing (Given/When/Then)**
- Given: `getBillsBySession('2025GS')` is called and the API bill list returns `[{ number: 'HB0001', ... }]`
- When: `getBillDetail` is invoked for that stub
- Then: the fetch URL contains `/bills/2025GS/HB0001/` (not `/bills/2026GS/HB0001/`)

**AC2 — Session param test**
- Given: `provider.getBillDetail('HB0001', '2025GS')` is called with a mock API success
- When: the promise resolves
- Then: the captured fetch URL contains `/bills/2025GS/HB0001/`

**AC3 — Non-JSON body is caught explicitly**
- Given: the fetch succeeds (HTTP 200) but the body is `Invalid request` (not valid JSON)
- When: `retryWithDelay` runs the callback
- Then: a `new Error('Legislature API returned non-JSON response: Invalid request')` is thrown (not a raw JSON.parse error), which is caught by the outer catch block and wrapped into the AppError

**AC4 — Existing tests pass unchanged**
- All existing `getBillDetail` tests (API failure, schema failure, field mapping) continue to pass after updating call sites to include the session argument.
- Existing `getLegislatorsByDistrict` and `getBillsBySession` tests continue to pass after the `res.json()` → `res.text()`/`JSON.parse()` refactor — the `fetchMock` in tests uses `json: async () => ...` on the mock response object, so tests must be updated to use `text: async () => JSON.stringify(...)` instead, OR keep `json` and update the implementation to call `res.json()` only as a fallback. **Preferred:** keep using `res.text()` + `JSON.parse()` in the implementation and update affected test mocks to use `text: async () => JSON.stringify(mockData)` so the mock matches the new code path.

**AC5 — TypeScript compiles clean**
- `pnpm -F mcp-server typecheck` exits 0.

**AC6 — All tests pass**
- `pnpm -F mcp-server test` exits 0.

---

## Additional Context

### Dependencies

None — this is a self-contained change within `apps/mcp-server/src/providers/`.

### Testing Strategy

Run after implementation:
```bash
pnpm -F mcp-server typecheck
pnpm -F mcp-server test
```

### Notes

- The `fetchMock` in `utah-legislature.test.ts` is established via `vi.spyOn(global, 'fetch')` — check the top of the test file to confirm the exact variable name before writing the URL assertion.
- `mockBillDetailResponse` is already defined in the test file and maps to a valid `apiBillDetailSchema` shape — reuse it in the new test.
- The `makeProvider` function in `refresh.test.ts` is defined once (line 75) and used in multiple `describe` blocks — only one change needed there.
