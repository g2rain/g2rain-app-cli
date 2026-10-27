/**
 * Tracks mounted host identities so Sub→Main messages (e.g. TOKEN_INVALID)
 * can carry instanceId without threading RuntimeContext through SSO/HTTP.
 */

export type HostMessageIdentity = {
  applicationCode: string
  viewId: string
  instanceId: string
}

const mounted = new Map<string, HostMessageIdentity>()

export function registerHostIdentity(identity: HostMessageIdentity): void {
  const instanceId = identity.instanceId.trim()
  const applicationCode = identity.applicationCode.trim()
  const viewId = identity.viewId.trim()
  if (!instanceId || !applicationCode || !viewId) return
  mounted.set(instanceId, { applicationCode, viewId, instanceId })
}

export function unregisterHostIdentity(instanceId: string): void {
  const id = instanceId.trim()
  if (!id) return
  mounted.delete(id)
}

/** Any mounted instance is enough for shared-token refresh targeting. */
export function peekHostIdentity(): HostMessageIdentity | undefined {
  const first = mounted.values().next()
  return first.done ? undefined : first.value
}

/** 是否为本模块当前挂载的实例 */
export function hasHostIdentity(instanceId: string): boolean {
  return mounted.has(instanceId.trim())
}
