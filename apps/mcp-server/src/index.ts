// On Record — MCP Server entry point
// Story 1.1: Placeholder skeleton — confirms TypeScript compiles and process starts.
// Story 1.2 replaces this with: Hono + StreamableHTTPServerTransport + pino + env validation.

// IMPORTANT: console.log is FORBIDDEN in mcp-server (corrupts JSON-RPC stdout stream).
// Use console.error for startup messages until pino is added in Story 1.2.

const port = process.env['PORT'] ?? '3001'

console.error(`[mcp-server] Placeholder — listening on port ${port}`)
console.error('[mcp-server] Story 1.2 will initialize Hono + MCP transport')

// Keep process alive for tsx watch hot-reload
process.stdin.resume()
