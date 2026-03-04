// apps/mcp-server/src/lib/retry.ts

/**
 * Retries an async function up to `attempts` times with increasing delay.
 *
 * Delay schedule:
 *   Attempt 1 (first retry): delayMs × 1
 *   Attempt 2 (second retry): delayMs × 3
 *
 * Example: retryWithDelay(fn, 2, 1000) → delays of 1000ms, 3000ms
 * This matches FR36: "retrying at least 2 times with increasing delay between retries"
 * and the total window ≤10 seconds requirement (1s + 3s + fn execution time).
 *
 * Pass `shouldRetry` to bail immediately on non-retryable errors (e.g. 400/404).
 * Defaults to retrying all errors.
 *
 * The caller is responsible for logging — this utility does not log anything.
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!shouldRetry(err)) throw err
      if (attempt < attempts) {
        // Delay multipliers: 1st retry = 1×, all subsequent retries = 3×
        const multiplier = attempt === 0 ? 1 : 3
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs * multiplier))
      }
    }
  }

  throw lastError
}
