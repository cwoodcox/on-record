// apps/mcp-server/src/worker.ts
// Cloudflare Workers entrypoint.
import { OnRecordMCP } from './mcp-agent.js'
import { initWorkerEnv } from './env.js'
import { warmUpLegislatorsCache, warmUpBillsCache } from './cache/refresh.js'
import { UtahLegislatureProvider } from './providers/utah-legislature.js'
import { logger } from './lib/logger.js'
import { applyCfRateLimit } from './middleware/cf-rate-limit.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id',
} as const

function addCorsHeaders(response: Response): Response {
  const r = new Response(response.body, response)
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    r.headers.set(k, v)
  }
  return r
}

// McpAgent.serve() handler — instantiated once at module scope (safe per Cloudflare docs).
const mcpHandler = OnRecordMCP.serve('/mcp', { binding: 'MCP_OBJECT' })

export { OnRecordMCP }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    const url = new URL(request.url)

    // Health check route.
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'on-record-mcp-server' })
    }

    // MCP routes — rate limit then delegate to McpAgent (Durable Objects transport).
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      // OPTIONS preflight — return 204 before consuming rate-limit quota.
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS })
      }

      if (!env.RATE_LIMITER) {
        logger.warn({ source: 'rate-limiter' }, 'RATE_LIMITER binding not configured — skipping rate limiting')
      } else {
        const blocked = await applyCfRateLimit(env.RATE_LIMITER, request)
        if (blocked) return blocked
      }

      const response = await mcpHandler.fetch(request, env, ctx)
      return addCorsHeaders(response)
    }

    return new Response('Not found', { status: 404 })
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
