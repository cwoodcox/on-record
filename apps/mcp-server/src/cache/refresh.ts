// apps/mcp-server/src/cache/refresh.ts
// Legislators and bills cache warm-up and refresh schedulers.
// Cron callback must NOT be async or throw — async work is wrapped with .catch().
import type Database from 'better-sqlite3'
import { schedule } from 'node-cron'
import { logger } from '../lib/logger.js'
import type { LegislatureDataProvider } from '../providers/types.js'
import { writeLegislators } from './legislators.js'
import { writeBills, getActiveSession } from './bills.js'

// Utah legislative districts:
//   House:  1–75  (75 districts)
//   Senate: 1–29  (29 districts)
const HOUSE_DISTRICTS = Array.from({ length: 75 }, (_, i) => i + 1)
const SENATE_DISTRICTS = Array.from({ length: 29 }, (_, i) => i + 1)

/**
 * Fetches all Utah legislative districts in parallel and writes results to cache.
 * 104 total calls (75 house + 29 senate) using Promise.all — acceptable burst on startup
 * since legislators refresh at most once per day.
 *
 * @param db       - Injected SQLite database instance (dependency injection — Boundary 4)
 * @param provider - Data provider (UtahLegislatureProvider or test mock)
 */
export async function warmUpLegislatorsCache(
  db: Database.Database,
  provider: LegislatureDataProvider,
): Promise<void> {
  const houseCalls = HOUSE_DISTRICTS.map((district) =>
    provider.getLegislatorsByDistrict('house', district),
  )
  const senateCalls = SENATE_DISTRICTS.map((district) =>
    provider.getLegislatorsByDistrict('senate', district),
  )

  const allResults = await Promise.all([...houseCalls, ...senateCalls])

  // Flatten all Legislator[] arrays into a single array for a single transactional write
  const legislators = allResults.flat()
  writeLegislators(db, legislators)
}

/**
 * Registers a daily cron job to refresh the legislators cache at 6 AM (0 6 * * *).
 * The cron callback is synchronous and wraps the async warm-up with .catch() to
 * prevent uncaught rejections from surfacing to callers.
 * On failure: logs with source 'legislature-api'; stale data continues to be served (NFR17).
 * On success: logs with source 'cache'.
 *
 * @param db       - Injected SQLite database instance (dependency injection — Boundary 4)
 * @param provider - Data provider
 */
export function scheduleLegislatorsRefresh(
  db: Database.Database,
  provider: LegislatureDataProvider,
): void {
  schedule('0 6 * * *', () => {
    warmUpLegislatorsCache(db, provider)
      .then(() => {
        logger.info({ source: 'cache' }, 'Legislators cache refreshed')
      })
      .catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Legislator cache refresh failed')
      })
  })
}

/**
 * Fetches all bills for the active session and writes results to cache.
 * Calls provider.getBillsBySession once — stays within the ≤1×/hour rate limit (AC3).
 * Propagates errors from the provider — caller (index.ts) handles gracefully with .catch().
 *
 * @param db       - Injected SQLite database instance (dependency injection — Boundary 4)
 * @param provider - Data provider (UtahLegislatureProvider or test mock)
 */
export async function warmUpBillsCache(
  db: Database.Database,
  provider: LegislatureDataProvider,
): Promise<void> {
  const session = getActiveSession()
  const bills = await provider.getBillsBySession(session)
  writeBills(db, bills)
}

/**
 * Registers an hourly cron job to refresh the bills cache at the top of every hour (0 * * * *).
 * The cron callback is synchronous and wraps the async warm-up with .catch() to
 * prevent uncaught rejections from surfacing to callers.
 * On failure: logs with source 'legislature-api'; stale data continues to be served (NFR17).
 * On success: logs with source 'cache'.
 *
 * @param db       - Injected SQLite database instance (dependency injection — Boundary 4)
 * @param provider - Data provider
 */
export function scheduleBillsRefresh(
  db: Database.Database,
  provider: LegislatureDataProvider,
): void {
  schedule('0 * * * *', () => {
    warmUpBillsCache(db, provider)
      .then(() => {
        logger.info({ source: 'cache' }, 'Bills cache refreshed')
      })
      .catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Bills cache refresh failed')
      })
  })
}
