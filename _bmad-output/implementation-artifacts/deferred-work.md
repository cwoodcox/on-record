
## Deferred from: code review (2026-04-05) - 9-1-wrangler-scaffold-and-workers-entrypoint.md

- In-Memory Session Store / Affinity [apps/mcp-server/src/app.ts] — Session state is lost on isolate restart/eviction; affinity not guaranteed. Deferred (MVP limitation).
- IP Spoofing Risk [apps/mcp-server/src/middleware/rate-limit.ts] — trusts x-forwarded-for without verification. Deferred (already marked as KNOWN RISK in code).
\n## Deferred from: code review of story-9-1 (2026-04-05)\n\n- **In-Memory Session Store / Affinity**: Session state is lost on isolate restart/eviction; affinity not guaranteed. Deferred (MVP limitation).\n- **IP Spoofing Risk**: `rateLimitMiddleware` trusts x-forwarded-for without verification. Deferred (already marked as KNOWN RISK in code).\n- **Fragile Global State**: Module-level `_registerTools` risk in Workers isolates. — deferred, pre-existing\n- **Session Affinity**: Assumption that isolates persist for session-id life. — deferred, pre-existing
\n## Deferred from: code review of story-9-4 (2026-04-05)\n\n- Rate limiting is Workers-only, causing environment drift [worker.ts:30] — deferred, pre-existing (Story 9.4 scope)
