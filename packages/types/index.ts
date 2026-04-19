// On Record — shared type contracts
// These types define the public API between MCP tools and the LLM system prompt.
// DO NOT rename fields in LookupLegislatorResult or SearchBillsResult without
// also updating system-prompt/agent-instructions.md (Story 4.1).
// SearchBillsResult fields: bills, total, count, offset (legislatorId and session removed in Story 3.7).

// Legislator — returned by lookup_legislator MCP tool (FR4, FR5)
export interface Legislator {
  id: string
  chamber: 'house' | 'senate'
  district: number
  name: string
  email: string
  phone: string
  phoneLabel?: string // API-provided type label (e.g. "cell", "district office")
  phoneTypeUnknown?: boolean // true when API provides no phone type label (FR5)
  session: string
}

// Bill — returned by search_bills MCP tool (FR6, FR7)
export interface Bill {
  id: string
  session: string
  title: string
  summary: string
  status: string
  sponsorId: string
  floorSponsorId?: string // populated from API's floorSponsor field when present (Story 3.7)
  voteResult?: string
  voteDate?: string // ISO 8601 date string: "2024-03-04"
  billUrl?: string // computed from id + session; not stored in DB
}

// BillDetail — used by LegislatureDataProvider.getBillDetail() (Story 2.2)
// Full shape finalized in Story 2.2 when the provider interface is implemented.
export interface BillDetail extends Bill {
  fullText?: string
  subjects?: string[]
}

// AppError — three-field error format for all errors surfaced to users/operators (FR35, FR37)
export interface AppError {
  source: 'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app'
  nature: string // human-readable description of what failed
  action: string // what to try next
}

/**
 * Type guard: returns true if `err` is an AppError (has source, nature, action fields).
 * Use to distinguish AppError from generic Error in catch blocks.
 */
export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'source' in err &&
    'nature' in err &&
    'action' in err
  )
}

/**
 * Factory: creates an AppError with the three required fields.
 * Prefer this over object literals to ensure field completeness.
 */
export function createAppError(
  source: AppError['source'],
  nature: string,
  action: string,
): AppError {
  return { source, nature, action }
}

// MCP Tool Response Contracts — field names are part of the public API.
// Do not rename without updating the system prompt.

export interface LookupLegislatorResult {
  legislators: Legislator[]
  session: string
  resolvedAddress?: string // optional — returned by resolve_address; omitted from lookup_legislator (ID/name/district modes)
}

export interface ResolveAddressResult {
  houseDistrict: number
  senateDistrict: number
  resolvedAddress: string // geocoder's canonical address form; always '[REDACTED]' in logs
}

export interface SearchBillsParams {
  query?: string           // freeform FTS5 full-text search on bill title + summary
  billId?: string          // bill ID match — prefix + numeric value parsed for zero-padding normalization
  sponsorId?: string       // filter to bills with this sponsor_id
  floorSponsorId?: string  // filter to bills where floor_sponsor_id = this value
  session?: string         // filter to a specific session (e.g. "2026GS")
  chamber?: 'house' | 'senate'  // 'house' → id LIKE 'H%'; 'senate' → id LIKE 'S%'
  count?: number           // page size; default 50, max 100
  offset?: number          // pagination offset; default 0
}

export interface SearchBillsResult {
  bills: Bill[]    // page of results
  total: number    // total matching records (for pagination)
  offset: number   // offset used for this page
  count: number    // number of bills returned in this page (= bills.length)
}

// AnalyticsEvent — POST /api/events payload (FR39, Story 7.3)
export interface AnalyticsEvent {
  eventType: 'session_initiated' | 'draft_generated' | 'message_delivered'
  districtId?: string
  timestamp: string // ISO 8601 datetime: "2024-03-04T14:23:00Z"
}
