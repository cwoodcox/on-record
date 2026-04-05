// apps/mcp-server/src/cache/sessions.test.ts
// Tests for seedSessions, isInSession, getActiveSession, getSessionsForRefresh.
// All functions are async and accept D1Database — use env.DB from cloudflare:test.
// Date control uses the explicit `now` parameter — no vi.setSystemTime needed.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'
import { seedSessions, isInSession, getActiveSession, getSessionsForRefresh } from './sessions.js'

// ── Shared date constants ────────────────────────────────────────────────────
const IN_SESSION = new Date('2026-02-15') // Mid-February 2026 — within 2026GS (Jan 20 – Mar 6)
const INTER_SESSION = new Date('2026-06-15') // June 2026 — after 2026GS ended
const BEFORE_SESSION = new Date('2026-01-01') // Before 2026GS start (Jan 20)

beforeAll(async () => {
  await applySchema(env.DB)
})

describe('sessions', () => {
  beforeEach(async () => {
    // Clear and re-seed for isolation
    await env.DB.prepare('DELETE FROM sessions').run()
    await seedSessions(env.DB)
  })

  // ── seedSessions ──────────────────────────────────────────────────────────

  describe('seedSessions', () => {
    it('seeds known session records — sessions table has rows after seed', async () => {
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>()
      expect(count?.n).toBeGreaterThan(0)
    })

    it('is idempotent — calling twice does not duplicate rows', async () => {
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>()
      const firstCount = count?.n ?? 0

      await seedSessions(env.DB)
      const count2 = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>()
      expect(count2?.n).toBe(firstCount)
    })

    it('seeds at least 2026GS and 2025GS', async () => {
      const result = await env.DB.prepare('SELECT id FROM sessions').all<{ id: string }>()
      const ids = result.results.map((r) => r.id)
      expect(ids).toContain('2026GS')
      expect(ids).toContain('2025GS')
    })
  })

  // ── isInSession ───────────────────────────────────────────────────────────

  describe('isInSession', () => {
    it('returns true when now falls within a session start/end range', async () => {
      expect(await isInSession(env.DB, IN_SESSION)).toBe(true)
    })

    it('returns false when now is before session start', async () => {
      expect(await isInSession(env.DB, BEFORE_SESSION)).toBe(false)
    })

    it('returns false when now is after session end', async () => {
      expect(await isInSession(env.DB, INTER_SESSION)).toBe(false)
    })

    it('falls back to calendar when sessions table empty', async () => {
      await env.DB.prepare('DELETE FROM sessions').run()

      // February → month index 1 < 3 → calendar says in session
      expect(await isInSession(env.DB, new Date('2026-02-15'))).toBe(true)
      // June → month index 5 >= 3 → calendar says not in session
      expect(await isInSession(env.DB, new Date('2026-06-15'))).toBe(false)
    })
  })

  // ── getActiveSession ──────────────────────────────────────────────────────

  describe('getActiveSession', () => {
    it('returns active session id when in session', async () => {
      expect(await getActiveSession(env.DB, IN_SESSION)).toBe('2026GS')
    })

    it('returns most recent completed session when inter-session', async () => {
      // June 2026: 2026GS ended March 6, 2026 — most recently completed → 2026GS
      expect(await getActiveSession(env.DB, INTER_SESSION)).toBe('2026GS')
    })

    it('DB-backed getActiveSession returns 2026GS in June 2026 (more accurate than calendar)', async () => {
      // Calendar heuristic: June 2026, month >= 3, so year - 1 = 2025GS (WRONG)
      // DB-backed: 2026GS ended March 2026, is most recent completed → 2026GS (CORRECT)
      const result = await getActiveSession(env.DB, new Date('2026-06-15'))
      expect(result).toBe('2026GS')
    })

    it('falls back to calendar when sessions table empty — in session', async () => {
      await env.DB.prepare('DELETE FROM sessions').run()

      // February 2025 → month index 1 < 3 → 2025GS
      expect(await getActiveSession(env.DB, new Date('2025-02-15'))).toBe('2025GS')
    })

    it('falls back to calendar when sessions table empty — inter-session', async () => {
      await env.DB.prepare('DELETE FROM sessions').run()

      // July 2025 → month index 6 >= 3 → year - 1 = 2024GS
      expect(await getActiveSession(env.DB, new Date('2025-07-15'))).toBe('2024GS')
    })
  })

  // ── getSessionsForRefresh ─────────────────────────────────────────────────

  describe('getSessionsForRefresh', () => {
    it('returns array with only active session when in session', async () => {
      expect(await getSessionsForRefresh(env.DB, IN_SESSION)).toEqual(['2026GS'])
    })

    it('returns 2 most recent completed sessions when inter-session', async () => {
      // June 2026: 2026GS and 2025GS are the 2 most recently completed
      expect(await getSessionsForRefresh(env.DB, INTER_SESSION)).toEqual(['2026GS', '2025GS'])
    })

    it('falls back to single session when table empty', async () => {
      await env.DB.prepare('DELETE FROM sessions').run()

      // IN_SESSION = Feb 15 2026 → calendar fallback: UTC month 1 < 3 → '2026GS'
      const result = await getSessionsForRefresh(env.DB, IN_SESSION)
      expect(result).toEqual(['2026GS'])
    })
  })
})
