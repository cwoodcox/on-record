// On Record — shared type contracts
// These types define the public API between MCP tools and the LLM system prompt.
// DO NOT rename fields in LookupLegislatorResult or SearchBillsResult without
// also updating system-prompt/agent-instructions.md (Story 4.1).

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
  voteResult?: string
  voteDate?: string // ISO 8601 date string: "2024-03-04"
}

// BillDetail — used by LegislatureDataProvider.getBillDetail() (Story 2.2)
// Full shape finalized in Story 2.2 when the provider interface is implemented.
export interface BillDetail extends Bill {
  fullText?: string
  subjects?: string[]
}

// AppError — three-field error format for all errors surfaced to users/operators (FR35, FR37)
// Runtime helper (isAppError, createAppError) implemented in Story 1.4.
export interface AppError {
  source: 'gis-api' | 'legislature-api' | 'cache' | 'mcp-tool' | 'app'
  nature: string // human-readable description of what failed
  action: string // what to try next
}

// MCP Tool Response Contracts — field names are part of the public API.
// Do not rename without updating the system prompt.

export interface LookupLegislatorResult {
  legislators: Legislator[]
  session: string
  resolvedAddress: string // actual address in MCP response; always '[REDACTED]' in logs
}

export interface SearchBillsResult {
  bills: Bill[]
  legislatorId: string
  session: string
}

// AnalyticsEvent — POST /api/events payload (FR39, Story 7.3)
export interface AnalyticsEvent {
  eventType: 'session_initiated' | 'draft_generated' | 'message_delivered'
  districtId?: string
  timestamp: string // ISO 8601 datetime: "2024-03-04T14:23:00Z"
}
