# On Record — Project Context

This file is auto-loaded by BMAD dev-story agents. It documents conventions that every agent must follow.

## Git Commit Conventions

**Commit after every completed story task.** Do not batch multiple tasks into a single commit.

Commit message format:
```
feat(story-X.Y): <imperative summary of what was done>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Examples:
```
feat(story-1.2): add zod env schema with fail-fast startup validation
feat(story-1.2): add singleton pino logger with lazy Proxy for ESM safety
feat(story-1.3): initialize SQLite cache schema with better-sqlite3
fix(story-1.2): resolve exactOptionalPropertyTypes TS error in MCP transport
```

Stage only the files created or modified by that task. Never use `git add -A` or `git add .` (risks committing `.env` or generated files).

After the final task in a story, commit the updated story file and sprint-status.yaml together:
```
chore(story-X.Y): mark story review-ready, update sprint-status
```

## TypeScript Conventions

- `exactOptionalPropertyTypes: true` is enabled — never assign `undefined` to optional properties explicitly
- All files use `.js` extensions in imports (NodeNext module resolution)
- No barrel `index.ts` files in `src/middleware/` or `src/tools/`

## Logging Conventions

- Always use the singleton `logger` from `apps/mcp-server/src/lib/logger.ts`
- Every log call must include a `source` field: `logger.info({ source: 'cache' }, '...')`
- `console.log` is forbidden in `apps/mcp-server/` (ESLint rule)

## Package Manager

- **pnpm** only. Never use npm or yarn.
- Run installs from monorepo root: `pnpm --filter @on-record/<package> add <dep>`
- Exact version pins for: `hono`, `@modelcontextprotocol/sdk`, `hono-rate-limiter`, `pino`

## Known SDK Issues

- `StreamableHTTPServerTransport.onclose` typed as `(() => void) | undefined` conflicts with `Transport` interface under `exactOptionalPropertyTypes`. Suppress with `@ts-expect-error` and a comment explaining the SDK mismatch.
