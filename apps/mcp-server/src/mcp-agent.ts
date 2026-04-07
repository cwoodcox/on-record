// apps/mcp-server/src/mcp-agent.ts
// Cloudflare Agents SDK MCP transport — Durable Objects-backed.
// Replaces WebStandardStreamableHTTPServerTransport for stable SSE connections.
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerLookupLegislatorTool } from './tools/legislator-lookup.js'
import { registerResolveAddressTool } from './tools/resolve-address.js'
import { registerSearchBillsTool } from './tools/search-bills.js'

export class OnRecordMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'on-record', version: '1.0.0' })

  async init(): Promise<void> {
    if (!this.env.DB) {
      throw new Error('DB binding missing — check wrangler.toml [[d1_databases]] configuration')
    }
    registerLookupLegislatorTool(this.server, this.env.DB)
    registerResolveAddressTool(this.server, this.env.UGRC_API_KEY)
    registerSearchBillsTool(this.server, this.env.DB)
  }
}
