// apps/mcp-server/src/lib/logger.ts
import pino from 'pino'

// Singleton pino logger — import this everywhere in mcp-server, never construct a new logger.
// All log calls MUST include a `source` field identifying the subsystem:
//   logger.info({ source: 'cache' }, 'Bills cached')
//   logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed')
//
// CF Workers observability captures console.* only — process.stdout.write() is silently
// dropped. We bypass pino's sonic-boom transport (which buffers async and loses tail writes
// when the Workers execution context terminates) by calling console.* directly.
// The no-console ESLint rule guards the MCP JSON-RPC stdio stream, which does not apply
// in a CF Worker (MCP transport is HTTP/WebSocket).

function cfWrite(levelNum: number, obj: Record<string, unknown>, msg: string): void {
  const serialized = JSON.stringify({ level: levelNum, time: Date.now(), ...obj, msg })
  if (levelNum >= 50) {
    console.error(serialized)
  } else if (levelNum >= 40) {
    console.warn(serialized) // eslint-disable-line no-console
  } else {
    console.log(serialized) // eslint-disable-line no-console
  }
}

// Synchronous console-backed logger with the same call signature as pino.
// Cast to pino.Logger so all existing imports, call sites, and vi.mock() shapes are unchanged.
const cfLogger = {
  trace: () => {},
  debug: (obj: Record<string, unknown>, msg: string) => cfWrite(20, obj, msg),
  info:  (obj: Record<string, unknown>, msg: string) => cfWrite(30, obj, msg),
  warn:  (obj: Record<string, unknown>, msg: string) => cfWrite(40, obj, msg),
  error: (obj: Record<string, unknown>, msg: string) => cfWrite(50, obj, msg),
  fatal: (obj: Record<string, unknown>, msg: string) => cfWrite(60, obj, msg),
} as unknown as pino.Logger

export function getLogger(): pino.Logger {
  return cfLogger
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
