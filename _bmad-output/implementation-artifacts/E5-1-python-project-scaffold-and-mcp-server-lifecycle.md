# Story E5-1: Python Project Scaffold and MCP Server Lifecycle

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer running evals**,
I want a Python project scaffold in `evals/` with a reliable MCP server lifecycle manager,
so that I can run eval harness tests against the real MCP server without manual setup or teardown.

## Acceptance Criteria

1. `cd evals && uv sync` (or `pip install -e .`) installs all dependencies including `deepeval>=3.7.0`, `anthropic>=0.29.0`, `httpx>=0.28.0`, `openai`, `pydantic>=2.11.7`, `pytest>=8.0.0`
2. `pytest --co` (run from `evals/`) discovers test files without errors — at minimum it should find `evals/tests/test_server_lifecycle.py`
3. Session-scoped pytest fixture `mcp_server` in `evals/conftest.py` starts the MCP server via `subprocess.Popen`, polls `GET http://localhost:{PORT}/health` with 1-second intervals up to 30 retries, confirms `{ "status": "ok", "service": "on-record-mcp-server" }` before yielding, and calls `stop_mcp_server()` on scope exit
4. If `PORT` env var is set, the fixture uses that port; if not set it defaults to `3001`. If `UTAH_LEGISLATURE_API_KEY` or `UGRC_API_KEY` are missing from the environment, the fixture raises `pytest.fail()` with a clear message before attempting to start the server
5. If Node.js is not found on `PATH`, `start_mcp_server()` raises `RuntimeError` with message containing `"Node.js not found"` before attempting to spawn the process
6. If the health check does not pass within 30 retries, `start_mcp_server()` raises `RuntimeError` with message containing `"MCP server did not become healthy"` and includes the port number and retry count
7. `evals/` has no `package.json`, no `pnpm-workspace.yaml` reference, and is not listed in the root `pnpm-workspace.yaml` — it is a fully isolated Python project
8. Root `.gitignore` updated to ignore `evals/.venv/`

## Tasks / Subtasks

- [ ] Task 1: Create `evals/pyproject.toml` (AC: 1, 7)
  - [ ] Use `[build-system]` with `hatchling` or `setuptools` (whichever is simpler; hatchling preferred)
  - [ ] `[project]` section: name `on-record-evals`, requires-python `>=3.10`, dependencies list with pinned minimums
  - [ ] `[tool.pytest.ini_options]`: set `testpaths = ["tests"]`, `asyncio_mode = "auto"` (required for async fixtures/tests)
  - [ ] Do NOT add `evals/` or any Python path to any pnpm config

- [ ] Task 2: Create `evals/.python-version` (AC: 1)
  - [ ] Content: `3.11` (3.11 is the recommended stable version; 3.10+ required per tech spec)

- [ ] Task 3: Create `evals/server.py` (AC: 3, 4, 5, 6)
  - [ ] `start_mcp_server(port: int = 3001) -> subprocess.Popen` — checks for Node.js, sets env vars from `os.environ`, spawns `node dist/index.js` from `apps/mcp-server/` directory, polls `GET /health`, returns the `Popen` handle
  - [ ] `stop_mcp_server(proc: subprocess.Popen) -> None` — sends `SIGTERM`, waits up to 5 seconds, then `SIGKILL` if still alive
  - [ ] Node.js check: `shutil.which("node")` — raises `RuntimeError("Node.js not found on PATH — ensure Node.js 20+ is installed")` if `None`
  - [ ] Health poll: `httpx.get(f"http://localhost:{port}/health", timeout=2.0)` in a retry loop (1-second sleep between retries)
  - [ ] On health check timeout: raise `RuntimeError(f"MCP server did not become healthy on port {port} after {retries} retries")`
  - [ ] Start command must be `node dist/index.js` (production build) — see Dev Notes for the `cwd` path

- [ ] Task 4: Create `evals/conftest.py` (AC: 3, 4)
  - [ ] Session-scoped fixture `mcp_server` that validates env vars, calls `start_mcp_server()`, yields, calls `stop_mcp_server()` in teardown
  - [ ] Env var validation: check `UTAH_LEGISLATURE_API_KEY` and `UGRC_API_KEY` present and non-empty; call `pytest.fail("Missing required env vars: ...")` if not
  - [ ] Use `atexit.register(stop_mcp_server, proc)` as a belt-and-suspenders teardown guard in addition to the fixture yield

- [ ] Task 5: Create `evals/tests/__init__.py` and `evals/tests/test_server_lifecycle.py` (AC: 2, 3, 5, 6)
  - [ ] `test_server_lifecycle.py` must contain at minimum:
    - A test that uses the `mcp_server` fixture and verifies `GET /health` returns `{ "status": "ok", "service": "on-record-mcp-server" }` (validates fixture wires up correctly)
    - A test that verifies `start_mcp_server()` raises `RuntimeError` containing `"Node.js not found"` when `shutil.which` is patched to return `None`
    - A test that verifies `start_mcp_server()` raises `RuntimeError` containing `"MCP server did not become healthy"` when health check always returns non-200 (mock `httpx.get`)
  - [ ] All tests in this file are unit/integration — mock subprocess and httpx for the error-path tests; use real server only for the fixture test

- [ ] Task 6: Create `evals/.gitignore` (AC: 8)
  - [ ] Contents: `.venv/`, `__pycache__/`, `.deepeval/`, `*.pyc`, `.pytest_cache/`, `htmlcov/`, `.coverage`

- [ ] Task 7: Update root `.gitignore` (AC: 8)
  - [ ] Add line `evals/.venv/` to the root `.gitignore` (after the `# pnpm` block)

- [ ] Task 8: Create `evals/` directory stub files
  - [ ] `evals/__init__.py` — empty, marks `evals/` as a package root (needed for relative imports in later stories)
  - [ ] Verify no `package.json` or pnpm references are introduced

## Dev Notes

### Architecture Context

This story creates the `evals/` directory — a fully isolated Python project within the monorepo. It is explicitly NOT a pnpm workspace package. The Python virtual environment (`.venv/`) lives inside `evals/` and is gitignored.

The `evals/` project will ultimately contain:
- `server.py` (this story) — MCP server lifecycle
- `conftest.py` (this story) — session-scoped pytest fixtures
- `mcp_client.py` (E5-2) — MCP HTTP client
- `chatbot.py` (E5-2) — model_callback for DeepEval
- `metrics.py` (E5-3/E5-5) — metric definitions
- `goldens.py` (E5-4) — ConversationalGolden scenarios
- `tests/` (E5-3, E5-6) — pytest test files

### MCP Server Start Command and CWD

The MCP server is started with `node dist/index.js`. The `cwd` for `subprocess.Popen` must be the `apps/mcp-server/` directory, **not** the monorepo root.

To get the correct absolute path from `evals/server.py`, use:
```python
import pathlib
REPO_ROOT = pathlib.Path(__file__).parent.parent  # evals/ → repo root
MCP_SERVER_DIR = REPO_ROOT / "apps" / "mcp-server"
```

The `dist/` directory is created by `pnpm build` (runs `tsc`). The dev agent must verify `apps/mcp-server/dist/index.js` exists before running. If it doesn't exist, the `Popen` spawn will fail with a Node.js "module not found" error that is confusing. Add a pre-check:
```python
dist_entry = MCP_SERVER_DIR / "dist" / "index.js"
if not dist_entry.exists():
    raise RuntimeError(f"MCP server not built — run 'pnpm build' from {MCP_SERVER_DIR}")
```

### Environment Variables for MCP Server

The MCP server requires these env vars (`apps/mcp-server/src/env.ts`):
- `UTAH_LEGISLATURE_API_KEY` — required, no default
- `UGRC_API_KEY` — required, no default
- `PORT` — optional, defaults to `3001`
- `NODE_ENV` — optional, defaults to `"development"`

Pass them via the `env` parameter of `subprocess.Popen`. Use `{**os.environ, "PORT": str(port)}` to inherit the parent env and override PORT. The health check fixture determines the port from `int(os.environ.get("PORT", "3001"))`.

### Health Check Response

`GET /health` returns:
```json
{ "status": "ok", "service": "on-record-mcp-server" }
```
This is defined in `apps/mcp-server/src/index.ts` line 171. The fixture must verify both fields to ensure it's not accidentally hitting a different server on the same port.

### Server Startup Time

The MCP server performs a **blocking warm-up** of the legislators cache from the Utah Legislature API before it starts accepting requests (`warmUpLegislatorsCache` in `startServer()`). This can take 10–20+ seconds on a cold start. The 30-retry / 1-second-interval design (30 seconds total) is intentional and required. **Do not reduce the retry count below 30.**

### Subprocess and Signal Handling

`stop_mcp_server` must handle the case where the process has already exited:
```python
def stop_mcp_server(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return  # already exited
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
```

`atexit.register` in `conftest.py` ensures cleanup happens even if pytest exits abnormally (e.g., `pytest.exit()` or KeyboardInterrupt).

### httpx Usage

Use synchronous `httpx.get()` in the health poll loop — the server lifecycle management code does not need to be async. DeepEval's `async_mode` for ConversationSimulator (added in E5-2) runs in an asyncio event loop, but the server fixture runs outside of it.

Install: `httpx>=0.28.0` (already in pyproject.toml dependencies for this story; also used by `mcp_client.py` in E5-2 for async HTTP).

### Test Isolation for Error-Path Tests

The error-path tests in `test_server_lifecycle.py` must NOT require the real MCP server to be running. Use `unittest.mock.patch`:

```python
from unittest.mock import patch, MagicMock

def test_node_not_found():
    with patch("shutil.which", return_value=None):
        with pytest.raises(RuntimeError, match="Node.js not found"):
            start_mcp_server()

def test_health_check_timeout():
    mock_response = MagicMock()
    mock_response.status_code = 503
    with patch("httpx.get", return_value=mock_response):
        with patch("shutil.which", return_value="/usr/local/bin/node"):
            with patch("subprocess.Popen") as mock_popen:
                mock_popen.return_value.poll.return_value = None
                with pytest.raises(RuntimeError, match="MCP server did not become healthy"):
                    start_mcp_server(port=3001)
```

### No pnpm Workspace Changes

The `evals/` directory must not appear in `pnpm-workspace.yaml`. Check:
```yaml
# pnpm-workspace.yaml (root) — do NOT modify
packages:
  - 'apps/*'
  - 'packages/*'
```
The `evals/` entry must never be added here.

### pyproject.toml Dependency Versions

```toml
[project]
name = "on-record-evals"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "deepeval>=3.7.0",
    "anthropic>=0.29.0",
    "httpx>=0.28.0",
    "openai",
    "pydantic>=2.11.7",
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

`deepeval>=3.7.0` is the minimum version that ships `ConversationSimulator` with `MCPToolCall` tracking, `MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `AnthropicModel` judge, and all built-in MCP metrics.

`pytest-asyncio>=0.23.0` is required for `asyncio_mode = "auto"` which is needed in E5-2+ for async `model_callback` and async test functions.

### Project Structure Notes

New files created by this story (all paths relative to monorepo root):
```
evals/
├── __init__.py              (new — empty package marker)
├── .gitignore               (new)
├── .python-version          (new — "3.11")
├── pyproject.toml           (new)
├── server.py                (new — MCP server lifecycle)
├── conftest.py              (new — pytest session-scoped fixture)
└── tests/
    ├── __init__.py          (new — empty)
    └── test_server_lifecycle.py  (new — lifecycle unit + integration tests)
```

Modified files:
```
.gitignore                   (modified — add "evals/.venv/")
```

Not modified:
- `pnpm-workspace.yaml` — do not touch
- `package.json` (root) — do not touch
- Any file in `apps/` or `packages/` — do not touch

### References

- Tech spec (authoritative): [`_bmad-output/implementation-artifacts/tech-spec-eval-harness.md`] — Phase 1, Story E5-1
- MCP server entry point: [`apps/mcp-server/src/index.ts`] — startup sequence, `/health` endpoint (line 171)
- MCP server env schema: [`apps/mcp-server/src/env.ts`] — `PORT`, `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`
- DeepEval deepdive research: [`_bmad-output/planning-artifacts/research/technical-deepeval-conversationsimulator-research-2026-03-21.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `evals/__init__.py` (new)
- `evals/.gitignore` (new)
- `evals/.python-version` (new)
- `evals/pyproject.toml` (new)
- `evals/server.py` (new)
- `evals/conftest.py` (new)
- `evals/tests/__init__.py` (new)
- `evals/tests/test_server_lifecycle.py` (new)
- `.gitignore` (modified)
