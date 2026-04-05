// apps/mcp-server/src/cache/sessions.ts
// Session metadata module — manages known Utah legislative session records.
// All functions accept D1Database (injected) and are async.
// Called from: index.ts (seedSessions), refresh.ts (getSessionsForRefresh).

interface SessionRow {
  id: string
  year: number
  type: string
  start_date: string
  end_date: string
}

// Known Utah General Session dates.
// Verify against https://le.utah.gov before deploying.
// Utah GS begins on the 3rd Monday of January and runs 45 legislative days.
const UTAH_GENERAL_SESSIONS: SessionRow[] = [
  { id: '2023GS', year: 2023, type: 'GS', start_date: '2023-01-17', end_date: '2023-03-03' },
  { id: '2024GS', year: 2024, type: 'GS', start_date: '2024-01-16', end_date: '2024-03-01' },
  { id: '2025GS', year: 2025, type: 'GS', start_date: '2025-01-21', end_date: '2025-03-07' },
  { id: '2026GS', year: 2026, type: 'GS', start_date: '2026-01-20', end_date: '2026-03-06' },
  { id: '2027GS', year: 2027, type: 'GS', start_date: '2027-01-19', end_date: '2027-03-05' },
  { id: '2028GS', year: 2028, type: 'GS', start_date: '2028-01-18', end_date: '2028-03-03' },
]

/**
 * Seeds the sessions table with known Utah General Session records.
 * Uses INSERT OR IGNORE so calling multiple times is idempotent.
 * Uses db.batch() for atomic multi-row insert.
 *
 * @param db - D1Database instance
 */
export async function seedSessions(db: D1Database): Promise<void> {
  await db.batch(
    UTAH_GENERAL_SESSIONS.map((s) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO sessions (id, year, type, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(s.id, s.year, s.type, s.start_date, s.end_date),
    ),
  )
}

/**
 * Returns true if the given date falls within any known session's date range.
 * Falls back to calendar heuristic (month < 3) if sessions table is empty.
 *
 * @param db  - D1Database instance
 * @param now - Optional current date; defaults to new Date() (injectable for tests)
 */
export async function isInSession(db: D1Database, now?: Date): Promise<boolean> {
  const today = (now ?? new Date()).toISOString().slice(0, 10)
  const row = await db
    .prepare(`SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`)
    .bind(today, today)
    .first<{ id: string }>()
  if (row !== null) return true

  // If sessions table has data and no match found → definitively inter-session
  const hasData = await db.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>()
  if (hasData !== null && hasData.n > 0) return false

  // Fallback only when sessions table truly empty — calendar heuristic
  const d = now ?? new Date()
  return d.getUTCMonth() < 3
}

/**
 * Returns the active session ID if in session, or the most recently completed session ID.
 * Falls back to calendar computation if sessions table is empty.
 *
 * @param db  - D1Database instance
 * @param now - Optional current date; defaults to new Date()
 */
export async function getActiveSession(db: D1Database, now?: Date): Promise<string> {
  const today = (now ?? new Date()).toISOString().slice(0, 10)

  // Active session check
  const activeRow = await db
    .prepare(`SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`)
    .bind(today, today)
    .first<{ id: string }>()
  if (activeRow !== null) return activeRow.id

  // Most recently completed session
  const completedRow = await db
    .prepare(`SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 1`)
    .bind(today)
    .first<{ id: string }>()
  if (completedRow !== null) return completedRow.id

  // Fallback: calendar computation (Jan-Mar = current year, else prior year)
  const d = now ?? new Date()
  const year = d.getUTCFullYear()
  return d.getUTCMonth() < 3 ? `${year}GS` : `${year - 1}GS`
}

/**
 * Returns the session IDs to fetch bills for.
 * - Active session: returns [activeSessionId]
 * - Inter-session: returns the 2 most recently completed session IDs (most recent first)
 *
 * @param db  - D1Database instance
 * @param now - Optional current date; defaults to new Date()
 */
export async function getSessionsForRefresh(db: D1Database, now?: Date): Promise<string[]> {
  const today = (now ?? new Date()).toISOString().slice(0, 10)

  // Check for active session
  const activeRow = await db
    .prepare(`SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`)
    .bind(today, today)
    .first<{ id: string }>()
  if (activeRow !== null) return [activeRow.id]

  // Inter-session: last 2 completed sessions
  const completed = await db
    .prepare(`SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 2`)
    .bind(today)
    .all<{ id: string }>()
  if (completed.results.length > 0) return completed.results.map((r) => r.id)

  // Fallback: single session from calendar
  return [await getActiveSession(db, now)]
}
