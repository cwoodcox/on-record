
## Deferred from: code review of 4-9-bill-url-computed-field.md (2026-04-18)

- `session.slice(0, 4)` trusts upstream session format with no length/format validation [`apps/mcp-server/src/cache/bills.ts`] — session values come from the Utah Legislature API; trust-the-upstream pattern used throughout the codebase.
- `billUrl` URL scheme hardcodes `https://le.utah.gov/~{year}/bills/static/{id}.html` with no change-detection — pre-existing architectural assumption documented in the 2026-04-18 research; no mechanism to detect Utah Legislature URL scheme changes.

## Deferred from: code review of 4-8-mcp-tool-description-chatgpt-apps-behavioral-encoding.md (2026-04-19)

- `apps/web/src/app/layout.tsx` metadata says "surfaces their voting record" — contradicts the `search_bills` data-boundary statement that results are sponsored bills only, NOT voting record data. Pre-existing inconsistency; story 4.8 makes it more conspicuous but did not introduce it.

## Deferred from: code review (2026-04-05) - 9-1-wrangler-scaffold-and-workers-entrypoint.md

- In-Memory Session Store / Affinity [apps/mcp-server/src/app.ts] — Session state is lost on isolate restart/eviction; affinity not guaranteed. Deferred (MVP limitation).
- IP Spoofing Risk [apps/mcp-server/src/middleware/rate-limit.ts] — trusts x-forwarded-for without verification. Deferred (already marked as KNOWN RISK in code).

## Deferred from: code review of story-9-1 (2026-04-05)

- **In-Memory Session Store / Affinity**: Session state is lost on isolate restart/eviction; affinity not guaranteed. Deferred (MVP limitation).
- **IP Spoofing Risk**: `rateLimitMiddleware` trusts x-forwarded-for without verification. Deferred (already marked as KNOWN RISK in code).
- **Fragile Global State**: Module-level `_registerTools` risk in Workers isolates. — deferred, pre-existing
- **Session Affinity**: Assumption that isolates persist for session-id life. — deferred, pre-existing

## Deferred from: code review of story-9-4 (2026-04-05)

- Rate limiting is Workers-only, causing environment drift [worker.ts:30] — deferred, pre-existing (Story 9.4 scope)

## Deferred from: code review of story-9.5 (2026-04-06)
- Missing explicit build step [.github/workflows/ci.yml:124] — Relying on wrangler's internal build instead of an explicit build command.
- Missing GitHub Environments [.github/workflows/ci.yml:110] — Deployment secrets are top-level; lacks environment gating/protection rules.
- Missing observability/notifications [.github/workflows/ci.yml:84] — No alerts for failed deployments.
- Missing preview environments [.github/workflows/ci.yml:84] — Unlike the web app, the MCP server has no preview/staging deployment.
- Missing post-deploy health check [.github/workflows/ci.yml:124] — No verification that the worker is functional after deployment.
