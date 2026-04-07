// apps/mcp-server/src/lib/logger.ts
import pino from 'pino'

// Singleton pino logger — import this everywhere in mcp-server, never construct a new logger.
// All log calls MUST include a `source` field identifying the subsystem:
//   logger.info({ source: 'cache' }, 'Bills cached')
//   logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed')
//
// pino-pretty is NOT used: it requires Node.js stream.Transform which is unavailable in
// the Cloudflare Workers runtime. Use `wrangler tail` or the Cloudflare observability
// dashboard to view logs in production; `wrangler dev` surfaces them in the terminal.

let _logger: pino.Logger | undefined

export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = pino({ level: 'info' })
  }
  return _logger
}

// `logger` is a lazy-init proxy so that this module can be statically imported before
// the Workers handler runs (ESM hoists all imports before top-level code executes).
export const logger: pino.Logger = new Proxy({} as pino.Logger, {
  get(_target: pino.Logger, prop: string | symbol): unknown {
    return (getLogger() as unknown as Record<string | symbol, unknown>)[prop]
  },
  set(_target: pino.Logger, prop: string | symbol, value: unknown): boolean {
    ;(getLogger() as unknown as Record<string | symbol, unknown>)[prop] = value
    return true
  },
})
