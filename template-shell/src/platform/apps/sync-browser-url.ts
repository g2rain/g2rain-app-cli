import type { WorkspaceTab } from '../types/workspace'
import { useRuntimeStore } from '../stores/runtime.store'
import { getContextPath } from '../../shared/env'
import { replaceBrowserPathname, wrapActiveRule } from '../../shared/url'

/**
 * Sync browser address bar to the active Tab (main-shell TabBar semantics).
 * Uses history.replaceState only — does not drive Vue Router.
 */
export function syncBrowserAddressForTab(tab: WorkspaceTab | undefined | null): void {
  if (!tab) return

  if (tab.kind === 'shell') {
    const base = getContextPath().replace(/\/$/, '') || ''
    replaceBrowserPathname(base ? `${base}/` : '/')
    return
  }

  if (tab.kind !== 'micro-app' || !tab.applicationCode) return

  const runtime = useRuntimeStore()
  const definition = runtime.definitions.get(tab.applicationCode)
  if (!definition?.activeRule) {
    console.warn('[syncBrowserAddressForTab] missing activeRule', {
      applicationCode: tab.applicationCode,
      tabId: tab.tabId,
    })
    return
  }

  const lastActivePath = tab.instanceId
    ? runtime.getLastActivePath(tab.instanceId)
    : undefined
  const rawPath = lastActivePath ?? tab.initialRoute
  if (!rawPath) return

  const pathname = wrapActiveRule(definition.activeRule, rawPath)
  replaceBrowserPathname(pathname)
  console.info('[syncBrowserAddressForTab] micro-app', {
    tabId: tab.tabId,
    instanceId: tab.instanceId,
    activeRule: definition.activeRule,
    rawPath,
    pathname,
  })
}
