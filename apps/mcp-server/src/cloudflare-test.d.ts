// Type declarations for cloudflare:test — the virtual module provided by
// @cloudflare/vitest-pool-workers in the workers-pool test environment.
// Included via tsconfig "src/**/*" so that tsc --noEmit can type-check test files.
declare module 'cloudflare:test' {
  export const env: Cloudflare.Env
}
