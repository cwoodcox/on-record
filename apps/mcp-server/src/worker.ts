// apps/mcp-server/src/worker.ts
// Cloudflare Workers entrypoint.
import { app, setupMcpServer } from './app.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
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
  scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): void {
    // Stub — implemented in Story 9.3 with Cron Trigger handlers.
    // env.DB (D1 binding) and env API keys are available from _env in 9.3.
  },
}
