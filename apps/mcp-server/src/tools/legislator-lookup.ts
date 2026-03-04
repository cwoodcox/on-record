// apps/mcp-server/src/tools/legislator-lookup.ts
// MCP tool: lookup_legislator — geocodes a Utah address to legislative districts,
// then reads legislator data from the SQLite cache.
// Boundary 3: UGRC GIS direct HTTP, no abstraction layer.
// Boundary 4: only cache/ imports better-sqlite3 — this file must not import it.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { retryWithDelay } from '../lib/retry.js'
import { logger } from '../lib/logger.js'
import { getEnv } from '../env.js'
import { createAppError, isAppError } from '@on-record/types'
import type { AppError, LookupLegislatorResult } from '@on-record/types'
import { getLegislatorsByDistrict } from '../cache/legislators.js'

// ── Error classification constants ───────────────────────────────────────────

/** Detects P.O. Box addresses before making the GIS call (saves latency). */
const PO_BOX_PATTERN = /^p\.?o\.?\s*box\b/i

// ── Address parsing ──────────────────────────────────────────────────────────

/**
 * Splits a full address into street and zone.
 * Splits on the last comma; falls back to last whitespace-delimited token as zone.
 */
function parseAddress(address: string): { street: string; zone: string } {
  const lastComma = address.lastIndexOf(',')
  if (lastComma !== -1) {
    return {
      street: address.slice(0, lastComma).trim(),
      zone: address.slice(lastComma + 1).trim(),
    }
  }
  // Fallback: last whitespace-delimited token is zone
  const parts = address.trim().split(/\s+/)
  const zone = parts.pop() ?? ''
  return { street: parts.join(' '), zone }
}

// ── UGRC GIS geocoding ───────────────────────────────────────────────────────

type GeocodeResponse = {
  status: number
  result?: { location: { x: number; y: number }; score: number }
}

type DistrictResponse = { result: Array<{ attributes: { DIST: string } }> }

/**
 * Geocodes a Utah address to House and Senate district numbers via UGRC GIS API.
 * Phase 1: geocode address → lat/lng coordinates.
 * Phase 2: two parallel district point-in-polygon lookups.
 *
 * Returns:
 *   - `{ houseDistrict, senateDistrict }` on success
 *   - `AppError` for semantic failures (unresolvable address, out-of-state) — callers
 *     must NOT retry these (they are permanent, not transient).
 *   - Throws an `AppError` for transient/network failures — callers SHOULD retry.
 *
 * @param address - Full Utah street address
 */
async function ugrcGeocode(
  address: string,
): Promise<{ houseDistrict: number; senateDistrict: number } | AppError> {
  const env = getEnv()
  const { street, zone } = parseAddress(address)

  // Phase 1: Geocode address → coordinates
  const geocodeUrl =
    `https://api.mapserv.utah.gov/api/v1/geocode/` +
    `${encodeURIComponent(street)}/${encodeURIComponent(zone)}` +
    `?apiKey=${env.UGRC_API_KEY}&spatialReference=4326`

  const geocodeRes = await fetch(geocodeUrl)
  if (!geocodeRes.ok) {
    // Transient HTTP failure — throw so retryWithDelay can retry
    throw createAppError(
      'gis-api',
      `GIS geocoding request failed (HTTP ${geocodeRes.status})`,
      'Try again in a moment',
    )
  }

  const geocodeData = (await geocodeRes.json()) as GeocodeResponse

  if (!geocodeData.result || geocodeData.result.score < 70) {
    // Semantic failure — unresolvable address; return AppError (do not retry)
    return createAppError(
      'gis-api',
      'Could not resolve that address to a legislative district',
      'Try a nearby street address or check that your ZIP code is correct',
    )
  }
  const { x, y } = geocodeData.result.location

  // Phase 2: District lookups (parallel)
  const base = 'https://api.mapserv.utah.gov/api/v1/search'
  const params = `geometry=point:${x},${y}&spatialReference=4326&apiKey=${env.UGRC_API_KEY}`

  const [houseRes, senateRes] = await Promise.all([
    fetch(`${base}/political.state_house_districts/attributes?${params}`),
    fetch(`${base}/political.state_senate_districts/attributes?${params}`),
  ])

  if (!houseRes.ok || !senateRes.ok) {
    // Transient HTTP failure — throw so retryWithDelay can retry
    throw createAppError(
      'gis-api',
      'District lookup request failed',
      'Try again in a moment',
    )
  }

  const [houseData, senateData] = (await Promise.all([
    houseRes.json(),
    senateRes.json(),
  ])) as [DistrictResponse, DistrictResponse]

  const houseDistrict = parseInt(houseData.result[0]?.attributes.DIST ?? '', 10)
  const senateDistrict = parseInt(senateData.result[0]?.attributes.DIST ?? '', 10)

  if (isNaN(houseDistrict) || isNaN(senateDistrict)) {
    // Semantic failure — out-of-state or no district; return AppError (do not retry)
    return createAppError(
      'gis-api',
      'That address appears to be outside Utah',
      'Enter a Utah street address to find your state legislators',
    )
  }

  return { houseDistrict, senateDistrict }
}

// ── Tool registration ────────────────────────────────────────────────────────

/**
 * Registers the `lookup_legislator` MCP tool on the given McpServer instance.
 * Call once per McpServer (inside the new-session else branch in index.ts).
 *
 * @param server - McpServer instance to register the tool on
 */
export function registerLookupLegislatorTool(server: McpServer): void {
  server.tool(
    'lookup_legislator',
    "Identifies a constituent's Utah House and Senate legislators from their home address via GIS lookup. Returns structured JSON with legislator name, chamber, district, email, and phone contact information.",
    {
      address: z
        .string()
        .min(1)
        .describe(
          'Full Utah street address including street number, street name, and city or ZIP code. Example: "123 S State St, Salt Lake City, UT 84111"',
        ),
    },
    async ({ address }) => {
      // 0. P.O. Box pre-check — detect before making the GIS call (saves latency) (FR37)
      if (PO_BOX_PATTERN.test(address.trim())) {
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', errorType: 'po-box' },
          'P.O. Box address submitted — cannot geocode',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'gis-api',
                  'P.O. Box addresses cannot be geocoded to a legislative district',
                  'Use your street address (e.g., 123 Main St) rather than a P.O. Box',
                ),
              ),
            },
          ],
        }
      }

      // 1. GIS lookup with retry — retryWithDelay(fn, 2, 1000) = 3 total attempts (FR36)
      //    Only transient failures (network/HTTP errors) are retried.
      //    Semantic failures (out-of-state, unresolvable) are returned directly (not thrown).
      let geocodeResult: { houseDistrict: number; senateDistrict: number } | AppError
      try {
        geocodeResult = await retryWithDelay(() => ugrcGeocode(address), 2, 1000)
      } catch (err) {
        // Transient failure after all retries exhausted.
        // Always return the user-friendly message — internal AppErrors thrown from
        // ugrcGeocode are retry-signaling artifacts and must NOT be forwarded to
        // the user (they contain technical HTTP status codes, not UX copy).
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', err },
          'GIS lookup failed after retries',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'gis-api',
                  'Address lookup service is temporarily unavailable',
                  'Wait a moment and try again',
                ),
              ),
            },
          ],
        }
      }

      // 1a. Semantic GIS failure — returned (not thrown) to bypass retry
      if (isAppError(geocodeResult)) {
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', nature: geocodeResult.nature },
          'GIS lookup returned semantic error',
        )
        return { content: [{ type: 'text', text: JSON.stringify(geocodeResult) }] }
      }

      logger.debug({ source: 'gis-api', address: '[REDACTED]' }, 'GIS lookup succeeded')
      const districts = geocodeResult

      // 2. Read from cache — empty array means cache miss
      const houseLegislators = getLegislatorsByDistrict('house', districts.houseDistrict)
      const senateLegislators = getLegislatorsByDistrict('senate', districts.senateDistrict)
      const legislators = [...houseLegislators, ...senateLegislators]

      // 3. Cache miss — no legislators found for resolved districts
      if (legislators.length === 0) {
        logger.error(
          {
            source: 'cache',
            address: '[REDACTED]',
            houseDistrict: districts.houseDistrict,
            senateDistrict: districts.senateDistrict,
          },
          'No legislators found for resolved districts',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'cache',
                  'No legislators found for resolved districts',
                  'Verify your address is in Utah and try again',
                ),
              ),
            },
          ],
        }
      }

      // 4. Build response — resolvedAddress IS in MCP JSON, NEVER in logs
      const result: LookupLegislatorResult = {
        legislators,
        session: legislators[0]!.session,
        resolvedAddress: address,
      }

      logger.info(
        { source: 'mcp-tool', address: '[REDACTED]', legislatorCount: legislators.length },
        'lookup_legislator succeeded',
      )

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )
}
