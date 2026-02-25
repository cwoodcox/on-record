// apps/mcp-server/src/lib/logger.ts
import pino from 'pino'
import { getEnv } from '../env.js'

// Singleton pino logger — import this everywhere in mcp-server, never construct a new logger.
// All log calls MUST include a `source` field identifying the subsystem:
//   logger.info({ source: 'cache' }, 'Bills cached')
//   logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed')

let _logger: pino.Logger | undefined

export function getLogger(): pino.Logger {
  if (!_logger) {
    const env = getEnv()
    _logger = pino({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
    })
  }
  return _logger
}

// `logger` is a lazy-init proxy so that this module can be statically imported before
// validateEnv() is called (ESM hoists all imports before top-level code runs).
// The first actual log call — which only occurs after the Hono app initializes and
// validateEnv() has already been called in index.ts — will trigger getLogger() safely.
export const logger: pino.Logger = new Proxy({} as pino.Logger, {
  get(_target: pino.Logger, prop: string | symbol): unknown {
    return (getLogger() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
