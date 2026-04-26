// apps/mcp-server/src/cache/schema.ts
// DDL authority for the D1 schema.
// The canonical schema is in migrations/001-initial-schema.sql.
// SCHEMA_SQL is a copy of that file used by tests (beforeAll) and the
// Node.js startup path (applySchema) to initialise an in-process D1/SQLite DB.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS legislators (
  id          TEXT    PRIMARY KEY,
  chamber     TEXT    NOT NULL,
  district    INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  phone_label TEXT,
  session     TEXT    NOT NULL,
  cached_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id               TEXT    NOT NULL,
  session          TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  summary          TEXT    NOT NULL,
  status           TEXT    NOT NULL,
  sponsor_id       TEXT    NOT NULL,
  floor_sponsor_id TEXT,
  vote_result      TEXT,
  vote_date        TEXT,
  full_text        TEXT,
  cached_at        TEXT    NOT NULL,
  PRIMARY KEY (id, session)
);

CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
USING fts5(
  title,
  summary,
  full_text,
  content='bills',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  year       INTEGER NOT NULL,
  type       TEXT    NOT NULL,
  start_date TEXT    NOT NULL,
  end_date   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT    NOT NULL,
  district    TEXT,
  timestamp   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_start_end ON sessions (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bills_session ON bills (session);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id ON bills (sponsor_id);
`

/**
 * Applies the schema DDL to the given D1 database.
 * Used by tests (beforeAll) and the Node.js startup path.
 * Idempotent — safe to call multiple times (all DDL uses IF NOT EXISTS).
 * Uses db.batch() for atomic DDL execution.
 */
export async function applySchema(db: D1Database): Promise<void> {
  const statements = SCHEMA_SQL
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
  await db.batch(statements.map((stmt) => db.prepare(stmt)))
}
