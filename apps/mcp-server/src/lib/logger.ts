// apps/mcp-server/src/lib/logger.ts
import pino from 'pino'

// Singleton pino logger — import this everywhere in mcp-server, never construct a new logger.
// All log calls MUST include a `source` field identifying the subsystem:
//   logger.info({ source: 'cache' }, 'Bills cached')
//   logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed')
//
// CF Workers observability only captures console.* — process.stdout.write() is not
// monitored. The custom destination below is the single approved site for console.log
// in this codebase; the no-console ESLint rule exists to guard the MCP JSON-RPC stdio
// stream, which does not apply in a CF Worker (MCP transport is HTTP/WebSocket).

let _logger: pino.Logger | undefined

export function getLogger(): pino.Logger {
  if (!_logger) {
    // eslint-disable-next-line no-console
    _logger = pino({ level: 'info' }, { write: (msg) => console.log(msg) })
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
