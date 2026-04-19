// apps/mcp-server/src/lib/logger.ts
// Thin, synchronous console delegates — no pino, no buffering, no Proxy.
// Each call maps directly to a console method so CF Workers captures it.
// Import this module everywhere; mock it in tests via vi.mock('../lib/logger.js').
export const logger = {
  trace: (_obj: Record<string, unknown>, _msg: string): void => {},
  debug: (obj: Record<string, unknown>, msg: string): void => {
    console.log({ time: Date.now(), ...obj, msg })
  },
  info: (obj: Record<string, unknown>, msg: string): void => {
    console.log({ time: Date.now(), ...obj, msg })
  },
  warn: (obj: Record<string, unknown>, msg: string): void => {
    console.warn({ time: Date.now(), ...obj, msg })
  },
  error: (obj: Record<string, unknown>, msg: string): void => {
    console.error({ time: Date.now(), ...obj, msg })
  },
  fatal: (obj: Record<string, unknown>, msg: string): void => {
    console.error({ time: Date.now(), ...obj, msg })
  },
}
