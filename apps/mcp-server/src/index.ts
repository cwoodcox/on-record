// apps/mcp-server/src/index.ts
// STEP 1: Validate env FIRST — before any other imports that might call getEnv()
import { validateEnv } from './env.js'
const env = validateEnv()

// STEP 2: Initialize logger (now safe — env is validated)
import { logger } from './lib/logger.js'

// STEP 2.5: Initialize SQLite schema (Story 1.3)
// DB connection singleton opens the database and enables WAL mode.
// initializeSchema is idempotent — safe on every restart.
import { db } from './cache/db.js'
import { initializeSchema } from './cache/schema.js'
initializeSchema(db)
logger.info({ source: 'cache' }, 'SQLite schema initialized')

// STEP 3: Framework imports
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

// STEP 4: Middleware imports
import { loggingMiddleware } from './middleware/logging.js'
import { corsMiddleware } from './middleware/cors.js'
import { rateLimitMiddleware } from './middleware/rate-limit.js'

// ── Session store ──────────────────────────────────────────────────────────
// Stores active MCP transport sessions keyed by Mcp-Session-Id header.
// StreamableHTTPServerTransport is stateful per session.
const transports = new Map<string, StreamableHTTPServerTransport>()

// ── Response drain helper ───────────────────────────────────────────────────
// @hono/node-server checks `outgoing.writableEnded` before writing the Hono
// Response to the socket. StreamableHTTPServerTransport.handleRequest() calls
// writeHead() to start the response (and keeps the socket open for SSE) but
// does not call end() until the client disconnects. Returning from the Hono
// handler before the socket is finished causes ERR_HTTP_HEADERS_SENT because
// @hono/node-server tries to writeHead() a second time.
// Fix: await the 'finish' or 'close' event so writableEnded is true before
// Hono's response pipeline runs. For SSE connections this correctly holds the
// handler coroutine open for the lifetime of the stream.
function drainResponse(res: ServerResponse): Promise<void> {
  if (res.writableEnded) return Promise.resolve()
  return new Promise<void>((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
  })
}

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
app.post('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')

  let transport: StreamableHTTPServerTransport

  if (sessionId && transports.has(sessionId)) {
    // Existing session — reuse transport
    transport = transports.get(sessionId)!
  } else {
    // New session — create transport and connect a fresh McpServer instance
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
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

    // Tools are registered in Stories 2.4 (lookup_legislator) and 3.5 (search_bills).
    // This empty McpServer still accepts connections and responds to MCP initialize.

    // @ts-expect-error -- StreamableHTTPServerTransport.onclose is typed as `(() => void) | undefined`
    // which conflicts with McpServer.connect's Transport interface under exactOptionalPropertyTypes; SDK issue
    await server.connect(transport)
  }

  // @hono/node-server exposes the raw Node.js req/res via c.env
  // The transport.handleRequest needs Node.js IncomingMessage and ServerResponse
  const nodeEnv = c.env as { incoming: IncomingMessage; outgoing: ServerResponse }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  await transport.handleRequest(nodeEnv.incoming, nodeEnv.outgoing, body)
  await drainResponse(nodeEnv.outgoing)
  return new Response(null, { status: 200 })
})

app.get('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')
  const transport = sessionId ? transports.get(sessionId) : undefined

  if (!transport) {
    return c.json({ error: 'No active MCP session. POST /mcp first to initialize.' }, 404)
  }

  const nodeEnv = c.env as { incoming: IncomingMessage; outgoing: ServerResponse }
  await transport.handleRequest(nodeEnv.incoming, nodeEnv.outgoing)
  await drainResponse(nodeEnv.outgoing)
  return new Response(null, { status: 200 })
})

app.delete('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')
  const transport = sessionId ? transports.get(sessionId) : undefined

  if (!transport) {
    return c.json({ error: 'No active MCP session to close.' }, 404)
  }

  const nodeEnv = c.env as { incoming: IncomingMessage; outgoing: ServerResponse }
  await transport.handleRequest(nodeEnv.incoming, nodeEnv.outgoing)
  await drainResponse(nodeEnv.outgoing)
  return new Response(null, { status: 200 })
})

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', service: 'on-record-mcp-server' }))

// ── Start server ───────────────────────────────────────────────────────────
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info({ source: 'app', port: info.port }, 'On Record MCP server started')
  }
)
