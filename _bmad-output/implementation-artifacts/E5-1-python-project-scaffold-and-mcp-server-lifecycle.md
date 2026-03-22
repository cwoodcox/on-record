# Story E5-1: Python Project Scaffold and MCP Server Lifecycle

Status: backlog

## Story

As a **developer running evals**,
I want a Python project scaffold in `evals/` with a reliable MCP server lifecycle manager,
so that I can run eval harness tests against the real MCP server without manual setup or teardown.

## Goal

Set up the `evals/` directory with Python tooling and a reliable MCP server lifecycle manager.

## Deliverables

- `evals/pyproject.toml` — Python project config (dependencies, pytest config)
- `evals/.python-version` — pin Python 3.10+ (required for async/await patterns used by ConversationSimulator)
- `evals/conftest.py` — pytest fixtures for server lifecycle (session-scoped)
- `evals/server.py` — `start_mcp_server()` / `stop_mcp_server()` using `subprocess.Popen`, polling `GET /health` with retry, teardown on exit
- `evals/.gitignore` — ignore `.venv/`, `__pycache__/`, `.deepeval/`
- Root `.gitignore` update — ignore `evals/.venv/`

## Acceptance Criteria

1. `cd evals && uv sync` (or `pip install -e .`) installs all dependencies including `deepeval>=3.7.0`, `anthropic`, `httpx`, `openai` (for default `simulator_model`)
2. `pytest --co` discovers test files without errors
3. Server fixture starts MCP server, confirms health check passes within 30s (the server performs a blocking warm-up of legislators from an external API on startup), tears down on scope exit. The fixture polls `GET /health` with 1-second intervals up to 30 retries before failing
4. Server fixture fails fast with clear error if `PORT`, API keys, or Node.js unavailable
5. No pnpm workspace changes — `evals/` is isolated Python, not a pnpm package

## Context

- MCP server health check: `GET /health` → `{ status: "ok", service: "on-record-mcp-server" }`
- Start command: `node dist/index.js` (after `pnpm build`) or `tsx watch --env-file=.env src/index.ts` for dev
- Required env vars for MCP server: `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`, optional `PORT` (default 3001)
- Server startup includes blocking warm-up of legislators from external API — 30s timeout is required (10s is insufficient)
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 1, Story E5-1)
