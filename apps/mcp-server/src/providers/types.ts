// apps/mcp-server/src/providers/types.ts
import type { Legislator, Bill, BillDetail } from '@on-record/types'

/**
 * LegislatureDataProvider — abstraction over all legislative data sources.
 *
 * All bill and legislator data access goes through this interface.
 * Swapping to a mock, OpenStates, or LegiScan provider requires zero changes
 * to the MCP tool's public interface (NFR14).
 *
 * Architecture: _bmad-output/planning-artifacts/architecture.md
 */
export interface LegislatureDataProvider {
  getLegislatorsByDistrict(chamber: 'house' | 'senate', district: number): Promise<Legislator[]>
  getBillsBySession(session: string): Promise<Bill[]>
  getBillDetail(billId: string, session: string): Promise<BillDetail>
}
