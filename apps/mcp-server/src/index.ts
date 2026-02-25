// apps/mcp-server/src/index.ts
// STEP 1: Validate env FIRST — before any other imports that might call getEnv()
import { validateEnv } from './env.js'
const env = validateEnv()

// STEP 2: Initialize logger (now safe — env is validated)
import { logger } from './lib/logger.js'

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
  const body = await c.req.json().catch(() => undefined)

  await transport.handleRequest(nodeEnv.incoming, nodeEnv.outgoing, body)

  // handleRequest writes directly to the ServerResponse — we return an empty Hono response
  // to satisfy the framework's response contract; the actual response is already sent.
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
