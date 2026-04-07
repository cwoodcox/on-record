// apps/mcp-server/src/cache/refresh.ts
// Legislators and bills cache warm-up functions.
// Scheduling is handled by Cloudflare Workers Cron Triggers (wrangler.toml) via worker.ts.
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

