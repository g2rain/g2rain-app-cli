import { stripActiveRule, replaceBrowserPathname } from '../../shared/url'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'

const ROUTE_CHANGE = 'g2rain:sub-app:route-change'

interface RouteChangeDetail {
  type?: string
  instanceId?: string
  appKey?: string
  data?: {
    appKey?: string
    activeRule?: string
    routePath?: string
    fullPath?: string
  }
}

let started = false

/**
 * Sub → Main route-change: update lastActivePath + browser address bar.
 * Ignores late messages from non-active instances (fast Tab switch).
 */
export function startRouteChangeHandler(): void {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener(ROUTE_CHANGE, ((event: Event) => {
    handleRouteChange(event)
  }) as EventListener)
}

function handleRouteChange(event: Event): void {
  const detail = (event as CustomEvent<RouteChangeDetail>).detail
  if (!detail || typeof detail !== 'object') return

  const fullPath =
    typeof detail.data?.fullPath === 'string' ? detail.data.fullPath.trim() : ''
  if (!fullPath) return

  const instanceId =
    (typeof detail.data?.appKey === 'string' && detail.data.appKey.trim()) ||
    (typeof detail.instanceId === 'string' && detail.instanceId.trim()) ||
    (typeof detail.appKey === 'string' && detail.appKey.trim()) ||
    ''
  if (!instanceId) {
    console.warn('[RouteChangeHandler] missing appKey/instanceId, ignore')
    return
  }

  const workspace = useWorkspaceStore()
  const active = workspace.activeTab
  if (
    active?.kind !== 'micro-app' ||
    !active.instanceId ||
    active.instanceId !== instanceId
  ) {
    return
  }

  const activeRule =
    typeof detail.data?.activeRule === 'string' ? detail.data.activeRule : ''
  const internalPath = stripActiveRule(activeRule, fullPath)

  const runtime = useRuntimeStore()
  if (!runtime.instances.has(instanceId)) return
  runtime.setLastActivePath(instanceId, internalPath)

  console.info('[RouteChangeHandler] updated lastActivePath', {
    instanceId,
    activeRule,
    fullPath,
    internalPath,
  })

  replaceBrowserPathname(fullPath.startsWith('/') ? fullPath : `/${fullPath}`)
}
