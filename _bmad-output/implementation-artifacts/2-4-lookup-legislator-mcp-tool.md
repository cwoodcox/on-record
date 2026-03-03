# Story 2.4: `lookup_legislator` MCP Tool

Status: review

## Story

As a **constituent**,
I want to invoke a `lookup_legislator` MCP tool from Claude.ai or ChatGPT,
so that the chatbot can identify my House and Senate legislators and their contact details from my address.

## Acceptance Criteria

1. Given the `lookup_legislator` tool is connected to Claude.ai or ChatGPT, when a valid Utah address is provided as tool input, then the tool returns a structured JSON response matching the `LookupLegislatorResult` type from `packages/types/`
2. The response includes both House and Senate legislators (if found): name, chamber, district, email, phone, phoneLabel (if available), and phoneTypeUnknown: true (if no phone type label from API)
3. Where the API provides no phone type label, the response includes `phoneTypeUnknown: true` on the Legislator record (FR5)
4. The tool response is structured JSON — never a prose string — returned as `content: [{ type: 'text', text: JSON.stringify(result) }]`
5. The tool conforms to the MCP specification version 1.26.0 pinned at development time (NFR13), registered via `server.tool(name, description, schema, handler)`
6. The address is never logged in plain text — always `'[REDACTED]'` in all pino log entries (NFR7)
7. On GIS API failure, an `AppError` is returned as structured JSON with `source: 'gis-api'` and a human-readable `nature` and `action`
8. On legislator cache miss (no legislators found for resolved district), an `AppError` is returned with `source: 'cache'`
9. `retryWithDelay(fn, 2, 1000)` wraps the UGRC GIS API call (1s/3s delay schedule, FR36)
10. `pnpm --filter mcp-server typecheck` exits 0 and `pnpm --filter mcp-server test` exits 0

## Tasks / Subtasks

- [x] Task 1: Create `apps/mcp-server/src/tools/legislator-lookup.ts` (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Import `z` from `'zod'` for input schema definition
  - [x] Import `retryWithDelay` from `'../lib/retry.js'`
  - [x] Import `logger` from `'../lib/logger.js'`
  - [x] Import `getEnv` from `'../env.js'`
  - [x] Import `createAppError`, `isAppError`, `LookupLegislatorResult`, `Legislator` from `'@on-record/types'`
  - [x] Import cache read function `getLegislatorsByDistrict` from `'../cache/legislators.js'` (implemented in Task 2)
  - [x] Define `lookupLegislatorInputSchema` using zod: `{ address: z.string().min(1) }`
  - [x] Implement `parseAddress(address: string): { street: string; zone: string }` — private helper splitting on last comma; fallback to last whitespace token as zone
  - [x] Implement `ugrcGeocode(address: string): Promise<{ houseDistrict: number; senateDistrict: number }>` — private async function
    - [x] Phase 1: geocode via `GET https://api.mapserv.utah.gov/api/v1/geocode/{street}/{zone}?apiKey={UGRC_API_KEY}&spatialReference=4326`
    - [x] Parse `result.location.x` (lng) and `result.location.y` (lat); treat `score < 70` as failure
    - [x] Phase 2: SGID district lookups in parallel via `Promise.all`
      - [x] `GET .../search/political.state_house_districts/attributes?geometry=point:[x],[y]&spatialReference=4326&apiKey=...`
      - [x] `GET .../search/political.state_senate_districts/attributes?geometry=point:[x],[y]&spatialReference=4326&apiKey=...`
    - [x] Parse district: `parseInt(result[0].attributes.DIST, 10)`; throw on `isNaN` result
    - [x] Throw `createAppError('gis-api', ...)` on any HTTP error, parse failure, or low geocode score
    - [x] Log failures as `logger.error({ source: 'gis-api', address: '[REDACTED]', err }, '...')`
  - [x] Implement `registerLookupLegislatorTool(server: McpServer): void` — exported named function
    - [x] Call `server.tool('lookup_legislator', description, schema, handler)`
    - [x] Handler wraps UGRC call with `retryWithDelay(() => ugrcGeocode(address), 2, 1000)`
    - [x] On retry success: `logger.debug({ source: 'gis-api', address: '[REDACTED]' }, 'GIS lookup succeeded')`
    - [x] On retry exhaustion: `logger.error({ source: 'gis-api', address: '[REDACTED]', err }, 'GIS lookup failed after retries')`, return AppError JSON (preserve upstream AppError via `isAppError` check)
    - [x] Call `getLegislatorsByDistrict('house', houseDistrict)` and `getLegislatorsByDistrict('senate', senateDistrict)`
    - [x] Merge into `LookupLegislatorResult`: `legislators`, `session` (from first result), `resolvedAddress: address`
    - [x] If both arrays empty: return `createAppError('cache', 'No legislators found for resolved districts', 'Verify your address is in Utah and try again')` as JSON
    - [x] Success: `logger.info({ source: 'mcp-tool', address: '[REDACTED]', legislatorCount }, 'lookup_legislator succeeded')`
    - [x] Return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }` on success
    - [x] Return `{ content: [{ type: 'text', text: JSON.stringify(appError) }] }` on any error path
  - [x] Named export only — no default export
  - [x] No barrel file — caller imports directly from `'./tools/legislator-lookup.js'`

- [x] Task 2: Create `apps/mcp-server/src/cache/legislators.ts` (AC: 2, 3, 8)
  - [x] Import `db` from `'./db.js'` (only `cache/` modules import better-sqlite3 — Boundary 4)
  - [x] Import `Legislator` from `'@on-record/types'`
  - [x] Define `LegislatorRow` interface with snake_case column names matching the SQLite schema
  - [x] Implement `getLegislatorsByDistrict(chamber: 'house' | 'senate', district: number): Legislator[]`
    - [x] `SELECT id, chamber, district, name, email, phone, phone_label, session FROM legislators WHERE chamber = ? AND district = ?`
    - [x] Map `phone_label` (TEXT, nullable) → `phoneLabel?: string`
    - [x] If `phone_label` is null/empty: set `phoneTypeUnknown: true` (FR5); otherwise set `phoneLabel: row.phone_label`
    - [x] Return `Legislator[]` — empty array on cache miss
    - [x] No `console.log`
  - [x] Implement `upsertLegislators(legislators: Legislator[]): void`
    - [x] `INSERT OR REPLACE INTO legislators (id, chamber, district, name, email, phone, phone_label, session, cached_at) VALUES (...)`
    - [x] Map `phoneLabel` → `phone_label`; `undefined` → `null` for SQLite
    - [x] `cached_at` = `new Date().toISOString()`
    - [x] Wrap all rows in a single transaction for atomicity
  - [x] Both functions are named exports

- [x] Task 3: Register the tool in `apps/mcp-server/src/index.ts` (AC: 5)
  - [x] Add import: `import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'`
  - [x] Call `registerLookupLegislatorTool(server)` between `new McpServer(...)` and `server.connect(transport)` in the `else` branch
  - [x] Remove the placeholder comment at lines 100–101: `// Tools are registered in Stories 2.4 (lookup_legislator) and 3.5 (search_bills).`
  - [x] Keep a comment noting search_bills will be registered in Story 3.5

- [x] Task 4: Write `apps/mcp-server/src/tools/legislator-lookup.test.ts` (AC: 10)
  - [x] `vi.mock('../cache/legislators.js', ...)` — never import better-sqlite3 in tool tests
  - [x] `vi.mock('../lib/logger.js', ...)` — mock logger to verify '[REDACTED]' invariant
  - [x] `vi.stubGlobal('fetch', mockFetch)` — no real HTTP calls in unit tests
  - [x] Test: valid address → UGRC returns districts → cache returns legislators → response JSON matches `LookupLegislatorResult`
  - [x] Test: UGRC geocode failure → retry exhausted → response JSON matches `AppError` with `source: 'gis-api'`
  - [x] Test: UGRC success but no legislators in cache → response JSON matches `AppError` with `source: 'cache'`
  - [x] Test: address redaction — logger mock calls never contain the actual address string; all contain `'[REDACTED]'`
  - [x] Test: `phoneTypeUnknown: true` set when `getLegislatorsByDistrict` returns a legislator with no phoneLabel
  - [x] Test: retry timing — use `vi.useFakeTimers()` + `vi.runAllTimersAsync()` to avoid real delays
  - [x] Co-locate at `apps/mcp-server/src/tools/legislator-lookup.test.ts`

- [x] Task 5: Write `apps/mcp-server/src/cache/legislators.test.ts` (AC: 10)
  - [x] Create in-memory SQLite DB and call `initializeSchema` before test suite
  - [x] `vi.mock('./db.js', () => ({ db: testDb }))` to inject test database
  - [x] Import functions under test after mock registration (dynamic import or ensure mock hoisting)
  - [x] Test: `upsertLegislators` then `getLegislatorsByDistrict` returns correct data
  - [x] Test: camelCase ↔ snake_case field mapping round-trips correctly
  - [x] Test: `phone_label = null` in DB → `phoneTypeUnknown: true` in returned `Legislator`
  - [x] Test: `phone_label = 'cell'` in DB → `{ phoneLabel: 'cell' }` (no `phoneTypeUnknown` field)
  - [x] Test: district with no cached legislators → `getLegislatorsByDistrict` returns `[]`
  - [x] Test: `upsertLegislators` with empty array → no rows inserted, no error thrown

- [x] Task 6: Final verification (AC: 10)
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server test` — all tests pass
  - [x] `pnpm --filter mcp-server lint` — zero ESLint violations, no `console.log`
  - [x] Confirm no `better-sqlite3` import in `tools/legislator-lookup.ts`
  - [x] Confirm `resolvedAddress` is in the MCP JSON response and `'[REDACTED]'` is in all log context objects
  - [x] Confirm no `tools/index.ts` barrel file created

## Dev Notes

### Scope — What Story 2.4 IS and IS NOT

**Story 2.4 creates:**
- `apps/mcp-server/src/tools/legislator-lookup.ts` — MCP tool with UGRC geocoding + cache read
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — unit tests (mocked cache, mocked fetch, mocked logger)
- `apps/mcp-server/src/cache/legislators.ts` — SQLite read/write for legislators table
- `apps/mcp-server/src/cache/legislators.test.ts` — cache layer tests (in-memory SQLite)
- Modifies `apps/mcp-server/src/index.ts` — registers the tool with the McpServer instance

**NOT in Story 2.4:**
- `LegislatureDataProvider` interface (`providers/types.ts`) — created in Story 2.2; do not redefine
- Legislator cache warm-up and daily cron refresh — implemented in Story 2.3; `upsertLegislators` is needed here as the write half (add it if Story 2.3 did not already implement it in `cache/legislators.ts`)
- Story 2.5 handles address error handling UI (`ErrorBanner`) — out of scope
- Story 2.6 handles `LegislatorCard` UI component — out of scope

**DEPENDENCY NOTE:** Stories 2.1, 2.2, and 2.3 must be fully implemented before this story. Verify:
- `apps/mcp-server/src/providers/types.ts` exists with `LegislatureDataProvider` interface (Story 2.2)
- `apps/mcp-server/src/cache/` has the warm-up and cron scheduler (Story 2.3)
- `legislators` table is being populated on server startup (Story 2.3)

### UGRC GIS API Integration

Two sequential phases — both use `getEnv().UGRC_API_KEY`.

**Phase 1: Geocode address to coordinates**

```
GET https://api.mapserv.utah.gov/api/v1/geocode/{street}/{zone}?apiKey={key}&spatialReference=4326
```

Address parsing:
```typescript
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
```

Expected response:
```json
{
  "status": 200,
  "result": {
    "location": { "x": -111.891, "y": 40.760 },
    "score": 90.5,
    "matchAddress": "123 S STATE ST, SALT LAKE CITY"
  }
}
```

Throw `createAppError('gis-api', 'Address could not be precisely geocoded', 'Use a complete street address including city or ZIP code')` when `score < 70` or `result` is absent.

**Phase 2: District lookups (parallel)**

```
GET https://api.mapserv.utah.gov/api/v1/search/political.state_house_districts/attributes?geometry=point:[x],[y]&spatialReference=4326&apiKey={key}
GET https://api.mapserv.utah.gov/api/v1/search/political.state_senate_districts/attributes?geometry=point:[x],[y]&spatialReference=4326&apiKey={key}
```

Note: `x` is longitude, `y` is latitude in UGRC coordinates. The `geometry=point:[x],[y]` parameter uses the values from the geocode response directly.

Expected response:
```json
{ "result": [{ "attributes": { "DIST": "29" } }] }
```

Parse: `parseInt(data.result[0]?.attributes.DIST ?? '', 10)`. Throw `createAppError('gis-api', 'Address is not within a Utah legislative district', 'Verify the address is a Utah street address, not a P.O. Box or out-of-state address')` when `isNaN(district)` or result array is empty.

**Full `ugrcGeocode` function:**

```typescript
async function ugrcGeocode(
  address: string,
): Promise<{ houseDistrict: number; senateDistrict: number }> {
  const env = getEnv()
  const { street, zone } = parseAddress(address)

  // Phase 1: Geocode
  const geocodeUrl =
    `https://api.mapserv.utah.gov/api/v1/geocode/` +
    `${encodeURIComponent(street)}/${encodeURIComponent(zone)}` +
    `?apiKey=${env.UGRC_API_KEY}&spatialReference=4326`

  const geocodeRes = await fetch(geocodeUrl)
  if (!geocodeRes.ok) {
    throw createAppError(
      'gis-api',
      `GIS geocoding request failed (HTTP ${geocodeRes.status})`,
      'Try again in a moment',
    )
  }

  type GeocodeResponse = {
    status: number
    result?: { location: { x: number; y: number }; score: number }
  }
  const geocodeData = (await geocodeRes.json()) as GeocodeResponse

  if (!geocodeData.result || geocodeData.result.score < 70) {
    throw createAppError(
      'gis-api',
      'Address could not be precisely geocoded',
      'Use a complete street address including city or ZIP code',
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
    throw createAppError(
      'gis-api',
      'District lookup request failed',
      'Try again in a moment',
    )
  }

  type DistrictResponse = { result: Array<{ attributes: { DIST: string } }> }
  const [houseData, senateData] = (await Promise.all([
    houseRes.json(),
    senateRes.json(),
  ])) as [DistrictResponse, DistrictResponse]

  const houseDistrict = parseInt(houseData.result[0]?.attributes.DIST ?? '', 10)
  const senateDistrict = parseInt(senateData.result[0]?.attributes.DIST ?? '', 10)

  if (isNaN(houseDistrict) || isNaN(senateDistrict)) {
    throw createAppError(
      'gis-api',
      'Address is not within a Utah legislative district',
      'Verify the address is a Utah street address, not a P.O. Box or out-of-state address',
    )
  }

  return { houseDistrict, senateDistrict }
}
```

### Tool Registration Pattern (MCP SDK v1.26.0)

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

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
      // 1. GIS lookup with retry
      let districts: { houseDistrict: number; senateDistrict: number }
      try {
        districts = await retryWithDelay(() => ugrcGeocode(address), 2, 1000)
        logger.debug({ source: 'gis-api', address: '[REDACTED]' }, 'GIS lookup succeeded')
      } catch (err) {
        logger.error(
          { source: 'gis-api', address: '[REDACTED]', err },
          'GIS lookup failed after retries',
        )
        const appError = isAppError(err)
          ? err
          : createAppError(
              'gis-api',
              'Address could not be resolved to a Utah legislative district',
              'Verify the address is a valid Utah street address and try again',
            )
        return { content: [{ type: 'text', text: JSON.stringify(appError) }] }
      }

      // 2. Read from cache
      const houseLegislators = getLegislatorsByDistrict('house', districts.houseDistrict)
      const senateLegislators = getLegislatorsByDistrict('senate', districts.senateDistrict)
      const legislators = [...houseLegislators, ...senateLegislators]

      // 3. Cache miss
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
          content: [{
            type: 'text',
            text: JSON.stringify(
              createAppError(
                'cache',
                'No legislators found for resolved districts',
                'Verify your address is in Utah and try again',
              ),
            ),
          }],
        }
      }

      // 4. Build response — resolvedAddress IS in MCP JSON, NEVER in logs
      const result: LookupLegislatorResult = {
        legislators,
        session: legislators[0].session,
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
```

**Registration in `index.ts`** — inside the `else` branch for new sessions:

```typescript
const server = new McpServer({ name: 'on-record', version: '1.0.0' })

registerLookupLegislatorTool(server) // ← Story 2.4
// registerSearchBillsTool(server)    // ← Story 3.5 (add here when ready)

// @ts-expect-error -- StreamableHTTPServerTransport.onclose typing conflict with SDK
await server.connect(transport)
```

### `cache/legislators.ts` Implementation

```typescript
// apps/mcp-server/src/cache/legislators.ts
import { db } from './db.js'
import type { Legislator } from '@on-record/types'

interface LegislatorRow {
  id: string
  chamber: string
  district: number
  name: string
  email: string
  phone: string
  phone_label: string | null
  session: string
}

/**
 * Reads legislators from the SQLite cache for a specific chamber and district.
 * Returns an empty array on cache miss — the tool handler treats this as an error.
 */
export function getLegislatorsByDistrict(
  chamber: 'house' | 'senate',
  district: number,
): Legislator[] {
  const rows = db
    .prepare<[string, number], LegislatorRow>(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE chamber = ? AND district = ?`,
    )
    .all(chamber, district)

  return rows.map((row): Legislator => ({
    id: row.id,
    chamber: row.chamber as 'house' | 'senate',
    district: row.district,
    name: row.name,
    email: row.email,
    phone: row.phone,
    ...(row.phone_label
      ? { phoneLabel: row.phone_label }
      : { phoneTypeUnknown: true as const }),
    session: row.session,
  }))
}

/**
 * Upserts legislators into the SQLite cache.
 * Called by cache warm-up on server startup and daily cron refresh (Story 2.3).
 */
export function upsertLegislators(legislators: Legislator[]): void {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO legislators
       (id, chamber, district, name, email, phone, phone_label, session, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const cachedAt = new Date().toISOString()

  db.transaction(() => {
    for (const leg of legislators) {
      stmt.run(
        leg.id,
        leg.chamber,
        leg.district,
        leg.name,
        leg.email,
        leg.phone,
        leg.phoneLabel ?? null,
        leg.session,
        cachedAt,
      )
    }
  })()
}
```

Key mapping rules:
- SQLite `phone_label` (TEXT, nullable) ↔ TypeScript `phoneLabel?: string`
- Absent `phone_label` → `phoneTypeUnknown: true` (FR5); present → `phoneLabel: string`
- `cached_at` always ISO 8601 string (`new Date().toISOString()`)
- No `console.log` — ESLint blocks it

### Test Patterns

**Tool unit tests — all dependencies mocked:**

```typescript
// apps/mcp-server/src/tools/legislator-lookup.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../cache/legislators.js', () => ({
  getLegislatorsByDistrict: vi.fn(),
}))

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
```

Address redaction assertion:
```typescript
// After tool invocation, verify no logger call received the real address:
import { logger } from '../lib/logger.js'
const allLogArgs = [
  ...vi.mocked(logger.info).mock.calls,
  ...vi.mocked(logger.error).mock.calls,
  ...vi.mocked(logger.debug).mock.calls,
]
for (const [context] of allLogArgs) {
  expect(JSON.stringify(context)).not.toContain('123 S State St')
  expect(JSON.stringify(context)).toContain('[REDACTED]')
}
```

Retry timing — avoid real delays:
```typescript
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

it('retries on UGRC failure', async () => {
  mockFetch.mockRejectedValueOnce(new Error('network')).mockResolvedValue(/* success */)
  const promise = invokeTool({ address: '123 S State St, SLC' })
  await vi.runAllTimersAsync()
  const result = await promise
  expect(mockFetch).toHaveBeenCalledTimes(/* 2 or 3 */)
})
```

**Cache layer tests — in-memory SQLite is correct:**

```typescript
// apps/mcp-server/src/cache/legislators.test.ts
import Database from 'better-sqlite3'
import { beforeAll, describe, it, expect, vi } from 'vitest'
import { initializeSchema } from './schema.js'

const testDb = new Database(':memory:')
initializeSchema(testDb)

vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered
const { getLegislatorsByDistrict, upsertLegislators } = await import('./legislators.js')
```

Note on dynamic import: Vitest hoists `vi.mock()` calls, so the mock is in place before the module under test is evaluated. The `await import()` pattern ensures the mocked `db` is used.

### Architecture Constraints — Zero Exceptions

1. **No `better-sqlite3` in `tools/`** — `legislator-lookup.ts` must not import `better-sqlite3`. Boundary 4: only `cache/` touches the DB.

2. **No `console.log`** — ESLint `no-console: ['error', { allow: ['error'] }]` blocks it. Use `logger.info`, `logger.debug`, `logger.error`.

3. **Structured JSON MCP response** — always `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`. Never prose.

4. **Address in MCP JSON, never in logs** — `resolvedAddress: address` in `LookupLegislatorResult` is correct. Every `logger.*` call uses `address: '[REDACTED]'`.

5. **No default exports** — named exports only.

6. **No barrel files** — no `tools/index.ts`. Direct import from file path.

7. **`.js` extensions** — `import { retryWithDelay } from '../lib/retry.js'` (NodeNext module resolution).

8. **`strict: true`** — no `any`, explicit return types, `unknown` in catch blocks.

9. **`retryWithDelay` wraps all UGRC calls** — the full `ugrcGeocode` call (both phases) is wrapped. Never inline retry.

10. **Tool registered per session** — `registerLookupLegislatorTool(server)` is called once per `McpServer` instance, inside the `else` branch in `index.ts`.

11. **`isAppError` before re-wrapping** — in the catch block, check `isAppError(err)` to forward the upstream error rather than wrapping it in a generic message.

### File Structure

```
apps/mcp-server/src/
  tools/
    legislator-lookup.ts        ← NEW: registerLookupLegislatorTool(), ugrcGeocode(), parseAddress()
    legislator-lookup.test.ts   ← NEW: unit tests (mocked cache, mocked fetch, mocked logger)
  cache/
    legislators.ts              ← NEW: getLegislatorsByDistrict(), upsertLegislators()
    legislators.test.ts         ← NEW: cache layer tests (in-memory SQLite via vi.mock)
    db.ts                       ← EXISTS (Story 1.3) — no changes
    schema.ts                   ← EXISTS (Story 1.3) — no changes
  index.ts                      ← MODIFIED: import + call registerLookupLegislatorTool(server)
  env.ts                        ← EXISTS — no changes (UGRC_API_KEY already validated)
  lib/
    retry.ts                    ← EXISTS (Story 1.4) — no changes
    logger.ts                   ← EXISTS (Story 1.2) — no changes
```

Alignment with `architecture.md` "Complete Project Directory Structure":
- `tools/legislator-lookup.ts` — exact path specified for FR1–5
- `cache/legislators.ts` — exact path specified
- Test files co-located per Test Co-location Rule

### Previous Story Intelligence

**From Story 1.2 (logger):**
- `logger` is a lazy-init proxy — always `import { logger } from '../lib/logger.js'`
- Every log entry must have `source` field: `logger.info({ source: 'mcp-tool', ... }, 'msg')`
- `.js` extension required on all local imports

**From Story 1.3 (SQLite schema):**
- `legislators` columns: `id TEXT PK`, `chamber TEXT NOT NULL`, `district INTEGER NOT NULL`, `name TEXT NOT NULL`, `email TEXT NOT NULL`, `phone TEXT NOT NULL`, `phone_label TEXT` (nullable), `session TEXT NOT NULL`, `cached_at TEXT NOT NULL`
- `db` singleton from `'./db.js'` with WAL mode enabled
- `initializeSchema` is idempotent — safe to call with in-memory DB in tests

**From Story 1.4 (retry):**
- `retryWithDelay<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T>`
- `retryWithDelay(fn, 2, 1000)` = 3 total attempts, 1s then 3s delays (FR36 ≤10s requirement)
- Fake timers in tests: `vi.useFakeTimers()` + `await vi.runAllTimersAsync()` before awaiting promise

**From `packages/types/index.ts` (Story 1.1, updated 1.4):**
- `LookupLegislatorResult`, `Legislator`, `AppError`, `isAppError`, `createAppError` all exist — do NOT redefine
- `Legislator.phoneTypeUnknown?: boolean` and `Legislator.phoneLabel?: string` already typed correctly
- `LookupLegislatorResult.resolvedAddress: string` comment: "actual address in MCP response; always '[REDACTED]' in logs"

**From `apps/mcp-server/src/index.ts` (current):**
- Lines 100–101 contain: `// Tools are registered in Stories 2.4 (lookup_legislator) and 3.5 (search_bills).` — remove this when registering
- `else` branch location: after `if (sessionId && transports.has(sessionId))` check, starting at line ~78
- `@ts-expect-error` comment on `server.connect(transport)` is intentional — keep it

**From Story 1.5 (CI):**
- CI runs `lint`, `typecheck`, `test` for `mcp-server` on every PR — all must pass clean

### References

- Architecture: MCP Tool Response Format — structured JSON, never prose [Source: `_bmad-output/planning-artifacts/architecture.md` → "Format Patterns" → "MCP Tool Response Format"]
- Architecture: `lookup_legislator` tool location [Source: `architecture.md` → "Requirements to Structure Mapping" → FR1–5 → `tools/legislator-lookup.ts`]
- Architecture: Boundary 3 — UGRC GIS direct HTTP, no abstraction layer [Source: `architecture.md` → "Architectural Boundaries" → "Boundary 3"]
- Architecture: Boundary 4 — better-sqlite3 confined to `cache/` [Source: `architecture.md` → "Architectural Boundaries" → "Boundary 4"]
- Architecture: No `console.log`, pino with `source` field [Source: `architecture.md` → "MCP Server Logging Rule" + "Pino Log Structure"]
- Architecture: `retryWithDelay` mandatory [Source: `architecture.md` → "Process Patterns" → "Retry Utility (FR36)"]
- Architecture: Addresses always `'[REDACTED]'` in logs [Source: `architecture.md` → "Pino Log Structure"]
- Architecture: No barrel files in `tools/` [Source: `architecture.md` → "Structure Patterns"]
- Architecture: Named exports, `.js` extensions [Source: `architecture.md` → "Naming Patterns"]
- Architecture: AppError three-field format [Source: `architecture.md` → "Format Patterns" → "Error Response Format"]
- Architecture: Complete project directory structure [Source: `architecture.md` → "Complete Project Directory Structure"]
- Epics: Story 2.4 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md` → "Story 2.4: lookup_legislator MCP Tool"]
- Epics: FR5 — phone type label / unknown flag [Source: `epics.md` → "FR Coverage Map"]
- Epics: FR25 — `lookup_legislator` invokable from Claude.ai + ChatGPT [Source: `epics.md` → "FR Coverage Map"]
- PRD: NFR2 — GIS lookup <3s [Source: `_bmad-output/planning-artifacts/prd.md` → "NFR2"]
- PRD: NFR7 — no PII in logs [Source: `prd.md` → "NFR7"]
- PRD: NFR13 — MCP spec compliance [Source: `prd.md` → "NFR13"]
- PRD: NFR15 — errors within 3s [Source: `prd.md` → "NFR15"]
- Types: `LookupLegislatorResult`, `Legislator`, `AppError`, `isAppError`, `createAppError` [Source: `packages/types/index.ts`]
- Existing: `index.ts` placeholder comment for tool registration [Source: `apps/mcp-server/src/index.ts` lines 100–101]
- Existing: `env.ts` — `UGRC_API_KEY` already in zod schema [Source: `apps/mcp-server/src/env.ts` lines 19–21]
- Existing: `cache/schema.ts` — `legislators` table columns [Source: `apps/mcp-server/src/cache/schema.ts` lines 9–24]
- Story 1.4 Dev Notes: `retryWithDelay` usage and fake timer test patterns [Source: `_bmad-output/implementation-artifacts/1-4-shared-retry-utility-and-apperror-type.md`]
- Story 1.2: `.js` extension pattern in local imports [Source: `_bmad-output/implementation-artifacts/1-2-mcp-server-with-hono-rate-limiting-and-pino-logging.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all tasks completed without debug log entries.

### Completion Notes List

- Refactored `cache/legislators.ts` from dependency-injection pattern (Story 2.3) to singleton `db` import pattern required by Story 2.4. Added `upsertLegislators()` (singleton-based write) and changed `getLegislatorsByDistrict()` to use the module-level `db` singleton. Updated `refresh.ts` and `index.ts` signatures accordingly.
- Updated `refresh.ts`: removed `db` parameter from `warmUpLegislatorsCache` and `scheduleLegislatorsRefresh` — both now use `upsertLegislators()` which imports the singleton internally.
- Updated `index.ts`: removed `db` argument from warm-up and schedule calls; added `registerLookupLegislatorTool(server)` import and call; removed placeholder comment; kept `// registerSearchBillsTool(server)` for Story 3.5.
- Created `tools/legislator-lookup.ts`: implements `parseAddress()`, `ugrcGeocode()` (two-phase GIS), and `registerLookupLegislatorTool()`. Uses `retryWithDelay(fn, 2, 1000)` for FR36 compliance. All log calls use `address: '[REDACTED]'`. Returns structured JSON on both success and error paths.
- Created `tools/legislator-lookup.test.ts`: 10 tests covering happy path, phoneTypeUnknown, address redaction, gis-api AppError paths, cache miss AppError, retry timing, and isAppError forwarding. All use fake timers to avoid real delays.
- Updated `cache/legislators.test.ts`: rewrote to use `vi.mock('./db.js', ...)` injection pattern; now tests `upsertLegislators` and `getLegislatorsByDistrict` without DI params. Used `beforeAll` + dynamic import to avoid TS1309 top-level await error.
- Updated `cache/refresh.test.ts`: rewrote to use `vi.mock('./db.js', async () => ...)` async factory pattern to avoid TDZ reference error; all tests pass with updated no-param API.
- Final validation: typecheck zero errors, 96 tests pass (11 test files), lint zero violations.

### File List

apps/mcp-server/src/tools/legislator-lookup.ts (NEW)
apps/mcp-server/src/tools/legislator-lookup.test.ts (NEW)
apps/mcp-server/src/cache/legislators.ts (MODIFIED — singleton db pattern, upsertLegislators added, DI params removed)
apps/mcp-server/src/cache/legislators.test.ts (MODIFIED — vi.mock('./db.js') injection, upsertLegislators tests, beforeAll dynamic import)
apps/mcp-server/src/cache/refresh.ts (MODIFIED — removed db param from warmUpLegislatorsCache and scheduleLegislatorsRefresh, uses upsertLegislators)
apps/mcp-server/src/cache/refresh.test.ts (MODIFIED — async vi.mock factory for db, updated call signatures)
apps/mcp-server/src/index.ts (MODIFIED — registerLookupLegislatorTool import + call, updated warm-up/schedule signatures, placeholder comment removed)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-03 | Implemented Story 2.4 — lookup_legislator MCP tool with UGRC geocoding, SQLite cache read/write (upsertLegislators + getLegislatorsByDistrict singleton pattern), tool registration in index.ts, unit tests (10 tool tests, 16 cache tests, 11 refresh tests) | claude-sonnet-4-6 |
