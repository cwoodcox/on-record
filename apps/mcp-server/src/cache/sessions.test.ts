// apps/mcp-server/src/cache/sessions.test.ts
// Tests for seedSessions, isInSession, getActiveSession, getSessionsForRefresh.
//
// Architecture:
//   All functions receive db as a parameter (no singleton) so vi.mock('./db.js') is NOT needed.
//   Date control uses the explicit `now` parameter — no vi.setSystemTime needed.
//
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import { seedSessions, isInSession, getActiveSession, getSessionsForRefresh } from './sessions.js'

// ── Shared date constants ────────────────────────────────────────────────────
const IN_SESSION = new Date('2026-02-15') // Mid-February 2026 — within 2026GS (Jan 20 – Mar 6)
const INTER_SESSION = new Date('2026-06-15') // June 2026 — after 2026GS ended
const BEFORE_SESSION = new Date('2026-01-01') // Before 2026GS start (Jan 20)

describe('sessions', () => {
  let testDb: Database.Database

  beforeEach(() => {
    testDb = new Database(':memory:')
    initializeSchema(testDb)
    seedSessions(testDb)
  })

  afterEach(() => {
    testDb.close()
  })

  // ── seedSessions ──────────────────────────────────────────────────────────

  describe('seedSessions', () => {
    it('seeds known session records — sessions table has rows after seed', () => {
      const count = testDb.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM sessions').get()
      expect(count?.n).toBeGreaterThan(0)
    })

    it('is idempotent — calling twice does not duplicate rows', () => {
      seedSessions(testDb)
      const count = testDb.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM sessions').get()
      const firstCount = count?.n ?? 0

      seedSessions(testDb)
      const count2 = testDb.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM sessions').get()
      expect(count2?.n).toBe(firstCount)
    })

    it('seeds at least 2026GS and 2025GS', () => {
      const ids = testDb
        .prepare<[], { id: string }>('SELECT id FROM sessions')
        .all()
        .map((r) => r.id)
      expect(ids).toContain('2026GS')
      expect(ids).toContain('2025GS')
    })
  })

  // ── isInSession ───────────────────────────────────────────────────────────

  describe('isInSession', () => {
    it('returns true when now falls within a session start/end range', () => {
      expect(isInSession(testDb, IN_SESSION)).toBe(true)
    })

    it('returns false when now is before session start', () => {
      expect(isInSession(testDb, BEFORE_SESSION)).toBe(false)
    })

    it('returns false when now is after session end', () => {
      expect(isInSession(testDb, INTER_SESSION)).toBe(false)
    })

    it('falls back to calendar when sessions table empty', () => {
      const freshDb = new Database(':memory:')
      initializeSchema(freshDb)
      // Do NOT seed — table is empty

      // February → month index 1 < 3 → calendar says in session
      expect(isInSession(freshDb, new Date('2026-02-15'))).toBe(true)
      // June → month index 5 >= 3 → calendar says not in session
      expect(isInSession(freshDb, new Date('2026-06-15'))).toBe(false)

      freshDb.close()
    })
  })

  // ── getActiveSession ──────────────────────────────────────────────────────

  describe('getActiveSession', () => {
    it('returns active session id when in session', () => {
      expect(getActiveSession(testDb, IN_SESSION)).toBe('2026GS')
    })

    it('returns most recent completed session when inter-session', () => {
      // June 2026: 2026GS ended March 6, 2026 — most recently completed → 2026GS
      expect(getActiveSession(testDb, INTER_SESSION)).toBe('2026GS')
    })

    it('DB-backed getActiveSession returns 2026GS in June 2026 (more accurate than calendar which would return 2025GS)', () => {
      // Calendar heuristic: June 2026, month >= 3, so year - 1 = 2025GS (WRONG)
      // DB-backed: 2026GS ended March 2026, is most recent completed → 2026GS (CORRECT)
      const result = getActiveSession(testDb, new Date('2026-06-15'))
      expect(result).toBe('2026GS')
    })

    it('falls back to calendar when sessions table empty — in session', () => {
      const freshDb = new Database(':memory:')
      initializeSchema(freshDb)

      // February 2025 → month index 1 < 3 → 2025GS
      expect(getActiveSession(freshDb, new Date('2025-02-15'))).toBe('2025GS')
      freshDb.close()
    })

    it('falls back to calendar when sessions table empty — inter-session', () => {
      const freshDb = new Database(':memory:')
      initializeSchema(freshDb)

      // July 2025 → month index 6 >= 3 → year - 1 = 2024GS
      // (Calendar fallback — DB-backed would return 2025GS since it's the most recent completed)
      expect(getActiveSession(freshDb, new Date('2025-07-15'))).toBe('2024GS')
      freshDb.close()
    })
  })

  // ── getSessionsForRefresh ─────────────────────────────────────────────────

  describe('getSessionsForRefresh', () => {
    it('returns array with only active session when in session', () => {
      expect(getSessionsForRefresh(testDb, IN_SESSION)).toEqual(['2026GS'])
    })

    it('returns 2 most recent completed sessions when inter-session', () => {
      // June 2026: 2026GS and 2025GS are the 2 most recently completed
      expect(getSessionsForRefresh(testDb, INTER_SESSION)).toEqual(['2026GS', '2025GS'])
    })

    it('falls back to single session when table empty', () => {
      const freshDb = new Database(':memory:')
      initializeSchema(freshDb)

      // IN_SESSION = Feb 15 2026 → calendar fallback: UTC month 1 < 3 → '2026GS'
      const result = getSessionsForRefresh(freshDb, IN_SESSION)
      expect(result).toEqual(['2026GS'])

      freshDb.close()
    })
  })
})
