// apps/mcp-server/src/index.ts
// Node.js bootstrap: env validation, cache init, cache warm-up, cron scheduling, serve().
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
import { seedSessions } from './cache/sessions.js'
initializeSchema(db)
logger.info({ source: 'cache' }, 'SQLite schema initialized')
seedSessions(db)
logger.info({ source: 'cache' }, 'Sessions seeded')

// STEP 2.6: Legislators cache warm-up (Story 2.3)
// Imported here — warm-up awaited inside startServer() below before serve() is called.
import { UtahLegislatureProvider } from './providers/utah-legislature.js'
import { warmUpLegislatorsCache, scheduleLegislatorsRefresh, warmUpBillsCache, scheduleBillsRefresh } from './cache/refresh.js'

// STEP 3: Shared Hono app (Story 9.1)
// All middleware + MCP route handlers live in app.ts.
import { app, setupMcpServer } from './app.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'

// Wire up tool registrations for the Node.js path.
// Workers path (worker.ts) intentionally omits this until Story 9.2 migrates the cache layer to D1.
setupMcpServer((server) => {
  registerLookupLegislatorTool(server)
  registerResolveAddressTool(server)
  registerSearchBillsTool(server)
})

// STEP 4: Node.js-specific serve() adapter
import { serve } from '@hono/node-server'
import type { ServerResponse } from 'node:http'

// ── Response drain helper ───────────────────────────────────────────────────
// Retained for Node.js compatibility (cleanup deferred to post-9.5 decommission).
// Not called by the current MCP route handlers — app.ts uses the fetch-compatible
// WebStandard transport which returns a Response directly without Node.js streams.
function drainResponse(res: ServerResponse): Promise<void> {
  if (res.writableEnded) return Promise.resolve()
  return new Promise<void>((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
  })
}

// Suppress unused variable warning — drainResponse is intentionally retained for
// future Node.js path needs and post-decommission cleanup.
void drainResponse

// ── Global error handlers ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ source: 'app', reason }, 'Unhandled promise rejection — exiting')
  process.exit(1)
})

// ── Start server ───────────────────────────────────────────────────────────
// startServer is async to support await on warm-up before accepting connections.
// CommonJS modules do not support top-level await — wrap in an async IIFE.
async function startServer(): Promise<void> {
  // STEP 2.6: Legislators cache warm-up (Story 2.3)
  // Instantiate provider and complete warm-up BEFORE serve() starts.
  const provider = new UtahLegislatureProvider()
  await warmUpLegislatorsCache(db, provider)
  logger.info({ source: 'cache', districtCount: 104 }, 'Legislators cache warm-up complete')

  // STEP 2.8: Bills cache warm-up (Story 3.2)
  // NFR17: bills warm-up failure must NOT prevent the server from starting — stale data
  // (empty cache) is acceptable during an upstream outage. Errors are logged so the
  // operator can investigate without impacting availability.
  try {
    const sessions = await warmUpBillsCache(db, provider)
    logger.info({ source: 'cache', sessions }, 'Bills cache warm-up complete')
  } catch (err: unknown) {
    logger.error({ source: 'legislature-api', err }, 'Bills cache warm-up failed — serving stale data')
  }

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info({ source: 'app', port: info.port }, 'On Record MCP server started')
      scheduleLegislatorsRefresh(db, provider)
      scheduleBillsRefresh(db, provider)
    }
  )
}

startServer().catch((err: unknown) => {
  logger.error({ source: 'app', err }, 'Failed to start server')
  process.exit(1)
})
