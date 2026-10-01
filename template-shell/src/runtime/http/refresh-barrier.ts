/**
 * Refresh barrier paired with SSO ensureAccessToken / requestRefreshToken.
 * Ensures awaiters observe "token written" or "refresh failed", not an intermediate state.
 */
const REFRESH_TIMEOUT_MS = 30_000

let pending: {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
} | null = null

export const refreshBarrier = {
  waitForRefresh(): Promise<void> {
    if (pending) return pending.promise

    let resolve!: () => void
    let reject!: (error: Error) => void
    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })

    const timer = setTimeout(() => {
      if (!pending || pending.promise !== promise) return
      const error = new Error('TOKEN_REFRESH_TIMEOUT')
      pending = null
      reject(error)
    }, REFRESH_TIMEOUT_MS)

    pending = { promise, resolve, reject, timer }
    return promise
  },

  resolveRefresh(): void {
    if (!pending) return
    clearTimeout(pending.timer)
    const { resolve } = pending
    pending = null
    resolve()
  },

  rejectRefresh(error: Error): void {
    if (!pending) return
    clearTimeout(pending.timer)
    const { reject } = pending
    pending = null
    reject(error)
  },
}
