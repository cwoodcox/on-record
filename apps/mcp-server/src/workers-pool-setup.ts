// apps/mcp-server/src/workers-pool-setup.ts
// Global setup for the @cloudflare/vitest-pool-workers test environment.
//
// node-cron uses setTimeout-based scheduling that is not compatible with the
// Cloudflare Workers runtime (miniflare). When worker.ts is loaded as the
// workers entry point, it imports cache/refresh.ts which imports node-cron.
// This mock prevents node-cron from crashing the miniflare process during
// test worker initialization, without needing to mock it in every test file.
import { vi } from 'vitest'

vi.mock('node-cron', () => ({
  schedule: vi.fn(),
}))
