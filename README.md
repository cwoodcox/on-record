# On Record

A civic tool that helps Utah constituents identify their state legislators and write informed, personalized letters to them. Built as a monorepo with an MCP (Model Context Protocol) server backend and a Next.js web frontend.

## What It Does

A constituent enters their home address. On Record looks up their Utah House and Senate district representatives, then helps them compose and send a voiced, cited letter — via email or text — in one action.

## Prerequisites

- Node.js 20+
- pnpm — install via corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

## Quick Start

```bash
git clone <repo-url>
cd on-record
pnpm install

# Set up environment variables
cp apps/mcp-server/.env.example apps/mcp-server/.env
# Edit apps/mcp-server/.env — fill in UTAH_LEGISLATURE_API_KEY and UGRC_API_KEY

# Web app has no required env vars for local dev
# Optional: cp apps/web/.env.example apps/web/.env.local
```

## Environment Variables

### MCP Server (`apps/mcp-server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | HTTP port the MCP server listens on |
| `NODE_ENV` | No | `development` | Runtime environment (`development` / `production` / `test`) |
| `UTAH_LEGISLATURE_API_KEY` | **Yes** | — | Developer token for the Utah Legislature API (`glen.le.utah.gov`). Obtain at [le.utah.gov](https://le.utah.gov/GIS/gisoverview.xhtml) |
| `UGRC_API_KEY` | **Yes** | — | API key for the UGRC GIS API (`api.mapserv.utah.gov`). Obtain at [developer.mapserv.utah.gov](https://developer.mapserv.utah.gov/) |

The server will refuse to start without `UTAH_LEGISLATURE_API_KEY` and `UGRC_API_KEY`.

### Web App (`apps/web/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_MCP_SERVER_URL` | No | `http://localhost:3001` | URL of the running MCP server |

## Running Locally

Start both servers (in separate terminals or with a process manager):

```bash
pnpm dev:mcp   # MCP server — http://localhost:3001
pnpm dev:web   # Next.js web app — http://localhost:3000
```

Both commands are defined in the root `package.json` and delegate to the appropriate workspace.

## Testing

```bash
# Run mcp-server unit tests (Vitest)
pnpm test

# Explicit per-workspace variant
pnpm --filter mcp-server test
```

Unit tests run automatically on every PR via GitHub Actions.

E2E tests with Playwright are deferred to a future story. `pnpm test:e2e` is a placeholder in the root `package.json` — Playwright is not yet installed as a dev dependency.

## Code Quality

```bash
# Lint
pnpm --filter mcp-server lint     # ESLint with TypeScript rules (flat config)
pnpm --filter web lint            # ESLint with Next.js rules

# Type-check (without emitting output)
pnpm --filter mcp-server typecheck
pnpm --filter web typecheck
```

All of the above run automatically on every pull request targeting `main` via `.github/workflows/ci.yml`.

## Project Structure

```
on-record/
├── apps/
│   ├── mcp-server/          # Hono-based MCP server (TypeScript)
│   │   ├── src/
│   │   │   ├── cache/       # SQLite cache (better-sqlite3) — isolated here only
│   │   │   ├── lib/         # Shared utilities (retry, AppError)
│   │   │   ├── tools/       # MCP tool handlers (no barrel files)
│   │   │   └── index.ts     # Entry point
│   │   └── .env.example
│   └── web/                 # Next.js 16 + React 19 + Tailwind v4 frontend
│       ├── src/
│       │   ├── app/         # Next.js App Router pages
│       │   └── components/  # UI components (no barrel files)
│       └── .env.example
├── packages/
│   ├── types/               # Shared TypeScript types (AppError, etc.)
│   └── typescript-config/   # Shared tsconfig bases (base, node, nextjs)
├── .github/
│   └── workflows/
│       └── ci.yml           # PR pipeline: lint + typecheck + unit tests
└── package.json             # Root workspace scripts
```

## Architecture

On Record is a pnpm workspaces monorepo. The MCP server exposes tool endpoints over HTTP for the AI assistant layer; the Next.js web app provides the constituent-facing UI. The two apps communicate via the MCP protocol.

For a detailed technical overview — including the data flow, caching strategy, retry logic, and testing pyramid — see [`_bmad-output/planning-artifacts/architecture.md`](./_bmad-output/planning-artifacts/architecture.md).

## CI/CD

Every pull request to `main` runs the full quality gate via GitHub Actions:

1. Lint (`apps/mcp-server` and `apps/web`)
2. TypeScript type-check (both apps)
3. Vitest unit tests (`apps/mcp-server`)

Deployment (Railway for the MCP server, Vercel for the web app) is configured separately and not automated through this repo at the current stage.
