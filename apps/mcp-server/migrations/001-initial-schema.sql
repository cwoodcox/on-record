-- migrations/001-initial-schema.sql
-- Clean schema for D1 (no migration logic — fresh install).
-- Applied via: wrangler d1 migrations apply on-record-cache --local

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
