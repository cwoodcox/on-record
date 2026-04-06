# Story 9.5: CI/CD — Wrangler Deploy to Cloudflare Workers

Status: ready-for-dev

## Story

As an **operator**,
I want mcp-server automatically deployed to Cloudflare Workers on every push to main,
So that code merged to main is live in production without manual intervention.

## Acceptance Criteria

1. **Given** the existing `.github/workflows/ci.yml` **when** a `deploy-mcp-server` job is added **then** it runs only on `push` to `main` (not on pull requests)
2. **And** it has `needs: ci` so deploy only starts after lint/typecheck/tests pass
3. **And** it runs `wrangler d1 migrations apply on-record-cache --remote` before deploying
4. **And** it runs `wrangler deploy` from `apps/mcp-server/` using `cloudflare/wrangler-action@v3`
5. **And** it uses `secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID` (same secrets already used by `deploy-web`)

6. **Given** a migration file has already been applied to the remote D1 **when** `wrangler d1 migrations apply` runs again in CI **then** it is a no-op (idempotent — the `d1_migrations` table Wrangler maintains prevents double-application)

7. **Given** both `deploy-web` and `deploy-mcp-server` exist **when** `deploy-mcp-server` is added **then** both deploy jobs run in parallel after `ci` passes — `deploy-mcp-server` must NOT have `needs: deploy-web`

## Tasks / Subtasks

- [ ] Task 1: Add `deploy-mcp-server` job to `.github/workflows/ci.yml` (AC 1–7)
  - [ ] Add job after `deploy-web`, with `needs: ci` and `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
  - [ ] Copy checkout / pnpm / node / install steps from `deploy-web` (identical setup)
  - [ ] Add "Apply D1 migrations" step using `cloudflare/wrangler-action@v3` with `command: d1 migrations apply on-record-cache --remote` and `workingDirectory: apps/mcp-server`
  - [ ] Add "Deploy to Cloudflare Workers" step using `cloudflare/wrangler-action@v3` with `command: deploy` and `workingDirectory: apps/mcp-server`
  - [ ] Both wrangler-action steps use `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}` and `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`

- [ ] Task 2: Verify final CI YAML
  - [ ] `deploy-mcp-server` has no `needs: deploy-web` (parallel deployment)
  - [ ] Both `deploy-web` and `deploy-mcp-server` only have `needs: ci`
  - [ ] YAML lints cleanly (no tab characters, consistent 2-space indent)

## Dev Notes

### Existing CI Structure

The current `.github/workflows/ci.yml` already has:

```yaml
jobs:
  ci:                  # lint + typecheck + test (runs on PR and push to main)
  deploy-web:          # deploys Next.js to Cloudflare Pages (push to main only, needs: ci)
```

Add `deploy-mcp-server` as a third job, parallel to `deploy-web`.

### `deploy-web` Pattern — Copy Exactly for Setup Steps

The setup steps (checkout, pnpm, node, install) in `deploy-web` are the template:

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Setup pnpm
    uses: pnpm/action-setup@v4
    with:
      version: '10'

  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'pnpm'

  - name: Install dependencies
    run: pnpm install --frozen-lockfile
```

Copy these verbatim. The `pnpm install` is required for the deploy step because `wrangler deploy` bundles `src/worker.ts` and its imports.

### Wrangler Action — Two Steps

Use `cloudflare/wrangler-action@v3` for BOTH the migrations and the deploy. Each invocation runs one command:

**Step 1 — Apply D1 migrations:**
```yaml
- name: Apply D1 migrations
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: apps/mcp-server
    command: d1 migrations apply on-record-cache --remote
```

**Step 2 — Deploy worker:**
```yaml
- name: Deploy to Cloudflare Workers
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: apps/mcp-server
    command: deploy
```

The `workingDirectory: apps/mcp-server` is critical — it ensures wrangler reads `apps/mcp-server/wrangler.toml` (which has the D1 binding, rate limiter binding, and cron triggers).

### D1 Database Name

The D1 database name in `wrangler.toml` is `on-record-cache`. The migrations command must match exactly:
```
wrangler d1 migrations apply on-record-cache --remote
```
The `--remote` flag targets the production D1 (as opposed to `--local` which targets Miniflare simulation). Migration files live in `apps/mcp-server/migrations/001-initial-schema.sql`.

### Idempotency

Wrangler tracks applied migrations in a `d1_migrations` table it creates automatically. Running `apply` a second time is a no-op — it skips already-applied files. No guard needed.

### Secrets

Both secrets are already configured in the GitHub repo (used by `deploy-web`):
- `CLOUDFLARE_API_TOKEN` — Wrangler API token with Workers and D1 write permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier

No new secrets need to be created.

### wrangler.toml State After Story 9.4

```toml
name = "on-record-mcp"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "on-record-cache"
database_id = "877ea9f0-a442-4bbd-81a4-2701bc29a143"

[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 60
  period = 60

[triggers]
crons = ["0 6 * * *", "0 * * * *"]
```

`wrangler deploy` reads this file directly from `apps/mcp-server/wrangler.toml`. Do NOT modify wrangler.toml in this story.

### Complete `deploy-mcp-server` Job

```yaml
deploy-mcp-server:
  name: Deploy MCP Server to Cloudflare Workers
  runs-on: ubuntu-latest
  needs: ci
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4
      with:
        version: '10'

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Apply D1 migrations
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        workingDirectory: apps/mcp-server
        command: d1 migrations apply on-record-cache --remote

    - name: Deploy to Cloudflare Workers
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        workingDirectory: apps/mcp-server
        command: deploy
```

### Architecture Guardrails (CLAUDE.md)

- `console.log` FORBIDDEN in `apps/mcp-server/` — not relevant here (YAML only), but noted
- No code changes in `src/` — this story is YAML-only
- `wrangler` is in the **root** `package.json` devDependencies (not in `apps/mcp-server/package.json`) — `pnpm install --frozen-lockfile` from the repo root installs it at `node_modules/.bin/wrangler`; wrangler-action also installs its own copy, which is fine
- The `deploy` script in `apps/mcp-server/package.json` is `"deploy": "wrangler deploy"` — but we invoke via wrangler-action directly, not via pnpm script

### Previous Story Intelligence (9.4)

- Story 9.4 added `[[ratelimits]]` to `wrangler.toml` and regenerated `worker-configuration.d.ts` — these are committed; no action needed
- Story 9.4 confirmed `wrangler deploy --dry-run` passes from `apps/mcp-server/` — the bundle compiles cleanly
- 227 tests pass after story 9.4
- No changes to `src/index.ts` or `app.ts` in recent stories — Node.js path preserved

### Testing This Story

There are no unit tests for a CI YAML change. Verification is:
1. YAML is syntactically valid (no tab characters, proper indentation)
2. Push to main triggers `deploy-mcp-server` (observed in GitHub Actions after merge)
3. `deploy-mcp-server` and `deploy-web` both start simultaneously after `ci` completes

Since story 9.2 (which contains the D1 cache layer) is currently in `review` status, the Worker itself may not be fully functional yet — but the CI pipeline can be wired regardless. The deploy will succeed as long as the Worker bundle compiles.

### GHA Diagnostic Commands (CLAUDE.md)

If CI fails post-merge:
```bash
gh run list --repo cwoodcox/on-record
gh run view <run-id> --log-failed
```

## File List

| File | Action | Notes |
|------|--------|-------|
| `.github/workflows/ci.yml` | MODIFY | Add `deploy-mcp-server` job after `deploy-web` |

No other files are modified in this story.

## Dev Agent Record

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-06 | Story created | Story 9.5 — CI/CD wrangler deploy to Cloudflare Workers |
