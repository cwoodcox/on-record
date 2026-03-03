// apps/mcp-server/src/providers/utah-legislature.ts
import { z } from 'zod'
import type { Legislator, Bill, BillDetail } from '@on-record/types'
import { createAppError } from '@on-record/types'
import { getEnv } from '../env.js'
import { retryWithDelay } from '../lib/retry.js'
import { logger } from '../lib/logger.js'
import type { LegislatureDataProvider } from './types.js'

// ── Zod schemas for API response validation ───────────────────────────────────
// These catch API shape changes at the boundary.
// NOTE: The field names below are illustrative based on the architecture doc.
// The actual API field names (id, chamber, phoneLabel, sponsorId, etc.) must be
// verified against the live API. Adjust schemas accordingly and document verified
// field names in the Dev Agent Record.

const apiLegislatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  chamber: z.string(), // 'H' | 'S' or 'house' | 'senate' — verify against API
  district: z.number(),
  email: z.string(),
  phone: z.string(),
  phoneLabel: z.string().optional(), // API-provided label; absent when type unknown (FR5)
})

const apiLegislatorsResponseSchema = z.array(apiLegislatorSchema)

const apiBillSchema = z.object({
  id: z.string(),
  session: z.string(),
  title: z.string(),
  summary: z.string().default(''),
  status: z.string(),
  sponsorId: z.string(), // verify actual field name in API response
  voteResult: z.string().optional(),
  voteDate: z.string().optional(), // ISO 8601 date
})

const apiBillsResponseSchema = z.array(apiBillSchema)

const apiBillDetailSchema = apiBillSchema.extend({
  fullText: z.string().optional(),
  subjects: z.array(z.string()).optional(),
})

// ── Provider Implementation ───────────────────────────────────────────────────

export class UtahLegislatureProvider implements LegislatureDataProvider {
  private readonly apiKey: string
  private readonly baseUrl = 'https://glen.le.utah.gov'

  constructor() {
    // getEnv() is validated at server startup — safe to call here
    this.apiKey = getEnv().UTAH_LEGISLATURE_API_KEY
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async getLegislatorsByDistrict(chamber: 'house' | 'senate', district: number): Promise<Legislator[]> {
    // Map our internal chamber value to whatever the API expects — verify this
    const chamberParam = chamber === 'house' ? 'H' : 'S'
    const url = `${this.baseUrl}/api/v1/legislators?chamber=${chamberParam}&district=${district}`

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url, { headers: this.authHeaders })
        if (!res.ok) {
          throw new Error(`Legislature API responded with HTTP ${res.status}`)
        }
        return res.json() as Promise<unknown>
      }, 2, 1000)
    } catch (err) {
      logger.error({ source: 'legislature-api', err }, 'getLegislatorsByDistrict failed after retries')
      throw createAppError(
        'legislature-api',
        'Failed to fetch legislators from Utah Legislature API',
        'Try again in a few seconds — the API may be temporarily unavailable',
      )
    }

    const parsed = apiLegislatorsResponseSchema.safeParse(rawData)
    if (!parsed.success) {
      logger.error({ source: 'legislature-api', err: parsed.error }, 'Legislature API response shape changed')
      throw createAppError(
        'legislature-api',
        'Utah Legislature API returned an unexpected data format',
        'This is a system error — please try again later',
      )
    }

    const session = getCurrentSession()
    return parsed.data.map((leg) => {
      const base = {
        id: leg.id,
        chamber,
        district: leg.district,
        name: leg.name,
        email: leg.email,
        phone: leg.phone,
        session,
      }
      // FR5: phoneLabel present → set it; absent → set phoneTypeUnknown: true
      if (leg.phoneLabel) {
        return { ...base, phoneLabel: leg.phoneLabel }
      }
      return { ...base, phoneTypeUnknown: true as const }
    })
  }

  async getBillsBySession(session: string): Promise<Bill[]> {
    const url = `${this.baseUrl}/api/v1/bills?session=${encodeURIComponent(session)}`

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url, { headers: this.authHeaders })
        if (!res.ok) {
          throw new Error(`Legislature API responded with HTTP ${res.status}`)
        }
        return res.json() as Promise<unknown>
      }, 2, 1000)
    } catch (err) {
      logger.error({ source: 'legislature-api', err }, 'getBillsBySession failed after retries')
      throw createAppError(
        'legislature-api',
        'Failed to fetch bills from Utah Legislature API',
        'Try again in a few seconds — the API may be temporarily unavailable',
      )
    }

    const parsed = apiBillsResponseSchema.safeParse(rawData)
    if (!parsed.success) {
      logger.error({ source: 'legislature-api', err: parsed.error }, 'Legislature API bills response shape changed')
      throw createAppError(
        'legislature-api',
        'Utah Legislature API returned an unexpected bills data format',
        'This is a system error — please try again later',
      )
    }

    return parsed.data.map((bill) => ({
      id: bill.id,
      session: bill.session,
      title: bill.title,
      summary: bill.summary,
      status: bill.status,
      sponsorId: bill.sponsorId,
      ...(bill.voteResult !== undefined && { voteResult: bill.voteResult }),
      ...(bill.voteDate !== undefined && { voteDate: bill.voteDate }),
    }))
  }

  async getBillDetail(billId: string): Promise<BillDetail> {
    const url = `${this.baseUrl}/api/v1/bills/${encodeURIComponent(billId)}`

    let rawData: unknown
    try {
      rawData = await retryWithDelay(async () => {
        const res = await fetch(url, { headers: this.authHeaders })
        if (!res.ok) {
          throw new Error(`Legislature API responded with HTTP ${res.status}`)
        }
        return res.json() as Promise<unknown>
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
      id: parsed.data.id,
      session: parsed.data.session,
      title: parsed.data.title,
      summary: parsed.data.summary,
      status: parsed.data.status,
      sponsorId: parsed.data.sponsorId,
      ...(parsed.data.voteResult !== undefined && { voteResult: parsed.data.voteResult }),
      ...(parsed.data.voteDate !== undefined && { voteDate: parsed.data.voteDate }),
      ...(parsed.data.fullText !== undefined && { fullText: parsed.data.fullText }),
      ...(parsed.data.subjects !== undefined && { subjects: parsed.data.subjects }),
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
