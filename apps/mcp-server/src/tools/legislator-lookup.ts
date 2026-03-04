// apps/mcp-server/src/tools/legislator-lookup.ts
// MCP tool: lookup_legislator — geocodes a Utah address to legislative districts,
// then reads legislator data from the SQLite cache.
// Boundary 4: only cache/ imports better-sqlite3 — this file must not import it.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError, isAppError } from '@on-record/types'
import type { LookupLegislatorResult } from '@on-record/types'
import { getLegislatorsByDistrict } from '../cache/legislators.js'
import { resolveAddressToDistricts } from '../lib/gis.js'

// ── Error classification constants ───────────────────────────────────────────

/** Detects P.O. Box addresses before making the GIS call (saves latency). */
const PO_BOX_PATTERN = /^p\.?o\.?\s*box\b/i

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
      street: z
        .string()
        .min(1)
        .describe('Street portion only: number and street name. Example: "123 S State St"'),
      zone: z
        .string()
        .min(1)
        .describe('City name or 5-digit ZIP code. Example: "Salt Lake City" or "84111"'),
    },
    async ({ street, zone }) => {
      // 0. P.O. Box pre-check — detect before making the GIS call (saves latency) (FR37)
      if (PO_BOX_PATTERN.test(street.trim())) {
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

      // 1. GIS lookup — resolveAddressToDistricts handles retries internally (FR36)
      //    Throws AppError for all failures (semantic and transient).
      let geocodeResult: Awaited<ReturnType<typeof resolveAddressToDistricts>>
      try {
        geocodeResult = await resolveAddressToDistricts(street, zone)
      } catch (err) {
        if (isAppError(err)) {
          logger.error(
            { source: 'gis-api', address: '[REDACTED]', nature: err.nature },
            'GIS lookup failed',
          )
          return { content: [{ type: 'text', text: JSON.stringify(err) }] }
        }
        // Defensive fallback — resolveAddressToDistricts always wraps failures as AppErrors,
        // so this branch is unreachable in practice. Kept as a safety net.
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', err },
          'Unexpected GIS error',
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
        resolvedAddress: geocodeResult.resolvedAddress,
      }

      logger.info(
        { source: 'mcp-tool', address: '[REDACTED]', legislatorCount: legislators.length },
        'lookup_legislator succeeded',
      )

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )
}
