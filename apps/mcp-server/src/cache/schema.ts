// apps/mcp-server/src/cache/schema.ts
// Initializes all SQLite tables, virtual tables, and indexes.
// Called once at server startup (Story 1.3).
// All DDL is idempotent — safe to run on every restart.
import type Database from 'better-sqlite3'

export function initializeSchema(db: Database.Database): void {
  // Migration: bills table originally had `id TEXT PRIMARY KEY` (single-column).
  // During inter-session refresh both 2025GS and 2026GS bills are written in one
  // writeBills() call; because bill numbers repeat across sessions (HB0001 exists
  // in every session), INSERT OR REPLACE on a single-column PK silently overwrites
  // the earlier session's row with the later session's row, leaving only one copy
  // of each bill number in the cache. Fix: composite PRIMARY KEY (id, session).
  // If the old single-column schema is detected, drop bills + bill_fts so the
  // CREATE TABLE IF NOT EXISTS block below recreates them with the correct schema.
  const billsInfo = db.pragma('table_info(bills)') as Array<{ name: string; pk: number }>
  if (billsInfo.length > 0) {
    const sessionCol = billsInfo.find((c) => c.name === 'session')
    if (sessionCol && sessionCol.pk === 0) {
      // Old schema: session is not part of the primary key — drop and recreate
      db.exec('DROP TABLE IF EXISTS bill_fts')
      db.exec('DROP TABLE IF EXISTS bills')
    }
  }

  // Migration: add floor_sponsor_id column if absent — backward-compatible (nullable, no default needed).
  // Guard: only ALTER if the bills table already exists (length > 0); fresh installs get the column
  // via the CREATE TABLE statement below, so no ALTER is needed on first run.
  const billsCols = db.pragma('table_info(bills)') as Array<{ name: string }>
  if (billsCols.length > 0 && !billsCols.some((c) => c.name === 'floor_sponsor_id')) {
    db.exec('ALTER TABLE bills ADD COLUMN floor_sponsor_id TEXT')
  }

  db.transaction(() => {
    // --- legislators table ---
    // Stores cached legislator data. Populated by cache/legislators.ts (Story 2.3).
    // Refreshed daily at 6 AM via node-cron (Story 2.3).
    db.exec(`
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
      )
    `)

    // --- bills table ---
    // Stores cached bill data. Populated by cache/bills.ts (Story 3.2).
    // Refreshed hourly via node-cron (Story 3.2).
    // Composite primary key (id, session): a bill number like "HB0001" repeats
    // across sessions; the unique identity is the (bill_number, session) pair.
    db.exec(`
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
        cached_at        TEXT    NOT NULL,
        PRIMARY KEY (id, session)
      )
    `)

    // --- bill_fts virtual table ---
    // FTS5 virtual table for full-text search over bill titles and summaries.
    // Supports FR8 theme keyword search (healthcare, education, housing, etc.).
    // content='bills' + content_rowid='rowid' links FTS5 to the bills table as
    // a content table — avoids duplicating title/summary storage.
    // Story 3.2 must rebuild FTS5 after bulk loads:
    //   INSERT INTO bill_fts(bill_fts) VALUES('rebuild')
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
      USING fts5(
        title,
        summary,
        content='bills',
        content_rowid='rowid'
      )
    `)

    // --- sessions table ---
    // Stores known Utah legislative session metadata. Seeded at startup by cache/sessions.ts.
    // Used by sessions.ts to detect active/inter-session and select sessions for bill refresh.
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         TEXT    PRIMARY KEY,
        year       INTEGER NOT NULL,
        type       TEXT    NOT NULL,
        start_date TEXT    NOT NULL,
        end_date   TEXT    NOT NULL
      )
    `)

    // --- events table ---
    // Anonymous analytics events. Written by routes/events.ts (Story 7.3).
    // Never contains PII — district only, no addresses (FR39, NFR7).
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type  TEXT    NOT NULL,
        district    TEXT,
        timestamp   TEXT    NOT NULL
      )
    `)

    // --- indexes ---
    // idx_sessions_start_end: supports efficient date-range queries for active session detection
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_start_end
      ON sessions (start_date, end_date)
    `)

    // idx_bills_session: used by bills cache queries scoped to a legislative session
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bills_session
      ON bills (session)
    `)

    // idx_bills_sponsor_id: enables sub-2-second bill lookups by legislator (FR11)
    // without a full session scan
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id
      ON bills (sponsor_id)
    `)
  })()
}
