// apps/mcp-server/src/app.ts
// Shared Hono app: middleware + MCP route handlers using Web Standard APIs.
// Compatible with both Cloudflare Workers (via worker.ts) and Node.js (via index.ts).
//
// Tool registration is intentionally NOT imported here to keep this module free of
// better-sqlite3 / __dirname dependencies (which cannot run in the Workers runtime).
// Callers inject tool registration via setupMcpServer() before serving requests.
// In the Workers path (worker.ts) for Story 9.1, no tools are registered until
// Story 9.2 migrates the cache layer to D1.
import { Hono } from 'hono'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import { loggingMiddleware } from './middleware/logging.js'
import { corsMiddleware } from './middleware/cors.js'
import { rateLimitMiddleware } from './middleware/rate-limit.js'
import { logger } from './lib/logger.js'

// Tool registration callback — set by the caller (index.ts / worker.ts) before serving.
// Receives a freshly created McpServer and should register all desired tools on it.
// Workers path: left undefined until Story 9.2 wires in D1 cache functions.
let _registerTools: ((server: McpServer) => void) | undefined

/** Call once at startup to wire up MCP tool registrations into new sessions. */
export function setupMcpServer(registerTools: (server: McpServer) => void): void {
  _registerTools = registerTools
}

// ── Session store ──────────────────────────────────────────────────────────
// Stores active MCP transport sessions keyed by Mcp-Session-Id header.
// WebStandardStreamableHTTPServerTransport is stateful per session.
// In Cloudflare Workers, isolates may be reused between requests — the Map
// persists within an isolate's lifetime, enabling MCP session affinity.
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>()

// ── Hono app setup ─────────────────────────────────────────────────────────
const app = new Hono()

// Middleware order is critical:
// 1. Logging first — captures all requests including those rejected by rate-limiter
// 2. CORS — must run before rate-limiter (preflight OPTIONS should not consume rate-limit quota)
// 3. Rate-limiter — rejects excess requests after CORS preflight passes
app.use('*', loggingMiddleware)
app.use('*', corsMiddleware)
app.use('/mcp', rateLimitMiddleware)

// ── MCP route handlers ─────────────────────────────────────────────────────
// All handlers use the fetch-compatible WebStandard transport (Request → Response).
// No IncomingMessage/ServerResponse here — compatible with Workers and Node.js.
app.post('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')

  let transport: WebStandardStreamableHTTPServerTransport

  if (sessionId && transports.has(sessionId)) {
    // Existing session — reuse transport
    transport = transports.get(sessionId)!
  } else {
    // New session — create transport and connect a fresh McpServer instance
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, transport)
        logger.info({ source: 'app', sessionId: newSessionId }, 'MCP session initialized')
      },
    })

    transport.onclose = () => {
      const sid = transport.sessionId
      if (sid) {
        transports.delete(sid)
        logger.info({ source: 'app', sessionId: sid }, 'MCP session closed')
      }
    }

    const server = new McpServer({
      name: 'on-record',
      version: '1.0.0',
    })

    if (_registerTools) _registerTools(server)

    await server.connect(transport)
  }

  return transport.handleRequest(c.req.raw)
})

app.get('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')
  const transport = sessionId ? transports.get(sessionId) : undefined

  if (!transport) {
    return c.json({ error: 'No active MCP session. POST /mcp first to initialize.' }, 404)
  }

  return transport.handleRequest(c.req.raw)
})

app.delete('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')
  const transport = sessionId ? transports.get(sessionId) : undefined

  if (!transport) {
    return c.json({ error: 'No active MCP session to close.' }, 404)
  }

  return transport.handleRequest(c.req.raw)
})

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', service: 'on-record-mcp-server' }))

export { app }
