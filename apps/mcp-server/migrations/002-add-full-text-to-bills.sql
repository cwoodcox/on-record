-- migrations/002-add-full-text-to-bills.sql
-- Adds full_text column (highlightedProvisions from Utah Legislature API) to bills table.
-- Recreates bill_fts FTS5 virtual table to include full_text as a third indexed column.
--
-- Applied via: wrangler d1 migrations apply on-record-cache [--local]
--
-- FTS5 virtual tables cannot be altered — must be dropped and recreated.
-- Safe to do: bill_fts uses content='bills', so all data is in the bills table.
-- The rebuild re-indexes from the current bills rows (full_text = NULL for existing rows).
--
-- POST-DEPLOY VERIFICATION:
--   The 'rebuild' insert below runs synchronously over the entire bills table and
--   may hit D1's per-statement timeout on a populated production database. If it
--   fails midway, bill_fts will be partially populated until the next writeBills()
--   triggers another rebuild during cache refresh. After applying, verify:
--     SELECT COUNT(*) FROM bill_fts;   -- should equal SELECT COUNT(*) FROM bills;
--   If counts differ, kick a manual cache refresh or re-run the rebuild statement.

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
