// apps/mcp-server/src/providers/utah-legislature.ts
import { z } from 'zod'
import type { Legislator, Bill, BillDetail } from '@on-record/types'
import { createAppError } from '@on-record/types'
import { getEnv } from '../env.js'
import { retryWithDelay } from '../lib/retry.js'
import { logger } from '../lib/logger.js'
import type { LegislatureDataProvider } from './types.js'

// ── Zod schemas for API response validation ───────────────────────────────────
// Verified against live API at https://glen.le.utah.gov on 2026-03-03.
// Token goes in URL path — no auth headers used.

// GET /legislator/<H|S>/<district>/<token> → single object
const apiLegislatorSchema = z.object({
  id: z.string(),               // e.g. "DAILEJ"
  formatName: z.string(),       // e.g. "Jennifer Dailey-Provost"
  house: z.string(),            // "H" | "S"
  district: z.string(),         // district number as string, e.g. "22"
  email: z.string(),
  cell: z.string().optional(),  // phone number; field named "cell" is the label
})

// GET /bills/<session>/billlist/<token> → array of minimal stubs
const apiBillListItemSchema = z.object({
  number: z.string(),      // e.g. "HB0001"
  trackingID: z.string(),
})
const apiBillListSchema = z.array(apiBillListItemSchema)

// GET /bills/<session>/<billNumber>/<token> → single object
// Verified field names against live API (2026-03-03). voteResult/voteDate are
// included as optional in schema — live API testing did not confirm their presence,
// so they are treated as undefined when absent.
const apiBillDetailSchema = z.object({
  billNumber: z.string(),          // e.g. "HB0001"
  sessionID: z.string(),           // e.g. "2026GS"
  shortTitle: z.string(),
  generalProvisions: z.string(),
  lastAction: z.string(),
  primeSponsor: z.string(),        // legislator ID, e.g. "WHYTESL"
  floorSponsor: z.string().optional(), // cross-chamber floor sponsor legislator ID (e.g. "HARPEWA"); absent when no floor sponsor
  highlightedProvisions: z.string().optional(),
  voteResult: z.string().optional(),  // populated if API provides vote outcome
  voteDate: z.string().optional(),    // ISO 8601 date string, e.g. "2026-03-01"
})

// ── Provider Implementation ───────────────────────────────────────────────────

export class UtahLegislatureProvider implements LegislatureDataProvider {
  private readonly apiKey: string
  private readonly baseUrl = 'https://glen.le.utah.gov'

  constructor() {
    // getEnv() is validated at server startup — safe to call here
    this.apiKey = getEnv().UTAH_LEGISLATURE_API_KEY
  }

  // Token goes in URL path — API does not use auth headers
  private url(...segments: string[]): string {
    return [this.baseUrl, ...segments, this.apiKey].join('/')
  }

  async getLegislatorsByDistrict(chamber: 'house' | 'senate', district: number): Promise<Legislator[]> {
    const chamberParam = chamber === 'house' ? 'H' : 'S'
    const url = this.url('legislator', chamberParam, String(district))

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Legislature API responded with HTTP ${res.status}`)
        const text = await res.text()
        let rawJson: unknown
        try {
          rawJson = JSON.parse(text)
        } catch {
          throw new Error(`Legislature API returned non-JSON response: ${text}`)
        }
        return rawJson
      }, 2, 1000)
    } catch (err) {
      logger.error({ source: 'legislature-api', err }, 'getLegislatorsByDistrict failed after retries')
      throw createAppError(
        'legislature-api',
        'Failed to fetch legislators from Utah Legislature API',
        'Try again in a few seconds — the API may be temporarily unavailable',
      )
    }

    const parsed = apiLegislatorSchema.safeParse(rawData)
    if (!parsed.success) {
      logger.error({ source: 'legislature-api', err: parsed.error }, 'Legislature API response shape changed')
      throw createAppError(
        'legislature-api',
        'Utah Legislature API returned an unexpected data format',
        'This is a system error — please try again later',
      )
    }

    const leg = parsed.data
    const session = getCurrentSession()
    const base = {
      id: leg.id,
      chamber,
      district: parseInt(leg.district, 10),
      name: leg.formatName,
      email: leg.email,
      session,
    }

    // FR5: API phone field is named "cell" — use as both phone value and label.
    // If absent, set phoneTypeUnknown: true.
    if (leg.cell) {
      return [{ ...base, phone: leg.cell, phoneLabel: 'cell' }]
    }
    return [{ ...base, phone: '', phoneTypeUnknown: true as const }]
  }

  async getBillsBySession(session: string): Promise<Bill[]> {
    // Bill list endpoint returns minimal stubs (number + trackingID only).
    // Full bill metadata is fetched via getBillDetail(). Story 3.2 implements
    // the caching layer that schedules and persists hydrated Bill records.
    const url = this.url('bills', session, 'billlist')

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Legislature API responded with HTTP ${res.status}`)
        const text = await res.text()
        let rawJson: unknown
        try {
          rawJson = JSON.parse(text)
        } catch {
          throw new Error(`Legislature API returned non-JSON response: ${text}`)
        }
        return rawJson
      }, 2, 1000)
    } catch (err) {
      logger.error({ source: 'legislature-api', err }, 'getBillsBySession failed after retries')
      throw createAppError(
        'legislature-api',
        'Failed to fetch bills from Utah Legislature API',
        'Try again in a few seconds — the API may be temporarily unavailable',
      )
    }

    const parsed = apiBillListSchema.safeParse(rawData)
    if (!parsed.success) {
      logger.error({ source: 'legislature-api', err: parsed.error }, 'Legislature API bills response shape changed')
      throw createAppError(
        'legislature-api',
        'Utah Legislature API returned an unexpected bills data format',
        'This is a system error — please try again later',
      )
    }

    // Hydrate each stub by calling getBillDetail in concurrent batches.
    // Batching avoids rate-limiting the API with 1000+ simultaneous requests.
    // Promise.allSettled per batch: individual bill failures are logged and skipped
    // rather than aborting the entire session refresh.
    const BATCH_SIZE = 20
    const bills: Bill[] = []

    for (let i = 0; i < parsed.data.length; i += BATCH_SIZE) {
      const batch = parsed.data.slice(i, i + BATCH_SIZE)
      const settled = await Promise.allSettled(
        batch.map((stub) => this.getBillDetail(stub.number, session))
      )
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const detail = result.value
          bills.push({
            id: detail.id,
            session: detail.session,
            title: detail.title,
            summary: detail.summary,
            status: detail.status,
            sponsorId: detail.sponsorId,
            ...(detail.floorSponsorId !== undefined && { floorSponsorId: detail.floorSponsorId }),
            ...(detail.voteResult !== undefined && { voteResult: detail.voteResult }),
            ...(detail.voteDate !== undefined && { voteDate: detail.voteDate }),
          })
        } else {
          logger.error(
            { source: 'legislature-api', err: result.reason },
            'getBillDetail failed for individual bill — skipping',
          )
        }
      }
    }

    return bills
  }

  async getBillDetail(billId: string, session: string): Promise<BillDetail> {
    const url = this.url('bills', session, billId)

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Legislature API responded with HTTP ${res.status}`)
        const text = await res.text()
        let rawJson: unknown
        try {
          rawJson = JSON.parse(text)
        } catch {
          throw new Error(`Legislature API returned non-JSON response: ${text}`)
        }
        return rawJson
      }, 2, 1000)
    } catch (err) {
      logger.error({ source: 'legislature-api', err }, 'getBillDetail failed after retries')
      throw createAppError(
        'legislature-api',
        `Failed to fetch bill detail for ${billId} from Utah Legislature API`,
        'Try again in a few seconds — the API may be temporarily unavailable',
      )
    }

    const parsed = apiBillDetailSchema.safeParse(rawData)
    if (!parsed.success) {
      logger.error({ source: 'legislature-api', err: parsed.error }, 'Legislature API bill detail response shape changed')
      throw createAppError(
        'legislature-api',
        'Utah Legislature API returned an unexpected bill detail format',
        'This is a system error — please try again later',
      )
    }

    return {
      id: parsed.data.billNumber,
      session: parsed.data.sessionID,
      title: parsed.data.shortTitle,
      summary: parsed.data.generalProvisions,
      status: parsed.data.lastAction,
      sponsorId: parsed.data.primeSponsor,
      ...(parsed.data.floorSponsor !== undefined && { floorSponsorId: parsed.data.floorSponsor }),
      ...(parsed.data.highlightedProvisions !== undefined && { fullText: parsed.data.highlightedProvisions }),
      ...(parsed.data.voteResult !== undefined && { voteResult: parsed.data.voteResult }),
      ...(parsed.data.voteDate !== undefined && { voteDate: parsed.data.voteDate }),
    }
  }
}

/**
 * Returns the current legislative session identifier (e.g. '2025GS' for General Session).
 * Utah legislative sessions run January–March. Outside session, returns the most recent session.
 * Full inter-session logic is implemented in Story 3.4 (cache/bills.ts).
 * This is a minimal implementation sufficient for Story 2.2.
 */
function getCurrentSession(): string {
  const now = new Date()
  const year = now.getFullYear()
  // Utah General Session: January–March (months 0–2 in JS Date)
  // If within session, use current year; otherwise use previous year's completed session
  const sessionYear = now.getMonth() < 3 ? year : year - 1
  return `${sessionYear}GS`
}
