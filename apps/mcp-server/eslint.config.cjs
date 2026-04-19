// @ts-check
// ESLint 9 flat config — replaces legacy .eslintrc.json
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Critical: console.log corrupts the MCP JSON-RPC stdout stream (architecture.md)
      'no-console': ['error', { allow: ['error'] }],
      // TypeScript quality rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Test files legitimately reference console methods via vi.spyOn / expect — allow all.
    files: ['src/**/*.test.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Guard Boundary 4: no direct better-sqlite3 imports outside src/cache/
    // Architecture rule: only cache/ modules touch better-sqlite3 directly
    // NOTE: both patterns are in one block — flat config does NOT merge separate
    // no-restricted-imports rule entries; the last one wins. Keep them together.
    files: ['src/**/*.ts'],
    ignores: ['src/cache/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['better-sqlite3'],
            message: 'Direct better-sqlite3 imports are confined to src/cache/ only.',
          },
          {
            group: ['**/cache/db', '**/cache/db.js'],
            message: 'Import from cache module functions (cache/legislators, cache/bills), not the db singleton. Only cache/ and the startup entry point may access the db directly.',
          },
        ],
      }],
    },
  },
  {
    // Guard cache/db singleton: src/index.ts IS exempt as the startup orchestrator.
    // The broader rule above catches all other non-cache files; this block adds the
    // exemption for src/index.ts specifically for the db-singleton pattern only.
    // (better-sqlite3 direct import is already blocked for src/index.ts by the block above.)
    files: ['src/index.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['better-sqlite3'],
            message: 'Direct better-sqlite3 imports are confined to src/cache/ only.',
          },
        ],
      }],
    },
  },
]
