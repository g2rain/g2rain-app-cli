/** Serialize mount / update / unmount / destroy per instanceId. */
export function createInstanceQueue() {
  const tails = new Map<string, Promise<unknown>>()

  function enqueue<T>(instanceId: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(instanceId) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(task)
    tails.set(
      instanceId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    )
    return next
  }

  function clear(instanceId: string): void {
    tails.delete(instanceId)
  }

  return { enqueue, clear }
}
