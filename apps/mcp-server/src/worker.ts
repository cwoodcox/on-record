// apps/mcp-server/src/worker.ts
// Cloudflare Workers entrypoint.
// No mutable module-level state — only imports and the default export.
import { app } from './app.js'

export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): void {
    // Stub — implemented in Story 9.3 with Cron Trigger handlers.
    // env.DB (D1 binding) and env API keys are available from _env in 9.3.
  },
}
