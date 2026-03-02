// apps/mcp-server/src/cache/schema.ts
// Initializes all SQLite tables, virtual tables, and indexes.
// Called once at server startup (Story 1.3).
// All DDL is idempotent — safe to run on every restart.
import type Database from 'better-sqlite3'

export function initializeSchema(db: Database.Database): void {
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS bills (
        id          TEXT    PRIMARY KEY,
        session     TEXT    NOT NULL,
        title       TEXT    NOT NULL,
        summary     TEXT    NOT NULL,
        status      TEXT    NOT NULL,
        sponsor_id  TEXT    NOT NULL,
        vote_result TEXT,
        vote_date   TEXT,
        cached_at   TEXT    NOT NULL
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
