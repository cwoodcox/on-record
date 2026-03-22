// apps/mcp-server/src/tools/search-bills.ts
// MCP tool: search_bills — searches bills from the SQLite cache by topic or bill ID.
// Reads from cache via searchBills (Boundary 4: no better-sqlite3 import here).
// Wraps the cache read in retryWithDelay for resilience against transient DB errors.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError } from '@on-record/types'
import type { SearchBillsResult, SearchBillsParams } from '@on-record/types'
import { searchBills, getActiveSessionId } from '../cache/bills.js'
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
    'Search Utah legislative bills by topic or retrieve a specific bill by number. Use `query` for a freeform search term derived from a constituent\'s concern. Use `billId` to look up a bill by its number. Optionally narrow results to a specific legislator\'s sponsored bills with `sponsorId`.',
    {
      query: z.string().optional().describe('Freeform search term derived from the constituent\'s concern or topic of interest'),
      billId: z.string().optional().describe('Exact bill number to look up (e.g. "HB0042")'),
      sponsorId: z.string().optional().describe('Filter results to bills sponsored by this legislator ID'),
      session: z.string().optional().describe('Legislative session identifier (e.g. "2025GS")'),
      limit: z.number().int().positive().max(20).default(5).describe('Maximum number of results to return'),
    },
    async ({ query, billId, sponsorId, session, limit }) => {
      // Validate at-least-one-of at the handler level for structured error response
      if (query === undefined && billId === undefined) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                createAppError(
                  'mcp-tool',
                  'no search criteria provided',
                  'Provide either a query term or a bill ID to search.',
                ),
              ),
            },
          ],
        }
      }

      const params: SearchBillsParams = { limit }
      if (query !== undefined) params.query = query
      if (billId !== undefined) params.billId = billId
      if (sponsorId !== undefined) params.sponsorId = sponsorId
      if (session !== undefined) params.session = session

      try {
        const bills = await retryWithDelay(
          async () => searchBills(params),
          2,    // 2 retries (3 total attempts: 1 initial + 2 retries)
          1000, // 1s delay then 3s delay (FR36: "at least 2 retries with increasing delay")
        )

        // For bill ID lookup: session comes from first returned bill (most recent)
        // For FTS path: session comes from params.session if provided, else getActiveSessionId()
        const resultSession = billId !== undefined
          ? (bills[0]?.session ?? getActiveSessionId())
          : (session ?? getActiveSessionId())

        const result: SearchBillsResult = {
          bills,
          session: resultSession,
        }

        // Only populate legislatorId when sponsorId was provided
        if (sponsorId !== undefined) {
          result.legislatorId = sponsorId
        }

        logger.info(
          { source: 'mcp-tool', billCount: result.bills.length, query, billId, sponsorId },
          'search_bills succeeded',
        )

        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      } catch {
        logger.error(
          { source: 'legislature-api', query, billId, sponsorId },
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
