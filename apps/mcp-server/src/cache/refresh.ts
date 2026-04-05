// apps/mcp-server/src/cache/refresh.ts
// Legislators and bills cache warm-up and refresh schedulers.
// scheduleLegislatorsRefresh and scheduleBillsRefresh use node-cron — Node.js path only.
// In the Workers path these are replaced by Cron Triggers (Story 9.3).
// Cron callback must NOT be async or throw — async work is wrapped with .catch().
import { schedule } from 'node-cron'
import { logger } from '../lib/logger.js'
import type { LegislatureDataProvider } from '../providers/types.js'
import { writeLegislators } from './legislators.js'
import { writeBills } from './bills.js'
import { getSessionsForRefresh } from './sessions.js'

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
 * Registers a daily cron job to refresh the legislators cache at 6 AM (0 6 * * *).
 * Node.js path only — Workers path uses Cron Triggers (Story 9.3).
 *
 * @param db       - D1Database instance
 * @param provider - Data provider
 */
export function scheduleLegislatorsRefresh(
  db: D1Database,
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
 * Fetches bills for the active session (or the 2 most recent completed sessions during
 * inter-session periods) and writes results to cache.
 *
 * @param db       - D1Database instance
 * @param provider - Data provider
 */
export async function warmUpBillsCache(
  db: D1Database,
  provider: LegislatureDataProvider,
): Promise<string[]> {
  const sessions = await getSessionsForRefresh(db)
  const allBills = await Promise.all(sessions.map((s) => provider.getBillsBySession(s)))
  await writeBills(db, allBills.flat())
  return sessions
}

/**
 * Registers an hourly cron job to refresh the bills cache at the top of every hour.
 * Node.js path only — Workers path uses Cron Triggers (Story 9.3).
 *
 * @param db       - D1Database instance
 * @param provider - Data provider
 */
export function scheduleBillsRefresh(
  db: D1Database,
  provider: LegislatureDataProvider,
): void {
  schedule('0 * * * *', () => {
    warmUpBillsCache(db, provider)
      .then((sessions) => {
        logger.info({ source: 'cache', sessions }, 'Bills cache refreshed')
      })
      .catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Bills cache refresh failed')
      })
  })
}
