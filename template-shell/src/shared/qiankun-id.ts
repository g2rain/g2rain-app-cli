/**
 * Identity helpers for micro-app Tabs / qiankun.
 *
 * - loadMicroApp().name MUST equal vite-plugin-qiankun registration (= applicationCode).
 * - instanceId isolates Tabs; never append it to loadMicroApp name.
 * - DOM ids must not contain `/`, `:`, or `.`.
 */

export function toQiankunSafeId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('qiankun id must be a non-empty string')
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/** Menu view identity from authority menu key (never include linkPath). */
export function microAppViewIdFromMenuKey(menuKey: string): string {
  return toQiankunSafeId(menuKey)
}

/** Runtime instance key: applicationCode:viewId (may contain ':'). */
export function microAppInstanceId(applicationCode: string, viewId: string): string {
  return `${applicationCode.trim()}:${toQiankunSafeId(viewId)}`
}

export function microAppTabId(applicationCode: string, viewId: string): string {
  return `tab:${applicationCode.trim()}:${toQiankunSafeId(viewId)}`
}

/** DOM id / CSS selector fragment derived from instanceId. */
export function microAppContainerId(instanceId: string): string {
  return `sub-app-container-${toQiankunSafeId(instanceId)}`
}

export function microAppContainerSelector(instanceId: string): string {
  return `#${microAppContainerId(instanceId)}`
}
