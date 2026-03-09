// apps/mcp-server/src/tools/search-bills.ts
// MCP tool: search_bills — searches bills from the SQLite cache by issue theme.
// Reads from cache via searchBillsByTheme (Boundary 4: no better-sqlite3 import here).
// Wraps the cache read in retryWithDelay for resilience against transient DB errors.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError } from '@on-record/types'
import type { SearchBillsResult } from '@on-record/types'
import { searchBillsByTheme, getActiveSessionId } from '../cache/bills.js'
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
    'Searches bills sponsored by a Utah legislator by issue theme. Returns up to 5 bills from the SQLite cache matching the theme and legislator. Returns structured JSON with bill ID, title, summary, status, vote result, vote date, and session.',
    {
      legislatorId: z
        .string()
        .min(1)
        .describe('Legislator ID from lookup_legislator output (e.g. "RRabbitt")'),
      theme: z
        .string()
        .min(1)
        .describe('Issue theme keyword (e.g. "healthcare", "education", "water", "taxes")'),
    },
    async ({ legislatorId, theme }) => {
      let bills: ReturnType<typeof searchBillsByTheme>

      try {
        bills = await retryWithDelay(
          async () => searchBillsByTheme(legislatorId, theme),
          2,    // 2 retries (3 total attempts: 1 initial + 2 retries)
          1000, // 1s delay then 3s delay (FR36: "at least 2 retries with increasing delay")
        )
      } catch {
        logger.error(
          { source: 'legislature-api', legislatorId },
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

      const result: SearchBillsResult = {
        bills: bills.slice(0, 5),
        legislatorId,
        session: getActiveSessionId(),
      }

      logger.info(
        { source: 'mcp-tool', legislatorId, billCount: result.bills.length, theme },
        'search_bills succeeded',
      )

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )
}
