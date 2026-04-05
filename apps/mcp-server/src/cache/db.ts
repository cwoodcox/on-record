// apps/mcp-server/src/cache/db.ts
// Node.js path helper — for use by src/index.ts only.
// Earmarked for decommission after Story 9.5 (Workers path uses D1 exclusively).
// All better-sqlite3 usage remains confined to src/cache/ (Boundary 4).
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// __dirname resolves to this file's directory in CJS output (NodeNext without "type": "module").
// From src/cache/ (dev) or dist/cache/ (prod), ../../ reaches apps/mcp-server/ in both cases.
const dataDir = join(__dirname, '..', '..', 'data')
const dbPath = join(dataDir, 'on-record.db')

/**
 * Opens a better-sqlite3 Database for the Node.js development path.
 * Called once from src/index.ts at startup.
 * Not used in the Workers path — D1 is injected via env.DB there.
 */
export function createNodeDb(): Database.Database {
  try {
    mkdirSync(dataDir, { recursive: true })
  } catch (err) {
    console.error('[db] Failed to create data/ directory:', err)
    process.exit(1)
  }

  let instance: Database.Database
  try {
    instance = new Database(dbPath)
  } catch (err) {
    console.error('[db] Failed to open SQLite database at', dbPath, ':', err)
    process.exit(1)
  }

  // WAL mode for read concurrency — required for multiple readers during cache warm-up.
  instance.pragma('journal_mode = WAL')
  return instance
}
