import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// Tests that use better-sqlite3 (native Node.js add-on) cannot run inside the
// Workers pool because Miniflare does not support native Node.js modules.
// Cache-layer tests remain on the Node pool until Story 9.2 migrates them to D1.
//
// gis.test.ts uses vi.stubGlobal('fetch') + Promise.all where one branch rejects;
// Miniflare tracks that intermediate rejection as "unhandled" even though the outer
// try/catch handles it. Moving gis.test.ts to the Node pool avoids the false positive.
// All other middleware/tools/providers/env tests run in the Workers pool.
export default defineConfig({
  test: {
    projects: [
      {
        // Workers pool: middleware, tools, providers, env tests
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.toml' },
          }),
        ],
        test: {
          name: 'workers',
          include: [
            'src/middleware/**/*.test.ts',
            'src/tools/**/*.test.ts',
            'src/providers/**/*.test.ts',
            'src/env.test.ts',
          ],
        },
      },
      {
        // Node pool: cache tests (better-sqlite3) + lib tests (vi.stubGlobal fetch quirk)
        test: {
          name: 'node',
          include: [
            'src/cache/**/*.test.ts',
            'src/lib/**/*.test.ts',
          ],
          pool: 'forks',
        },
      },
    ],
  },
})
