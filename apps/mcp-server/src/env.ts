// apps/mcp-server/src/env.ts
import { z } from 'zod'

const envSchema = z.object({
  PORT: z
    .string()
    .default('3001')
    .transform(Number)
    .refine((n) => n > 0 && n < 65536, { message: 'PORT must be a valid port number (1–65535)' }),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Utah Legislature API key — required for Stories 2.x and 3.x
  // Validated now so the server fails fast rather than crashing mid-request
  UTAH_LEGISLATURE_API_KEY: z
    .string()
    .min(1, { message: 'UTAH_LEGISLATURE_API_KEY is required' }),
  // UGRC GIS API key — required for Story 2.1
  UGRC_API_KEY: z
    .string()
    .min(1, { message: 'UGRC_API_KEY is required' }),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    // console.error is allowed (not console.log); pino not yet initialized at this point
    console.error('[on-record] Environment validation failed:')
    console.error(result.error.format())
    process.exit(1)
  }
  _env = result.data
  return _env
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error('getEnv() called before validateEnv() — call validateEnv() in src/index.ts first')
  }
  return _env
}

