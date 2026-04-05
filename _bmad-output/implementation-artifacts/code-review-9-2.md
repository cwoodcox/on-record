# Code Review Report: Story 9.2 — Migrate Cache Layer to D1 Async API

## Summary
The migration of the cache layer from synchronous `better-sqlite3` to the asynchronous D1 API is technically sound in its core implementation (`cache/*.ts`). The move of cache tests to the `@cloudflare/vitest-pool-workers` environment provides high-confidence validation of the D1 logic.

However, several critical integration issues were identified in `worker.ts`, `index.ts`, and `schema.ts` that risk runtime failures and break the "compilable Node.js path" requirement.

## Critical Findings

### 1. Inconsistent Tool Registration in `worker.ts`
In `apps/mcp-server/src/worker.ts`, the `db` binding is passed to two tools but omitted for the third, even though all tool registration functions were updated to require it.

- **File:** `apps/mcp-server/src/worker.ts`
- **Issue:** `registerResolveAddressTool(server)` is called without `env.DB`.
- **Impact:** While `resolve_address` does not currently use the cache, the TypeScript signature for `registerResolveAddressTool` was updated to require `D1Database`. This will cause a type error and potential runtime failure if the signature is enforced.
- **Recommendation:** Pass `env.DB` to all three registration calls for consistency and type safety.

### 2. Broken Node.js Path in `index.ts`
The Node.js path (intended to remain compilable) is fundamentally broken by the strategy used in `index.ts`.

- **File:** `apps/mcp-server/src/index.ts`
- **Issue:** A `better-sqlite3` instance is cast as `unknown as D1Database`.
- **Impact:** `better-sqlite3` and `D1Database` have incompatible APIs. Specifically:
    - `db.prepare(...).all()` in `better-sqlite3` returns an array, but in D1 it returns an object `{ results: T[] }`.
    - `db.batch()` does not exist in `better-sqlite3`.
- **Result:** The `seedSessions(db)` and `warmUp*Cache(db)` calls in `index.ts` will throw runtime errors immediately upon startup on the Node.js path.
- **Recommendation:** If the Node.js path must remain "compilable but not necessarily functional," the `index.ts` calls should be more robustly guarded or the cast should be acknowledged as a "compilation-only" hack that will fail at runtime.

### 3. Fragile DDL Execution in `schema.ts`
The `applySchema` function attempts to split and execute a multi-statement SQL string using `db.exec()`.

- **File:** `apps/mcp-server/src/cache/schema.ts`
- **Issue:** D1's `exec()` is designed for single statements or specific multi-statement patterns that vary by environment (Miniflare vs. Production).
- **Impact:** The current implementation splits by `;`, which is better than passing the whole block, but `db.exec()` in D1 returns a `Promise<D1ExecResult>`, yet it is being called in a loop without checking results.
- **Recommendation:** Use `db.batch()` for the initial schema application to ensure atomicity and better compatibility with D1's preferred multi-statement pattern.

### 4. Missing `db` Parameter in `registerResolveAddressTool`
- **File:** `apps/mcp-server/src/tools/resolve-address.ts`
- **Issue:** The registration function accepts `db: D1Database` but it is not used in the handler.
- **Impact:** While not a functional bug, it adds an unused parameter that is then inconsistently provided in `worker.ts`.

## Minor Observations
- **`db.batch` Chunking:** The implementation correctly handles the 100-statement limit for `db.batch()`, which is a key detail for D1 stability.
- **FTS5 Rebuild:** The order of FTS5 rebuild (after the batch commit) is correct.
- **Type Safety:** The addition of `src/cloudflare-test.d.ts` correctly resolves ambient type issues in the Workers test pool.

## Proposed Plan of Action
1. **Fix `worker.ts`:** Add the missing `env.DB` argument to the `registerResolveAddressTool` call.
2. **Refine `index.ts`:** Update the `better-sqlite3` cast to `any` and add more explicit try/catch guards with informative log messages explaining that the Node.js path is for compilation only.
3. **Enhance `schema.ts`:** Refactor `applySchema` to use `db.batch()` for more robust DDL execution.
4. **Clean up `resolve-address.ts`:** Remove the unused `db` parameter if it's not needed for future-proofing, or consistently pass it.
