// apps/mcp-server/src/cache/db.ts
// SQLite database connection singleton with WAL mode.
// All better-sqlite3 usage is confined to apps/mcp-server/src/cache/ (Boundary 4).
// The data/ directory and on-record.db file are created at runtime; both are gitignored.
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// __dirname resolves to this file's directory in CJS output (NodeNext without "type": "module").
// From src/cache/ (dev) or dist/cache/ (prod), ../../ reaches apps/mcp-server/ in both cases.
const dataDir = join(__dirname, '..', '..', 'data')
const dbPath = join(dataDir, 'on-record.db')

// Ensure the data/ directory exists before opening the DB.
// mkdirSync with { recursive: true } is a no-op if the directory already exists.
mkdirSync(dataDir, { recursive: true })

export const db: Database.Database = new Database(dbPath)

// WAL mode for read concurrency — required for multiple readers during cache warm-up.
// WAL mode is persistent: once set, it stays for the DB file lifetime.
// Produces data/on-record.db-shm and data/on-record.db-wal (both gitignored).
db.pragma('journal_mode = WAL')
