// apps/mcp-server/src/tools/legislator-lookup.ts
// MCP tool: lookup_legislator — resolves a legislator by ID, partial name, or chamber + district.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError } from '@on-record/types'
import type { LookupLegislatorResult, Legislator } from '@on-record/types'
import {
  getLegislatorById,
  getLegislatorsByDistrict,
  getLegislatorsByName,
} from '../cache/legislators.js'

// ── Tool registration ────────────────────────────────────────────────────────

/**
 * Registers the `lookup_legislator` MCP tool on the given McpServer instance.
 *
 * @param server - McpServer instance to register the tool on
 * @param db     - D1Database instance injected from env.DB
 */
export function registerLookupLegislatorTool(server: McpServer, db: D1Database): void {
  server.tool(
    'lookup_legislator',
    'Retrieves legislator contact info by legislator ID (use sponsorId from bill search results), by partial name (when constituent knows their rep by name), or by legislative chamber and district number (use houseDistrict/senateDistrict from resolve_address). Returns structured JSON with legislator name, chamber, district, email, and phone.',
    {
      id: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Exact legislator ID (matches sponsorId on bill search results). Use when resolving a bill sponsor to their contact details.',
        ),
      name: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Partial legislator name (case-insensitive match). Use when the constituent knows their rep by name.',
        ),
      chamber: z
        .enum(['house', 'senate'])
        .optional()
        .describe(
          'Legislative chamber for district lookup — must be provided together with district.',
        ),
      district: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('District number — must be provided together with chamber.'),
    },
    async ({ id, name, chamber, district }) => {
      try {
        // 1. Validate chamber/district pairing before checking for any valid mode
        if (
          (chamber !== undefined && district === undefined) ||
          (district !== undefined && chamber === undefined)
        ) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  createAppError(
                    'mcp-tool',
                    'chamber and district must both be provided for district lookup',
                    'Provide both chamber (e.g. "house" or "senate") and district number together.',
                  ),
                ),
              },
            ],
          }
        }

        // 2. Require at least one complete search mode
        const hasId = id !== undefined
        const hasName = name !== undefined
        const hasDistrict = chamber !== undefined && district !== undefined

        if (!hasId && !hasName && !hasDistrict) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  createAppError(
                    'mcp-tool',
                    'at least one search mode is required: id, name, or chamber + district',
                    'Provide an id, a name, or both chamber and district to search for legislators.',
                  ),
                ),
              },
            ],
          }
        }

        // 3. Collect results — all provided modes run; dedup by id (first occurrence wins)
        const legislators: Legislator[] = []
        const seen = new Set<string>()

        function addLegislators(list: Legislator[]): void {
          for (const leg of list) {
            if (!seen.has(leg.id)) {
              seen.add(leg.id)
              legislators.push(leg)
            }
          }
        }

        if (id !== undefined) {
          const leg = await getLegislatorById(db, id)
          if (leg) addLegislators([leg])
        }

        if (chamber !== undefined && district !== undefined) {
          addLegislators(await getLegislatorsByDistrict(db, chamber, district))
        }

        if (name !== undefined) {
          addLegislators(await getLegislatorsByName(db, name))
        }

        // 4. Cache miss — no legislators found across all modes
        if (legislators.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  createAppError(
                    'cache',
                    'No legislators found matching the provided search criteria',
                    'Verify the legislator ID, name, or district and try again.',
                  ),
                ),
              },
            ],
          }
        }

        // 5. Build result
        const result: LookupLegislatorResult = {
          legislators,
          session: legislators[0]!.session,
        }

        logger.info(
          { source: 'mcp-tool', legislatorCount: legislators.length },
          'lookup_legislator succeeded',
        )

        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      } catch (err) {
        throw err
      }
    },
  )
}
