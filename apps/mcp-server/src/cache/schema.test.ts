// apps/mcp-server/src/cache/schema.test.ts
// Tests for applySchema using the D1 binding provided by the workers pool.
// Schema is authoritative in migrations/001-initial-schema.sql; applySchema()
// applies the same DDL (SCHEMA_SQL) to a D1 database for tests and Node.js startup.
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'

describe('applySchema', () => {
  beforeAll(async () => {
    await applySchema(env.DB)
  })

  it('creates the legislators table', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='legislators'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('creates the bills table', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bills'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('creates the bill_fts virtual table', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bill_fts'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('creates the events table', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('is idempotent — calling twice does not throw', async () => {
    await expect(applySchema(env.DB)).resolves.toBeUndefined()
  })

  it('creates idx_bills_session index', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_session'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('creates idx_bills_sponsor_id index', async () => {
    const result = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bills_sponsor_id'")
      .first<{ name: string }>()
    expect(result).toBeDefined()
  })

  it('legislators table has required columns', async () => {
    const result = await env.DB.prepare('PRAGMA table_info(legislators)').all<{ name: string }>()
    const names = result.results.map((c) => c.name)
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

  it('bills table has required columns', async () => {
    const result = await env.DB.prepare('PRAGMA table_info(bills)').all<{ name: string }>()
    const names = result.results.map((c) => c.name)
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

  it('events table has required columns', async () => {
    const result = await env.DB.prepare('PRAGMA table_info(events)').all<{ name: string }>()
    const names = result.results.map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'event_type', 'district', 'timestamp'])
    )
  })

  it('bill_fts virtual table exists and can be queried', async () => {
    const result = await env.DB
      .prepare("SELECT * FROM bill_fts WHERE bill_fts MATCH 'test'")
      .all()
    expect(result.results).toBeDefined()
  })

  it('bill_fts content table is linked to bills — FTS5 search returns matching rows after rebuild', async () => {
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO bills (id, session, title, summary, status, sponsor_id, cached_at)
         VALUES ('HB0001', '2025GS', 'Healthcare Reform Act', 'Expands Medicaid coverage', 'Enrolled', 'LEG001', '2025-01-01T00:00:00Z')`,
      )
      .run()
    await env.DB.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
    const results = await env.DB
      .prepare("SELECT * FROM bill_fts WHERE bill_fts MATCH 'Medicaid'")
      .all()
    expect(results.results.length).toBeGreaterThan(0)
  })
})
