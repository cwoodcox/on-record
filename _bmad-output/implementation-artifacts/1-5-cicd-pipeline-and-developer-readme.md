# Story 1.5: CI/CD Pipeline and Developer README

Status: ready-for-dev

## Story

As a **developer**,
I want a GitHub Actions CI pipeline that enforces code quality on every PR and a README that covers local setup,
so that contributors can get started quickly and broken builds never reach main.

## Acceptance Criteria

1. A GitHub Actions workflow at `.github/workflows/ci.yml` runs on every PR targeting `main`
2. The CI pipeline runs ESLint across both apps and fails on any violation
3. The CI pipeline runs TypeScript type-check (`tsc --noEmit`) for both `apps/web` and `apps/mcp-server` and fails on any error
4. The CI pipeline runs Vitest unit tests for `apps/mcp-server` and fails on any test failure
5. The root `README.md` documents: prerequisites, local dev setup, all pnpm workspace commands, required environment variables, and how to run tests
6. `.env.example` exists in both `apps/web/` and `apps/mcp-server/` (both already exist — verify contents are complete and accurate)

## Tasks / Subtasks

- [ ] Task 1: Add `typecheck` script to `apps/web/package.json` (AC: 3)
  - [ ] Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json` scripts
  - [ ] Verify `pnpm --filter web typecheck` exits 0 (web has no type errors from Story 1.1)

- [ ] Task 2: Create `.github/workflows/ci.yml` (AC: 1, 2, 3, 4)
  - [ ] Create `.github/workflows/` directory
  - [ ] Create `ci.yml` with trigger: `on: pull_request` branches `[main]`
  - [ ] Use `ubuntu-latest` runner with Node.js 20
  - [ ] Install pnpm via `pnpm/action-setup@v4` before `actions/setup-node`
  - [ ] Run `pnpm install --frozen-lockfile` to install all workspaces
  - [ ] Run ESLint for `apps/mcp-server`: `pnpm --filter mcp-server lint`
  - [ ] Run ESLint for `apps/web`: `pnpm --filter web lint`
  - [ ] Run typecheck for `apps/mcp-server`: `pnpm --filter mcp-server typecheck`
  - [ ] Run typecheck for `apps/web`: `pnpm --filter web typecheck`
  - [ ] Run unit tests: `pnpm --filter mcp-server test`
  - [ ] Confirm: NO Playwright / E2E tests in this workflow (too slow for PR CI; E2E added in future story)

- [ ] Task 3: Create root `README.md` (AC: 5)
  - [ ] Document prerequisites: Node.js 20+, pnpm (via `corepack enable && corepack prepare pnpm@latest --activate`)
  - [ ] Document clone + install: `git clone`, `pnpm install`
  - [ ] Document environment setup: copy `.env.example` files, list all required vars with descriptions
  - [ ] Document local dev commands: `pnpm dev:web` (port 3000), `pnpm dev:mcp` (port 3001)
  - [ ] Document testing: `pnpm test` (mcp-server unit tests), `pnpm test:e2e` (Playwright, future)
  - [ ] Document all pnpm workspace commands (lint, typecheck, test per filter)
  - [ ] Include project overview (what On Record does, MCP server + Next.js web app)
  - [ ] Keep it practical — no marketing copy, developer-focused

- [ ] Task 4: Verify `.env.example` files (AC: 6)
  - [ ] `apps/mcp-server/.env.example` — already complete from Story 1.2; verify PORT, NODE_ENV, UTAH_LEGISLATURE_API_KEY, UGRC_API_KEY are all documented
  - [ ] `apps/web/.env.example` — already exists with NEXT_PUBLIC_MCP_SERVER_URL; verify it's accurate
  - [ ] No changes needed unless content is wrong

- [ ] Task 5: Final verification (AC: 1–6)
  - [ ] `pnpm --filter web typecheck` passes locally
  - [ ] `pnpm --filter mcp-server lint` passes (0 violations)
  - [ ] `pnpm --filter web lint` passes (0 violations)
  - [ ] `pnpm --filter mcp-server test` passes (all tests green)
  - [ ] Visually confirm `ci.yml` YAML is valid (no syntax errors)

## Dev Notes

### Scope — What Story 1.5 IS and IS NOT

**Story 1.5 scope:**
- `.github/workflows/ci.yml` — PR pipeline (lint + typecheck + vitest only)
- Root `README.md` — developer setup guide
- `typecheck` script added to `apps/web/package.json`
- Verification that both `.env.example` files are complete

**NOT in Story 1.5:**
- Playwright / E2E CI step — deferred (no preview deployment infrastructure yet)
- Railway or Vercel deployment automation — infrastructure setup separate
- GitHub issue tracker configuration — done manually via GitHub UI (no code change needed; note it in README or skip)
- Vitest setup for `apps/web` — web has no tests yet; added in later stories (2.6, 4.6)
- Any changes to `apps/mcp-server/` source files

### Current State of the Repo (as of Stories 1.1–1.4)

**`apps/mcp-server/package.json` scripts (already correct):**
```json
{
  "dev": "tsx watch --env-file=.env src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src/"
}
```

**`apps/web/package.json` scripts (MISSING `typecheck`):**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```
→ Task 1 adds `"typecheck": "tsc --noEmit"` here.

**Root `package.json` scripts (already exist):**
```json
{
  "dev:web": "pnpm --filter web dev",
  "dev:mcp": "pnpm --filter mcp-server dev",
  "test": "pnpm --filter mcp-server test",
  "test:e2e": "playwright test"
}
```

### `.github/workflows/ci.yml` — Exact Pattern

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Typecheck, Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint (mcp-server)
        run: pnpm --filter mcp-server lint

      - name: Lint (web)
        run: pnpm --filter web lint

      - name: Typecheck (mcp-server)
        run: pnpm --filter mcp-server typecheck

      - name: Typecheck (web)
        run: pnpm --filter web typecheck

      - name: Unit tests (mcp-server)
        run: pnpm --filter mcp-server test
```

**Key CI notes:**
- `pnpm/action-setup@v4` must come BEFORE `actions/setup-node@v4` — node setup reads pnpm version for caching
- `cache: 'pnpm'` in `setup-node` caches the pnpm store between runs (uses `pnpm-lock.yaml` as cache key)
- `--frozen-lockfile` ensures CI fails if lock file is out of sync with `package.json` — prevents lock drift
- `ubuntu-latest` has `python3` and `build-essential` pre-installed — required for `better-sqlite3` native addon build via `node-gyp`
- `pnpm.onlyBuiltDependencies` in root `package.json` (already set: `["better-sqlite3", "esbuild", "sharp", "unrs-resolver"]`) controls which packages run post-install scripts — no change needed for CI

**Why no matrix strategy:** Single Node 20 job is sufficient. The architecture pins Node 20+; no need to test multiple versions at MVP stage.

### ESLint Setup — Two Different Configs

`apps/mcp-server` and `apps/web` use DIFFERENT ESLint configs:

**`apps/mcp-server`** — flat config (`eslint.config.js`, created in Story 1.2):
- `@typescript-eslint/recommended` + `no-console` + `no-floating-promises`
- Script: `"lint": "eslint src/"` (scoped to `src/`)
- Already working; no changes needed

**`apps/web`** — Next.js ESLint (`eslint-config-next`, Story 1.1):
- Uses Next.js built-in linting rules
- Script: `"lint": "eslint"` (no args — Next.js lint config handles directory)
- Already working; no changes needed

### `apps/web` TypeScript Setup

`apps/web` already has a `tsconfig.json` from Story 1.1 extending `@on-record/typescript-config`. The `tsc --noEmit` command will use it. Since Story 1.1 created the Next.js scaffold with no custom TypeScript code added yet, typecheck should pass cleanly.

**Potential issue:** Next.js 16.1.6 with React 19 may have some type issues from the generated scaffold. If `tsc --noEmit` fails on the web app, check:
- `next-env.d.ts` is present (auto-generated by Next.js)
- `tsconfig.json` includes `"moduleResolution": "bundler"` (Next.js default) — may conflict with `NodeNext` in shared config

If the shared tsconfig causes issues in web, override `"moduleResolution"` in `apps/web/tsconfig.json` to `"bundler"` (correct for Next.js/webpack bundler context).

### README Structure

```markdown
# On Record

[Brief project description — civic tool, MCP server + Next.js web app]

## What It Does
[1-2 sentences: constituent enters address → gets legislator info + can write letter]

## Prerequisites
- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)

## Quick Start
\`\`\`bash
git clone <repo>
cd on-record
pnpm install

# Copy environment files
cp apps/mcp-server/.env.example apps/mcp-server/.env
# Fill in UTAH_LEGISLATURE_API_KEY and UGRC_API_KEY
\`\`\`

## Environment Variables

### MCP Server (`apps/mcp-server/.env`)
| Variable | Required | Description |
|---|---|---|
| PORT | No (default: 3001) | HTTP port |
| NODE_ENV | No (default: development) | Environment mode |
| UTAH_LEGISLATURE_API_KEY | **Yes** | Utah Legislature API token |
| UGRC_API_KEY | **Yes** | UGRC GIS API key |

### Web App (`apps/web/.env.local`)
| Variable | Required | Description |
|---|---|---|
| NEXT_PUBLIC_MCP_SERVER_URL | No (default: http://localhost:3001) | MCP server URL |

## Running Locally
\`\`\`bash
pnpm dev:mcp    # MCP server on http://localhost:3001
pnpm dev:web    # Next.js on http://localhost:3000
\`\`\`

## Testing
\`\`\`bash
pnpm test                           # mcp-server unit tests (Vitest)
pnpm --filter mcp-server test       # same, explicit
pnpm test:e2e                       # Playwright E2E (requires running servers)
\`\`\`

## Code Quality
\`\`\`bash
pnpm --filter mcp-server lint       # ESLint (mcp-server)
pnpm --filter web lint              # ESLint (web)
pnpm --filter mcp-server typecheck  # TypeScript (mcp-server)
pnpm --filter web typecheck         # TypeScript (web)
\`\`\`

## Project Structure
[brief tree of monorepo layout]

## Architecture
[1-2 sentences pointing to planning-artifacts if they want deep dive]
```

### Previous Story Intelligence

**From Story 1.4 (just implemented):**
- `packages/types/index.ts` now exports `AppError`, `isAppError`, `createAppError`
- `apps/mcp-server/src/lib/retry.ts` exists — `retryWithDelay<T>` utility
- All tests: 35+ passing across 5 test files in mcp-server
- Commit `4cf0d20` is the latest

**From Story 1.3:**
- `better-sqlite3@12.6.2` is a native addon — CI must support `node-gyp` (ubuntu-latest does)
- `pnpm.onlyBuiltDependencies` in root `package.json` already includes `better-sqlite3`

**From Story 1.2:**
- `apps/mcp-server/eslint.config.js` uses flat config with type-checked linting (`no-floating-promises` requires `parserOptions.project`)
- The `lint` script in mcp-server is `eslint src/` — CI runs this correctly

**From Story 1.1:**
- `apps/web` uses `eslint-config-next` — the `lint` script is just `eslint` (Next.js handles dir)
- `pnpm-workspace.yaml` defines `apps/*` and `packages/*`
- `packages/typescript-config` provides shared tsconfig — web may need `moduleResolution: bundler` override

### Project Structure Notes

**Files created/modified by Story 1.5:**
```
on-record/
├── README.md                          ← NEW (root developer guide)
├── .github/
│   └── workflows/
│       └── ci.yml                     ← NEW (PR pipeline)
└── apps/
    └── web/
        └── package.json              ← MODIFIED (add typecheck script)
```

**Files NOT touched:**
```
apps/mcp-server/          ← no changes
packages/                 ← no changes
.env.example files        ← verify only, no changes expected
```

### References

- Architecture: CI/CD GitHub Actions spec [Source: `_bmad-output/planning-artifacts/architecture.md` → "CI/CD: GitHub Actions"]
- Architecture: complete directory structure (ci.yml path) [Source: `architecture.md` → "Complete Project Directory Structure"]
- Architecture: development workflow commands [Source: `architecture.md` → "Development Workflow"]
- Architecture: testing pyramid [Source: `architecture.md` → "Testing Pyramid & Mock Boundary"]
- Epics: Story 1.5 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md` → "Story 1.5"]
- Story 1.2: ESLint flat config (eslint.config.js) established [Source: `1-2-*.md` → "Dev Agent Record"]
- Story 1.3: better-sqlite3 native addon + onlyBuiltDependencies [Source: `1-3-*.md` → "Dev Notes"]
- Story 1.1: apps/web scaffold, eslint-config-next, pnpm workspaces [Source: `1-1-*.md`]
- pnpm/action-setup@v4 docs: https://github.com/pnpm/action-setup
- actions/setup-node@v4 docs: https://github.com/actions/setup-node

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
