# Code Review: Story 9.6 - Migrate MCP Transport to McpAgent

**Status:** Completed
**Reviewer:** Gemini CLI
**Date:** 2026-04-07

## Summary
The migration to `McpAgent` and Durable Objects is a critical improvement for SSE stability on Cloudflare Workers. The ESM transition is clean and the architecture is well-decoupled.

## Action Items

### 1. Fix Scheduled Handler Reliability (High Priority)
- **Finding:** `scheduled` handler does not await cache warmup tasks or use `ctx.waitUntil()`.
- **Action:** Update `worker.ts` to use `ctx.waitUntil(Promise.all([...]))` to prevent the isolate from shutting down prematurely.

### 2. Add MCP Delegation Error Boundary (High Priority)
- **Finding:** `mcpHandler.fetch` is unguarded.
- **Action:** Add a `try/catch` block in `worker.ts` to return a structured JSON error with CORS headers if the Durable Object or SDK fails.

### 3. Add Environment Validation in Durable Object (Medium Priority)
- **Finding:** `init()` assumes `this.env.DB` is present.
- **Action:** Add an explicit check for the `DB` binding in `OnRecordMCP.init()`.

### 4. Document Local Development Trade-off (Low Priority)
- **Finding:** MCP tools are no longer available via the Node.js path (`index.ts`).
- **Action:** Update `apps/mcp-server/README.md` to clarify that `wrangler dev` is now the required path for testing MCP tools.

## Final Result
**Approved with changes.** The implementation is solid, but the reliability of background tasks and error reporting for the MCP route needs the fixes identified above.
