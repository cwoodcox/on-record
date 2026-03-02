// apps/mcp-server/src/cache/schema.test.ts
// Tests for initializeSchema using an in-memory SQLite database.
// Does NOT import the db singleton from cache/db.ts — tests are isolated from disk.
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'

describe('initializeSchema', () => {
  let db: Database.Database

  beforeEach(() => {
    // Fresh in-memory DB per test — isolated, fast, no disk I/O
    db = new Database(':memory:')
  })

  it('creates the legislators table', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='legislators'")
      .get()
    expect(result).toBeDefined()
  })

  it('creates the bills table', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bills'")
      .get()
    expect(result).toBeDefined()
  })

  it('creates the bill_fts virtual table', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bill_fts'")
      .get()
    expect(result).toBeDefined()
  })

  it('creates the events table', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
      .get()
    expect(result).toBeDefined()
  })

  it('is idempotent — calling twice does not throw', () => {
    expect(() => {
      initializeSchema(db)
      initializeSchema(db)
    }).not.toThrow()
  })

  it('creates idx_bills_session index', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_session'")
      .get()
    expect(result).toBeDefined()
  })

  it('creates idx_bills_sponsor_id index', () => {
    initializeSchema(db)
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_sponsor_id'")
      .get()
    expect(result).toBeDefined()
  })

  it('legislators table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(legislators)').all() as Array<{ name: string }>
    const names = columns.map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'chamber',
        'district',
        'name',
        'email',
        'phone',
        'phone_label',
        'session',
        'cached_at',
      ])
    )
  })

  it('bills table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(bills)').all() as Array<{ name: string }>
    const names = columns.map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'session',
        'title',
        'summary',
        'status',
        'sponsor_id',
        'vote_result',
        'vote_date',
        'cached_at',
      ])
    )
  })

  it('events table has required columns', () => {
    initializeSchema(db)
    const columns = db.prepare('PRAGMA table_info(events)').all() as Array<{ name: string }>
    const names = columns.map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'event_type', 'district', 'timestamp'])
    )
  })

  it('bill_fts virtual table exists and can be queried', () => {
    initializeSchema(db)
    // bill_fts is a content table backed by bills — query with no rows should return empty, not error
    expect(() => {
      db.prepare("SELECT * FROM bill_fts WHERE bill_fts MATCH 'test'").all()
    }).not.toThrow()
  })
})
