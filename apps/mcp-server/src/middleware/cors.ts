// apps/mcp-server/src/middleware/cors.ts
import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'

// CORS origins for MCP browser-based invocation from supported chatbot platforms.
//
// IMPORTANT — These origins will be verified and updated during MCP connectivity testing
// (Story 2.4 / end-to-end verification with Claude.ai and ChatGPT).
// Architecture note: "CORS origin list: exact Claude.ai and ChatGPT MCP endpoint origins
// to be populated in middleware/cors.ts during MCP connectivity testing."
//
// Current known origins (update during Story 2.4 testing):
const ALLOWED_ORIGINS = [
  'https://claude.ai',
  'https://chatgpt.com',
  'https://chat.openai.com',  // legacy ChatGPT origin
  // Add additional verified origins during Story 2.4 MCP connectivity testing
] as const

export const corsMiddleware: MiddlewareHandler = cors({
  origin: (origin) => {
    // Allow requests with no origin (e.g., direct curl, server-to-server)
    if (!origin) return undefined
    return ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number])
      ? origin
      : undefined
  },
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Mcp-Session-Id', 'Last-Event-Id', 'Authorization'],
  exposeHeaders: ['Mcp-Session-Id', 'Last-Event-Id'],
  maxAge: 86400,
})
