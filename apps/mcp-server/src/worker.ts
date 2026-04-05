// apps/mcp-server/src/worker.ts
// Cloudflare Workers entrypoint.
import { app, setupMcpServer } from './app.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'
import { initWorkerEnv } from './env.js'
import { warmUpLegislatorsCache, warmUpBillsCache } from './cache/refresh.js'
import { UtahLegislatureProvider } from './providers/utah-legislature.js'
import { logger } from './lib/logger.js'

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    initWorkerEnv(env)

    // Validate required Workers bindings before routing.
    if (!env.DB) {
      return Response.json(
        {
          source: 'worker',
          nature: 'D1 binding missing',
          action: 'Check wrangler.toml [[d1_databases]] binding and Cloudflare D1 configuration',
        },
        { status: 500 },
      )
    }

    // Wire D1 binding into tool registrations (idempotent — overwrites on each request,
    // but env.DB is consistent within an isolate and tool closures capture the binding).
    setupMcpServer(env.DB, (server) => {
      registerLookupLegislatorTool(server, env.DB)
      registerResolveAddressTool(server)
      registerSearchBillsTool(server, env.DB)
    })

    return app.fetch(request, env, ctx)
  },
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
    initWorkerEnv(env)
    const provider = new UtahLegislatureProvider()
    ctx.waitUntil(
      (async () => {
        if (event.cron === '0 6 * * *') {
          await warmUpLegislatorsCache(env.DB, provider)
          logger.info({ source: 'cache' }, 'Legislators cache refreshed via cron trigger')
        }
        const sessions = await warmUpBillsCache(env.DB, provider)
        logger.info({ source: 'cache', sessions }, 'Bills cache refreshed via cron trigger')
      })().catch((err: unknown) => {
        logger.error({ source: 'cache', err }, 'Scheduled cache refresh failed')
      })
    )
  },
}
