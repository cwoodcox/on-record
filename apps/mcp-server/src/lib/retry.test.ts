// apps/mcp-server/src/lib/retry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithDelay } from './retry.js'

describe('retryWithDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns result on first try when fn succeeds immediately', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const promise = retryWithDelay(fn, 2, 1000)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on first failure and succeeds on 2nd attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('success')

    const promise = retryWithDelay(fn, 2, 1000)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on two failures and succeeds on 3rd attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient 1'))
      .mockRejectedValueOnce(new Error('transient 2'))
      .mockResolvedValue('success')

    const promise = retryWithDelay(fn, 2, 1000)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws the last error when all attempts are exhausted', async () => {
    const finalError = new Error('permanent failure')
    const fn = vi.fn().mockRejectedValue(finalError)

    const promise = retryWithDelay(fn, 2, 1000)
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('permanent failure')
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('uses 1× delay on first retry and 3× delay on second retry', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    const promise = retryWithDelay(fn, 2, 1000)
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow()

    // First retry delay: 1000 × 1 = 1000ms
    // Second retry delay: 1000 × 3 = 3000ms
    const delays = setTimeoutSpy.mock.calls.map((call) => call[1])
    expect(delays).toContain(1000)
    expect(delays).toContain(3000)
  })
})
