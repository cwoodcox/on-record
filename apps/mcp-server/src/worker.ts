// apps/mcp-server/src/worker.ts
// Cloudflare Workers entrypoint.
// No mutable module-level state — only imports and the default export.
import { app } from './app.js'

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    // Validate required Workers bindings before routing.
    // Reads from the Workers env binding object — not process.env (AC 6).
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
    return app.fetch(request, env, ctx)
  },
  scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): void {
    // Stub — implemented in Story 9.3 with Cron Trigger handlers.
    // env.DB (D1 binding) and env API keys are available from _env in 9.3.
  },
}
