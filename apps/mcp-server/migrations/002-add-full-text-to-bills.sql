-- migrations/002-add-full-text-to-bills.sql
-- Adds full_text column (highlightedProvisions from Utah Legislature API) to bills table.
-- Recreates bill_fts FTS5 virtual table to include full_text as a third indexed column.
--
-- Applied via: wrangler d1 migrations apply on-record-cache [--local]
--
-- FTS5 virtual tables cannot be altered — must be dropped and recreated.
-- Safe to do: bill_fts uses content='bills', so all data is in the bills table.
-- The rebuild re-indexes from the current bills rows (full_text = NULL for existing rows).

ALTER TABLE bills ADD COLUMN full_text TEXT;

DROP TABLE IF EXISTS bill_fts;

CREATE VIRTUAL TABLE bill_fts
USING fts5(
  title,
  summary,
  full_text,
  content='bills',
  content_rowid='rowid'
);

INSERT INTO bill_fts(bill_fts) VALUES('rebuild');
