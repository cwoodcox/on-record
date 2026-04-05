// apps/mcp-server/src/index.ts
// Node.js bootstrap: env validation, cache init, cache warm-up, cron scheduling, serve().
// TODO: Node.js path — earmarked for decommission after Story 9.5 (Workers path is authoritative).
// STEP 1: Validate env FIRST — before any other imports that might call getEnv()
import { validateEnv } from './env.js'
const env = validateEnv()

// STEP 2: Initialize logger (now safe — env is validated)
import { logger } from './lib/logger.js'

// STEP 2.5: Open SQLite database for Node.js path (Story 1.3).
// cache/db.ts exports createNodeDb() — confined to src/cache/ (Boundary 4).
// Cast as D1Database since all cache functions now require that type.
// Runtime correctness on this cast is limited: better-sqlite3 is API-compatible
// for exec() and select queries, but batch() is not supported — warm-up will fail
// gracefully. The Node.js path is earmarked for decommission after Story 9.5.
import { createNodeDb } from './cache/db.js'
import { applySchema } from './cache/schema.js'
import { seedSessions } from './cache/sessions.js'
const _betterSqliteDb = createNodeDb()
const db = _betterSqliteDb as unknown as D1Database

// STEP 2.6: Cache warm-up imports (Story 2.3, 3.2)
import { UtahLegislatureProvider } from './providers/utah-legislature.js'
import { warmUpLegislatorsCache, scheduleLegislatorsRefresh, warmUpBillsCache, scheduleBillsRefresh } from './cache/refresh.js'

// STEP 3: Shared Hono app (Story 9.1)
import { app, setupMcpServer } from './app.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'

// Wire up tool registrations for the Node.js path.
setupMcpServer(db, (server) => {
  registerLookupLegislatorTool(server, db)
  registerResolveAddressTool(server)
  registerSearchBillsTool(server, db)
})

// STEP 4: Node.js-specific serve() adapter
import { serve } from '@hono/node-server'
import type { ServerResponse } from 'node:http'

// ── Response drain helper ───────────────────────────────────────────────────
// Retained for Node.js compatibility (cleanup deferred to post-9.5 decommission).
function drainResponse(res: ServerResponse): Promise<void> {
  if (res.writableEnded) return Promise.resolve()
  return new Promise<void>((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
  })
}

// Suppress unused variable warning — drainResponse is retained for future cleanup.
void drainResponse

// ── Global error handlers ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ source: 'app', reason }, 'Unhandled promise rejection — exiting')
  process.exit(1)
})

// ── Start server ───────────────────────────────────────────────────────────
async function startServer(): Promise<void> {
  // Apply schema and seed sessions (async D1 API; better-sqlite3 exec() is compatible)
  await applySchema(db)
  logger.info({ source: 'cache' }, 'SQLite schema initialized')

  // seedSessions uses db.batch() which is not available on better-sqlite3.
  // Wrap in try/catch: sessions table empty → calendar fallback used for session selection.
  try {
    await seedSessions(db)
    logger.info({ source: 'cache' }, 'Sessions seeded')
  } catch (err: unknown) {
    logger.error({ source: 'cache', err }, 'Session seeding failed on Node.js path — calendar fallback active')
  }

  const provider = new UtahLegislatureProvider()

  // Legislators cache warm-up — wrapped in try/catch for Node.js path compatibility
  // (writeLegislators uses db.batch() which is not available on better-sqlite3 cast)
  try {
    await warmUpLegislatorsCache(db, provider)
    logger.info({ source: 'cache', districtCount: 104 }, 'Legislators cache warm-up complete')
  } catch (err: unknown) {
    logger.error({ source: 'legislature-api', err }, 'Legislators cache warm-up failed — serving stale data')
  }

  // Bills cache warm-up — stale data acceptable during upstream outage (NFR17)
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
