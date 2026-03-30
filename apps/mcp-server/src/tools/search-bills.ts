// apps/mcp-server/src/tools/search-bills.ts
// MCP tool: search_bills — searches bills from the SQLite cache with all-optional filters.
// Reads from cache via searchBills (Boundary 4: no better-sqlite3 import here).
// Wraps the cache read in retryWithDelay for resilience against transient DB errors.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError } from '@on-record/types'
import type { SearchBillsParams } from '@on-record/types'
import { searchBills } from '../cache/bills.js'
import { retryWithDelay } from '../lib/retry.js'

/**
 * Registers the `search_bills` MCP tool on the given McpServer instance.
 * Call once per McpServer (inside the new-session else branch in index.ts).
 *
 * @param server - McpServer instance to register the tool on
 */
export function registerSearchBillsTool(server: McpServer): void {
  server.tool(
    'search_bills',
    'Searches the Utah Legislature bill cache. All parameters are optional — omitting all returns all cached bills. Filters compose: providing sponsorId + session returns that legislator\'s bills from that session. Useful for: (1) loading all bills by a known sponsor, (2) finding a specific bill by number, (3) full-text searching across all bills by topic. Returns paginated results with total count.',
    {
      query: z.string().optional().describe(
        'Freeform search term derived from the constituent\'s stated concern — passed directly to FTS5. Do not present this as a menu; infer from conversation context.',
      ),
      billId: z.string().optional().describe(
        'Bill number to look up (e.g. "HB88" or "HB0088") — zero-padding is normalized automatically',
      ),
      sponsorId: z.string().optional().describe(
        'Legislator ID from lookup_legislator output — restricts results to bills this legislator sponsored',
      ),
      floorSponsorId: z.string().optional().describe(
        'Floor sponsor legislator ID — restricts results to bills floor-sponsored by this legislator',
      ),
      session: z.string().optional().describe(
        'Legislative session identifier (e.g. "2026GS") — restricts results to one session',
      ),
      chamber: z.enum(['house', 'senate']).optional().describe(
        'Legislative chamber — narrows to house or senate bills',
      ),
      count: z.number().int().min(1).max(100).optional().describe(
        'Page size (default 50, max 100)',
      ),
      offset: z.number().int().min(0).optional().describe(
        'Pagination offset (default 0)',
      ),
    },
    async (rawParams) => {
      const params = rawParams as SearchBillsParams
      try {
        const result = await retryWithDelay(
          async () => searchBills(params),
          2,    // 2 retries (3 total attempts: 1 initial + 2 retries)
          1000, // 1s delay then 3s delay (FR36: "at least 2 retries with increasing delay")
        )

        // Loggable summary: filter keys that were provided (no PII, no values)
        const loggableSummary = Object.keys(params).filter(
          (k) => params[k as keyof SearchBillsParams] !== undefined,
        )

        logger.info(
          { source: 'mcp-tool', billCount: result.count, filters: loggableSummary },
          'search_bills succeeded',
        )

        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      } catch {
        logger.error(
          { source: 'legislature-api' },
          'search_bills failed after retries',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'legislature-api',
                  'Bill search is temporarily unavailable',
                  'Try again in a few seconds. If the problem persists, the service may be temporarily down.',
                ),
              ),
            },
          ],
        }
      }
    },
  )
}
