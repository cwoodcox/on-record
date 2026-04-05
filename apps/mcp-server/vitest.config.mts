import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// Cache tests have been migrated to the workers pool (Story 9.2):
// better-sqlite3 is no longer used in cache modules — all DB access goes through D1.
// Workers pool tests use env.DB (real Miniflare D1 binding) for authentic D1 test coverage.
//
// gis.test.ts uses vi.stubGlobal('fetch') + Promise.all where one branch rejects;
// Miniflare tracks that intermediate rejection as "unhandled" even though the outer
// try/catch handles it. Moving gis.test.ts to the Node pool avoids the false positive.
export default defineConfig({
  test: {
    projects: [
      {
        // Workers pool: middleware, tools, providers, env, app, worker, and cache tests
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.toml' },
          }),
        ],
        test: {
          name: 'workers',
          setupFiles: ['src/workers-pool-setup.ts'],
          include: [
            'src/middleware/**/*.test.ts',
            'src/tools/**/*.test.ts',
            'src/providers/**/*.test.ts',
            'src/env.test.ts',
            'src/app.test.ts',
            'src/worker.test.ts',
            'src/cache/**/*.test.ts',
          ],
        },
      },
      {
        // Node pool: lib tests only (gis.test.ts requires Node fetch mock behaviour)
        test: {
          name: 'node',
          include: [
            'src/lib/**/*.test.ts',
          ],
          pool: 'forks',
        },
      },
    ],
  },
})
