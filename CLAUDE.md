# on-record — Project Conventions

## Project Structure

pnpm workspaces monorepo:
- `apps/web` — Next.js 16.1.6 frontend
- `apps/mcp-server` — TypeScript MCP backend (Hono + better-sqlite3)
- `packages/typescript-config`, `packages/types` — shared packages

**Key paths:**
- Planning artifacts: `_bmad-output/planning-artifacts/`
- Stories: `_bmad-output/implementation-artifacts/`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- BMAD workflows: `_bmad/bmm/workflows/4-implementation/`

## Tech Stack

- Node.js 20+, TypeScript ^5.7, `strict: true` everywhere
- Next.js 16.1.6, React 19.2.3, Tailwind v4
- Hono 4.12.1, @modelcontextprotocol/sdk 1.26.0
- hono-rate-limiter 0.4.2, zod (latest)
- better-sqlite3 12.6.2
- Vitest 4.0.18, Playwright 1.58.2
- node-cron 4.2.1

## Architectural Rules

- Logging in `apps/mcp-server/`: call `console.log/warn/error` directly with a structured object — `console.log({ time: Date.now(), source: 'subsystem', ...context, msg: 'description' })`. No logger abstraction, no pino.
- No barrel files in `components/` or `tools/`
- All shared types in `packages/types/` only — never define shared types elsewhere
- No `any`, no `@ts-ignore`
- AppError: `{ source, nature, action }` three-field format
- Pino logger: every entry has `source` field; addresses always `'[REDACTED]'`
- better-sqlite3 imports confined to `apps/mcp-server/src/cache/` only (Boundary 4)
- Tests mock at `LegislatureDataProvider` boundary, never touch SQLite directly

## GitHub Issue Workflow

- Each epic and story has a mirrored GitHub issue in cwoodcox/on-record
- Close/update the relevant issue when a story moves to done — reference in commit (e.g. `fixes #12`)
- After every create-story + spec refinements: commit the story file, push, and update the GitHub issue body with a summary of the final spec (key AC, testing approach, file deliverables)
- This keeps the GitHub project board in sync with sprint-status.yaml

## Story Workflow (BMAD)

The cycle for each story:
1. `create-story` workflow → generates story file, sets status `ready-for-dev`
2. `dev-story` workflow → implements it, sets status `review`
3. `code-review` workflow → adversarial review, fixes issues, sets status `done`

- Invoke via: read `_bmad/core/tasks/workflow.xml` + specific workflow yaml, then execute
- Code review command: `/bmad-bmm-code-review on story X.Y`
- create-story and dev-story can be run as background agents (YOLO mode, no pausing)
- create-story agents can run in parallel ONLY for genuinely independent stories (no shared interfaces/output)
- dev-story agents must be sequential (later stories depend on earlier implementations)

## Coding Conventions

### Error handling
- MCP tool handlers: keep ALL code that can throw inside the try/catch block — post-retry calls (e.g. `getActiveSessionId()`) that escape the catch break the structured-JSON contract

### Testing
- Error-path tests: use `toContain('key phrase')` on `nature`/`action` fields — not type-only checks, not exact string match. Key phrases must be specified in story AC.
- Tests with mocks using `mockReturnValue`: always add `toHaveBeenCalledWith` to verify correct args — `mockReturnValue` returns the same thing regardless of args
- Vitest rejection tests: attach `.rejects` assertion BEFORE `vi.runAllTimersAsync()` to avoid `PromiseRejectionHandledWarning`
- `pnpm install` must be run and updated `pnpm-lock.yaml` committed when changing package specifiers — mismatched specifier vs lockfile causes `ERR_PNPM_OUTDATED_LOCKFILE` in CI

### SQLite / FTS5
- FTS5 content table queries: use JOIN pattern (`FROM bill_fts JOIN bills b ON b.rowid = bill_fts.rowid WHERE bill_fts MATCH ? ORDER BY bill_fts.rank`) — subquery approach loses BM25 ranking
- Empty MATCH string throws SQLite syntax error — always guard with early return
- Bills table uses composite `PRIMARY KEY (id, session)` — bill numbers repeat across sessions

### ESLint
- ESLint 9 flat config: `no-restricted-imports` rules do NOT merge across config objects — keep all patterns for the same file scope in one block or the last one silently wins

### LLM tool descriptions
- Enumerating valid values in a tool description causes LLMs to treat them as the only valid values — describe intent ("freeform search term derived from constituent's concern"), not implementation (list of categories)

## Code Review Checklist

Watch for:
- Phantom CSS/JS dependencies (imported but not in package.json)
- `.npmrc` `approve-builds=true` overriding `onlyBuiltDependencies`
- tsconfig overrides that contradict shared config intent
- `packages/types/package.json` missing `exports` field for NodeNext resolution
- Story File List not documenting auto-generated files
- Cross-layer duplication (tools/ reimplementing lib/) as likely as same-layer duplication
- GHA tooling: use `gh run list --repo cwoodcox/on-record` and `gh run view <id> --log-failed` to diagnose CI failures

## UGRC GIS API

- Geocode endpoint: `GET /api/v1/geocode/<street>/<zone>?spatialReference=4326&apiKey=...`
- Search endpoint geometry format: `point:{"x":lon,"y":lat}` (ArcGIS JSON — NOT `point:lon,lat`)
- Current district tables (2022–2032 redistricting):
  - House: `political.house_districts_2022_to_2032` (field: `dist`)
  - Senate: `political.senate_districts_2022_to_2032` (field: `dist`)
- Future optimization: `political.district_combination_areas_2026` has house + senate + school board + congressional in one query

## Utah Legislature API

- `search_bills` returns sponsored bills only — NOT voting record (Utah Legislature API doesn't expose vote records)
- System prompt must not imply voting record access; LLM must not claim it
- Post-MVP: migrate to OpenStates (structured vote data, 50-state, well-documented) — cache layer survives unchanged

## Process Conventions

- **API discovery spike before spec** for any story touching a new third-party API — fill doc gaps and spot-check error cases before writing the spec
- **For new files:** check for duplication of logic already present elsewhere before writing
- Test key phrases (for `toContain` assertions) must be specified in story AC so the dev agent writes correctly from day one
