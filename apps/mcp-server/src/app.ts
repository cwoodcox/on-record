// apps/mcp-server/src/app.ts
// Shared Hono app: middleware + health check.
// Used by index.ts (Node.js path) for local development.
// The Workers path (worker.ts) routes /mcp directly to OnRecordMCP (McpAgent)
// and handles /health inline — it no longer uses this module.
import { Hono } from 'hono'

import { loggingMiddleware } from './middleware/logging.js'
import { corsMiddleware } from './middleware/cors.js'
import { rateLimitMiddleware } from './middleware/rate-limit.js'

// ── Hono app setup ─────────────────────────────────────────────────────────
const app = new Hono()

// Middleware order is critical:
// 1. Logging first — captures all requests including those rejected by rate-limiter
// 2. CORS — must run before rate-limiter (preflight OPTIONS should not consume rate-limit quota)
// 3. Rate-limiter — rejects excess requests after CORS preflight passes
app.use('*', loggingMiddleware)
app.use('*', corsMiddleware)
app.use('/mcp', rateLimitMiddleware)

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', service: 'on-record-mcp-server' }))

export { app }
