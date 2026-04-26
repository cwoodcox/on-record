// apps/mcp-server/src/cache/refresh.ts
// Legislators and bills cache warm-up functions.
// Scheduling is handled by Cloudflare Workers Cron Triggers (wrangler.toml) via worker.ts.
import { logger } from '../lib/logger.js'
import type { LegislatureDataProvider } from '../providers/types.js'
import { writeLegislators } from './legislators.js'
import { writeBills } from './bills.js'
import { getSessionsForRefresh, isInSession } from './sessions.js'

// Utah legislative districts:
//   House:  1–75  (75 districts)
//   Senate: 1–29  (29 districts)
const HOUSE_DISTRICTS = Array.from({ length: 75 }, (_, i) => i + 1)
const SENATE_DISTRICTS = Array.from({ length: 29 }, (_, i) => i + 1)

/**
 * Fetches all Utah legislative districts in parallel and writes results to cache.
 * 104 total calls (75 house + 29 senate) using Promise.all.
 *
 * @param db       - D1Database instance
 * @param provider - Data provider (UtahLegislatureProvider or test mock)
 */
export async function warmUpLegislatorsCache(
  db: D1Database,
  provider: LegislatureDataProvider,
): Promise<void> {
  const houseCalls = HOUSE_DISTRICTS.map((district) =>
    provider.getLegislatorsByDistrict('house', district),
  )
  const senateCalls = SENATE_DISTRICTS.map((district) =>
    provider.getLegislatorsByDistrict('senate', district),
  )

  const allResults = await Promise.all([...houseCalls, ...senateCalls])

  const legislators = allResults.flat()
  await writeLegislators(db, legislators)
}


/**
 * Configuration for incremental bill cache refresh.
 * All fields are optional — defaults are applied inside warmUpBillsCache.
 */
export interface BillRefreshConfig {
  /** Seconds before a bill is considered stale when legislature is in session. Default: 3600 (1 hour). */
  staleSecondsInSession?: number
  /** Seconds before a bill is considered stale during inter-session period. Default: 86400 (24 hours). */
  staleSecondsOutOfSession?: number
  /** Wall-time budget in seconds. 0 = no limit (dev/test mode). Default: 0. */
  wallTimeSeconds?: number
}

const BATCH_SIZE = 20

/** Thrown when a getBillDetail call is abandoned due to the wall-time budget. Never a real API failure. */
class WallTimeBudgetExceeded extends Error {
  constructor() { super('wall-time budget exceeded') }
}

/**
 * Fetches bills for the active session (or the 2 most recent completed sessions during
 * inter-session periods) and writes results to cache.
 *
 * Incremental refresh: skips bills whose `cached_at` is within the staleness TTL.
 * Wall-time budget: stops fetching new batches before Cloudflare's 30-second limit.
 *
 * @param db       - D1Database instance
 * @param provider - Data provider
 * @param config   - Optional staleness and wall-time configuration
 */
export async function warmUpBillsCache(
  db: D1Database,
  provider: LegislatureDataProvider,
  config?: BillRefreshConfig,
): Promise<string[]> {
  const staleSecondsInSession = config?.staleSecondsInSession ?? 3600
  const staleSecondsOutOfSession = config?.staleSecondsOutOfSession ?? 86400
  const wallTimeSeconds = config?.wallTimeSeconds ?? 0

  const wallTimeLimitMs = wallTimeSeconds > 0
    ? (wallTimeSeconds - 2) * 1000  // 2s buffer for D1 writes
    : Infinity
  const startTime = Date.now()

  // Single AbortController for the entire run — fires once at the wall-time deadline.
  const controller = new AbortController()
  if (wallTimeLimitMs !== Infinity) {
    setTimeout(() => controller.abort(), wallTimeLimitMs)
  }

  const inSession = await isInSession(db)
  const staleTtlMs = (inSession ? staleSecondsInSession : staleSecondsOutOfSession) * 1000

  const sessions = await getSessionsForRefresh(db)
  const refreshedSessions: string[] = []

  for (const session of sessions) {
    if (controller.signal.aborted || Date.now() - startTime >= wallTimeLimitMs) {
      logger.warn(
        { source: 'cache', elapsed: Date.now() - startTime, session },
        'wall-time budget reached — skipping remaining sessions',
      )
      break
    }

    // Fetch all bill IDs for this session from the provider
    let allStubIds: string[]
    try {
      allStubIds = await provider.getBillStubsForSession(session)
    } catch (err) {
      logger.warn({ source: 'cache', err, session }, 'Failed to fetch bill stubs for session — skipping')
      continue
    }

    // Query D1 for bills in this session that are still fresh
    const cutoff = new Date(Date.now() - staleTtlMs).toISOString()
    const freshRows = await db
      .prepare('SELECT id FROM bills WHERE session = ? AND cached_at > ?')
      .bind(session, cutoff)
      .all<{ id: string }>()
    const freshIds = new Set(freshRows.results.map((r) => r.id))
    const staleIds = allStubIds.filter((id) => !freshIds.has(id))

    logger.info(
      { source: 'cache', session, total: allStubIds.length, fresh: freshIds.size, stale: staleIds.length },
      'bill cache check',
    )

    // All bills are fresh — skip this session entirely
    if (staleIds.length === 0) {
      logger.info({ source: 'cache', session }, 'all bills fresh — skipping')
      refreshedSessions.push(session)
      continue
    }

    // Fetch stale bills in batches, respecting the wall-time budget.
    // The shared AbortController (created above) fires at the wall-time deadline;
    // in-flight fetches are cancelled cleanly rather than logging spurious errors.
    const fetchedBills: import('@on-record/types').BillDetail[] = []
    let exitedEarly = false
    let failedCount = 0

    for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
      if (controller.signal.aborted || Date.now() - startTime >= wallTimeLimitMs) {
        logger.warn(
          { source: 'cache', elapsed: Date.now() - startTime, session },
          'wall-time budget reached — stopping early',
        )
        exitedEarly = true
        break
      }

      const batch = staleIds.slice(i, i + BATCH_SIZE)
      const settled = await Promise.allSettled(
        batch.map(async (billId) => {
          try {
            return await provider.getBillDetail(billId, session, controller.signal)
          } catch (err) {
            // Reclassify as wall-time abandonment — not a real API failure
            if (controller.signal.aborted) throw new WallTimeBudgetExceeded()
            throw err
          }
        }),
      )

      let hitDeadline = false
      settled.forEach((result, idx) => {
        const billId = batch[idx]!
        if (result.status === 'fulfilled') {
          fetchedBills.push(result.value)
        } else if (result.reason instanceof WallTimeBudgetExceeded) {
          hitDeadline = true
        } else {
          logger.debug(
            { source: 'cache', session, billId, err: result.reason },
            'getBillDetail failed — skipping',
          )
          failedCount++
        }
      })

      if (hitDeadline) {
        logger.warn(
          { source: 'cache', elapsed: Date.now() - startTime, session },
          'wall-time budget reached — stopping early',
        )
        exitedEarly = true
        break
      }
    }

    // Write all fetched bills (even on early exit — no partial batch is silently dropped)
    if (fetchedBills.length > 0) {
      await writeBills(db, fetchedBills.map((detail) => ({
        id: detail.id,
        session: detail.session,
        title: detail.title,
        summary: detail.summary,
        status: detail.status,
        sponsorId: detail.sponsorId,
        ...(detail.floorSponsorId !== undefined && { floorSponsorId: detail.floorSponsorId }),
        ...(detail.voteResult !== undefined && { voteResult: detail.voteResult }),
        ...(detail.voteDate !== undefined && { voteDate: detail.voteDate }),
        ...(detail.fullText !== undefined && { fullText: detail.fullText }),
      })))
    }

    logger.info(
      {
        source: 'cache',
        session,
        fetched: fetchedBills.length,
        failed: failedCount,
        remaining: staleIds.length - fetchedBills.length - failedCount,
        exitedEarly,
      },
      'bill refresh complete',
    )

    refreshedSessions.push(session)

    if (exitedEarly) break
  }

  return refreshedSessions
}

