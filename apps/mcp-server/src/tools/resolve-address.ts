// apps/mcp-server/src/tools/resolve-address.ts
// MCP tool: resolve_address — geocodes a Utah address to House and Senate district numbers.
// Thin wrapper over resolveAddressToDistricts in lib/gis.ts — all retry logic lives there.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { logger } from '../lib/logger.js'
import { createAppError, isAppError } from '@on-record/types'
import type { ResolveAddressResult } from '@on-record/types'
import { resolveAddressToDistricts } from '../lib/gis.js'

/** Detects P.O. Box addresses before making the GIS call (saves latency). */
const PO_BOX_PATTERN = /^p\.?o\.?\s*box\b/i

/**
 * Registers the `resolve_address` MCP tool on the given McpServer instance.
 *
 * @param server - McpServer instance to register the tool on
 * @param apiKey - UGRC GIS API key
 */
export function registerResolveAddressTool(server: McpServer, apiKey: string): void {
  server.tool(
    'resolve_address',
    'Resolves a Utah street address to House and Senate legislative district numbers via GIS lookup. Returns structured JSON with houseDistrict, senateDistrict, and the geocoder\'s canonical form of the input address. Call this only after acknowledging the constituent\'s concern and asking for their address naturally within that conversation — never as a conversation opener. After returning results, look up and present both legislators, and ask which one the constituent wants to write to before proceeding.',
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
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ street, zone }) => {
      // 0. P.O. Box pre-check — detect before making the GIS call (saves latency)
      if (PO_BOX_PATTERN.test(street.trim())) {
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', errorType: 'po-box' },
          'P.O. Box address submitted',
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

      // 1. GIS lookup — resolveAddressToDistricts handles retries internally
      //    Throws AppError for all failures (semantic and transient).
      let gisResult: Awaited<ReturnType<typeof resolveAddressToDistricts>>
      try {
        gisResult = await resolveAddressToDistricts(street, zone, apiKey)
      } catch (err) {
        if (isAppError(err)) {
          return { content: [{ type: 'text', text: JSON.stringify(err) }] }
        }
        throw err
      }

      // 2. Build result — resolvedAddress IS in MCP JSON, NEVER in logs
      const result: ResolveAddressResult = {
        houseDistrict: gisResult.houseDistrict,
        senateDistrict: gisResult.senateDistrict,
        resolvedAddress: gisResult.resolvedAddress,
      }

      logger.info(
        {
          source: 'mcp-tool',
          address: '[REDACTED]',
          houseDistrict: result.houseDistrict,
          senateDistrict: result.senateDistrict,
        },
        'resolve_address succeeded',
      )

      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )
}
