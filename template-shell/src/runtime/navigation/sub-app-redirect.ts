/**
 * Sub-app deep-link + redirect gateway navigation.
 * Browser: /admin/redirect/{activeRule}/... → /{activeRule}/...
 * Aligns with main-shell sub-app-redirect, adapted to shell/group/sub menus.
 */

import type { Router } from 'vue-router'
import { getContextPath, getPathWithContextPath } from '../../shared/env'
import { stripActiveRule } from '../../shared/url'
import { microAppInstanceId, microAppViewIdFromMenuKey } from '../../shared/qiankun-id'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useMenuStore } from '../../platform/stores/menu.store'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import { useWorkspaceStore, OVERVIEW_TAB_ID } from '../../platform/stores/workspace.store'
import { syncBrowserAddressForTab } from '../../platform/apps/sync-browser-url'
import type { MenuItem } from '../../platform/types/menu.type'

/** Browser address-bar gateway prefix, e.g. /admin/redirect */
export function getRedirectGatewayPrefix(): string {
  return normalizePathname(getPathWithContextPath('/redirect'))
}

/** Vue Router path under history base */
export const REDIRECT_GATEWAY_ROUTE_PREFIX = '/redirect'

export const RETURN_URL_STORAGE_KEY = 'return_url'

let navigationRestored = false

function splitPathAndSuffix(fullPath: string): { pathname: string; suffix: string } {
  const q = fullPath.indexOf('?')
  const h = fullPath.indexOf('#')
  if (q < 0 && h < 0) {
    return { pathname: fullPath, suffix: '' }
  }
  const cut = Math.min(q >= 0 ? q : Infinity, h >= 0 ? h : Infinity)
  return {
    pathname: fullPath.slice(0, cut) || '/',
    suffix: fullPath.slice(cut),
  }
}

function normalizePathname(pathname: string): string {
  const p = `/${(pathname || '').trim()}`.replace(/\/+/g, '/')
  if (p.length > 1 && p.endsWith('/')) {
    return p.slice(0, -1)
  }
  return p || '/'
}

function normalizeActiveRule(activeRule: string): string {
  return normalizePathname(activeRule)
}

export function isAuthPagePath(pathname: string): boolean {
  return pathname.endsWith('/sso_callback') || pathname.endsWith('/logout')
}

function matchesGatewayPrefix(pathname: string, prefix: string): boolean {
  const normalized = normalizePathname(pathname)
  return normalized === prefix || normalized.startsWith(`${prefix}/`)
}

export function isRedirectGatewayPath(fullPath: string): boolean {
  const { pathname } = splitPathAndSuffix(fullPath)
  return (
    matchesGatewayPrefix(pathname, getRedirectGatewayPrefix()) ||
    matchesGatewayPrefix(pathname, REDIRECT_GATEWAY_ROUTE_PREFIX)
  )
}

/** True when browser pathname is outside Shell context path (e.g. /member/...). */
export function isMicroAppBrowserPath(pathname?: string): boolean {
  const path = normalizePathname(pathname ?? window.location.pathname)
  if (isAuthPagePath(path) || isRedirectGatewayPath(path)) return false
  const ctx = normalizePathname(getContextPath())
  if (ctx === '/' || ctx === '') return false
  return path !== ctx && !path.startsWith(`${ctx}/`)
}

/**
 * Vue Router history base is Shell Context Path (e.g. /admin/).
 * Loading the SPA at /member/... makes the first navigation rewrite the address to
 * /admin/member/... via createHref — which breaks deep-link restore.
 * Rewrite to the Redirect Gateway (under Shell base) before createShellRouter().
 */
export function rewriteMicroDeepLinkToGateway(): void {
  if (typeof window === 'undefined') return
  const full = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (!isMicroAppBrowserPath(window.location.pathname)) return

  const gateway = buildRedirectGatewayFromTarget(full)
  if (normalizePathname(splitPathAndSuffix(gateway).pathname) === normalizePathname(window.location.pathname)) {
    return
  }

  console.info('[SubAppRedirect] rewrite micro deep-link → gateway', { from: full, to: gateway })
  window.history.replaceState(window.history.state, '', gateway)
}

export function normalizeToBrowserGatewayPath(fullPath: string): string {
  const { pathname, suffix } = splitPathAndSuffix(fullPath)
  const browserPrefix = getRedirectGatewayPrefix()

  if (matchesGatewayPrefix(pathname, browserPrefix)) {
    return `${normalizePathname(pathname)}${suffix}`
  }

  if (matchesGatewayPrefix(pathname, REDIRECT_GATEWAY_ROUTE_PREFIX)) {
    const rest =
      normalizePathname(pathname) === REDIRECT_GATEWAY_ROUTE_PREFIX
        ? ''
        : normalizePathname(pathname).slice(REDIRECT_GATEWAY_ROUTE_PREFIX.length)
    return `${browserPrefix}${rest}${suffix}`
  }

  return buildRedirectGatewayFromTarget(fullPath)
}

export function buildRedirectGatewayFromTarget(targetFullPath: string): string {
  if (isRedirectGatewayPath(targetFullPath)) {
    return targetFullPath
  }
  const { pathname, suffix } = splitPathAndSuffix(targetFullPath)
  return `${getRedirectGatewayPrefix()}${pathname}${suffix}`
}

export function parseRedirectGateway(fullPath: string): {
  targetFullPath: string
  contextPath: string
  internalPath: string
} | null {
  const { pathname, suffix } = splitPathAndSuffix(fullPath)
  const normalized = normalizePathname(pathname)

  let rest = ''
  if (matchesGatewayPrefix(normalized, getRedirectGatewayPrefix())) {
    const prefix = getRedirectGatewayPrefix()
    rest = normalized === prefix ? '' : normalized.slice(prefix.length)
  } else if (matchesGatewayPrefix(normalized, REDIRECT_GATEWAY_ROUTE_PREFIX)) {
    const prefix = REDIRECT_GATEWAY_ROUTE_PREFIX
    rest = normalized === prefix ? '' : normalized.slice(prefix.length)
  } else {
    return null
  }

  if (!rest || rest === '/') {
    return null
  }

  const targetPathname = normalizePathname(rest)
  const targetFullPath = `${targetPathname}${suffix}`
  const segments = targetPathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const contextPath = `/${segments[0]}`
  const internalPath = stripActiveRule(contextPath, targetPathname)

  return {
    targetFullPath,
    contextPath,
    internalPath,
  }
}

export function saveReturnUrl(fullPath?: string): void {
  const raw =
    fullPath ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  const { pathname } = splitPathAndSuffix(raw)

  if (isAuthPagePath(pathname)) {
    return
  }

  if (isRedirectGatewayPath(pathname)) {
    localStorage.setItem(RETURN_URL_STORAGE_KEY, normalizeToBrowserGatewayPath(raw))
    return
  }

  // Shell root / shell pages: store as-is under gateway only for micro paths
  const ctx = normalizePathname(getContextPath())
  if (ctx !== '/' && (pathname === ctx || pathname.startsWith(`${ctx}/`))) {
    if (!isRedirectGatewayPath(pathname)) {
      // Stay within shell — no micro restore needed
      return
    }
  }

  localStorage.setItem(RETURN_URL_STORAGE_KEY, buildRedirectGatewayFromTarget(raw))
}

export function peekReturnUrl(): string | null {
  return localStorage.getItem(RETURN_URL_STORAGE_KEY)
}

export function consumeReturnUrl(): string | null {
  const value = localStorage.getItem(RETURN_URL_STORAGE_KEY)
  if (value) {
    localStorage.removeItem(RETURN_URL_STORAGE_KEY)
  }
  return value
}

export function clearReturnUrl(): void {
  localStorage.removeItem(RETURN_URL_STORAGE_KEY)
}

export function resetNavigationRestoreState(): void {
  navigationRestored = false
}

function collectMenuItems(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = []
  const traverse = (list: MenuItem[]) => {
    list.forEach((item) => {
      result.push(item)
      if (item.children?.length) {
        traverse(item.children)
      }
    })
  }
  traverse(items)
  return result
}

function normalizeInternalRoute(path: string): string {
  const p = normalizePathname(path)
  return p || '/'
}

function menuItemMatchesInternalPath(menuItem: MenuItem, internalPath: string): boolean {
  const menuRoute = normalizeInternalRoute(menuItem.routePath || '/')
  if (menuRoute === '/') {
    return true
  }
  return internalPath === menuRoute || internalPath.startsWith(`${menuRoute}/`)
}

function scoreSubMenuItemForInternalPath(
  menuItem: MenuItem,
  rule: string,
  internalPath: string,
): number {
  const menuRoute = normalizeInternalRoute(menuItem.routePath || '/')
  if (menuRoute === '/') {
    return rule.length
  }
  if (internalPath === menuRoute) {
    return rule.length * 10000 + menuRoute.length * 100 + 1000
  }
  if (internalPath.startsWith(`${menuRoute}/`)) {
    return rule.length * 10000 + menuRoute.length * 100
  }
  return -1
}

export function findSubMenuItemByTargetPath(
  menuItems: MenuItem[],
  targetFullPath: string,
): { menuItem: MenuItem; internalPath: string } | null {
  const { pathname } = splitPathAndSuffix(targetFullPath)
  const normalizedTarget = normalizePathname(pathname)

  const candidates: { menuItem: MenuItem; rule: string }[] = []

  for (const item of collectMenuItems(menuItems)) {
    if (item.type !== 'sub' || !item.activeRule) {
      continue
    }

    const rule = normalizeActiveRule(item.activeRule)
    if (rule === '/') {
      continue
    }

    if (normalizedTarget === rule || normalizedTarget.startsWith(`${rule}/`)) {
      candidates.push({ menuItem: item, rule })
    }
  }

  if (candidates.length === 0) {
    return null
  }

  const longestRule = candidates.reduce((a, b) => (a.rule.length >= b.rule.length ? a : b)).rule
  const internalPath = stripActiveRule(longestRule, normalizedTarget)

  const matching = candidates.filter((c) =>
    menuItemMatchesInternalPath(c.menuItem, internalPath),
  )
  const pool = matching.length > 0 ? matching : candidates

  let bestItem = pool[0].menuItem
  let bestScore = scoreSubMenuItemForInternalPath(bestItem, pool[0].rule, internalPath)

  for (let i = 1; i < pool.length; i++) {
    const score = scoreSubMenuItemForInternalPath(pool[i].menuItem, pool[i].rule, internalPath)
    if (score > bestScore) {
      bestScore = score
      bestItem = pool[i].menuItem
    }
  }

  return {
    menuItem: bestItem,
    internalPath,
  }
}

function canRestoreNavigation(): boolean {
  const tokenStore = useAccessTokenStore()
  const menuStore = useMenuStore()
  const runtimeStore = useRuntimeStore()

  if (!tokenStore.isLogin || !menuStore.initialized) {
    return false
  }
  if (runtimeStore.definitions.size === 0) {
    // Shell-only menus still allow restore attempt for shell paths; micro needs definitions
  }

  const pathname = normalizePathname(window.location.pathname)
  if (isAuthPagePath(pathname)) {
    return false
  }

  return true
}

function openSubTarget(targetFullPath: string, internalPath?: string): boolean {
  const menuStore = useMenuStore()
  const workspace = useWorkspaceStore()
  const runtimeStore = useRuntimeStore()

  const resolved = findSubMenuItemByTargetPath(menuStore.menuItems, targetFullPath)
  if (!resolved) {
    console.warn('[SubAppRedirect] no matching sub menu for', targetFullPath)
    return false
  }

  const { menuItem } = resolved
  const applicationCode = menuItem.name?.trim()
  if (!applicationCode) {
    console.warn('[SubAppRedirect] menu missing applicationCode/name', menuItem.key)
    return false
  }
  if (!runtimeStore.definitions.has(applicationCode)) {
    console.warn('[SubAppRedirect] applicationCode not registered', applicationCode)
    return false
  }

  // internalPath from findSubMenuItemByTargetPath / parseRedirectGateway is already
  // stripped from the browser URL. Do NOT strip again: internal routes may equal
  // contextPath (activeRule=/member, internal=/member → browser /member/member).
  const pathToRemember = internalPath ?? resolved.internalPath
  const initialRoute = pathToRemember.startsWith('/') ? pathToRemember : `/${pathToRemember}`

  const viewId = menuItem.viewId ?? microAppViewIdFromMenuKey(menuItem.key)
  const instanceId = microAppInstanceId(applicationCode, viewId)

  // Prefer lastActivePath before activateTab so address bar matches deep link.
  if (runtimeStore.instances.has(instanceId)) {
    runtimeStore.setLastActivePath(instanceId, initialRoute)
  }

  void workspace
    .openMicroAppView({
      viewId,
      title: menuItem.title,
      kind: 'micro-app',
      closable: menuItem.closable ?? true,
      applicationCode,
      initialRoute,
    })
    .then(() => {
      runtimeStore.setLastActivePath(instanceId, initialRoute)
      // Re-sync after any router.replace('/') from gateway handling.
      const tab = workspace.activeTab
      if (tab?.instanceId === instanceId) {
        syncBrowserAddressForTab(tab)
      }
    })
    .catch((error: unknown) => {
      console.error('[SubAppRedirect] openMicroAppView failed', error)
    })

  return true
}

/**
 * Apply gateway or real micro path to Workspace Tab.
 */
export function applyNavigationTarget(router: Router, fullPath: string): boolean {
  if (isRedirectGatewayPath(fullPath)) {
    const parsed = parseRedirectGateway(fullPath)
    if (!parsed) {
      return false
    }
    const opened = openSubTarget(parsed.targetFullPath, parsed.internalPath)
    if (opened) {
      // Leave gateway bare page; keep Workspace address sync as source of truth.
      if (router.currentRoute.value.name === 'SubAppRedirectGateway') {
        void router.replace('/').then(() => {
          syncBrowserAddressForTab(useWorkspaceStore().activeTab)
        })
      }
    }
    return opened
  }

  const menuStore = useMenuStore()
  const subResolved = findSubMenuItemByTargetPath(menuStore.menuItems, fullPath)
  if (subResolved) {
    return openSubTarget(fullPath, subResolved.internalPath)
  }

  return false
}

/**
 * After SSO / menus ready — restore pending navigation (idempotent).
 */
export function restoreAfterAuth(router: Router): boolean {
  if (navigationRestored || !canRestoreNavigation()) {
    return false
  }

  const workspace = useWorkspaceStore()
  let pending = consumeReturnUrl()
  let applied = false

  if (pending) {
    applied = applyNavigationTarget(router, pending)
  } else if (
    (router.currentRoute.value.meta.microApp === true ||
      isMicroAppBrowserPath(window.location.pathname)) &&
    workspace.activeTabId === OVERVIEW_TAB_ID
  ) {
    const browserPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
    applied = applyNavigationTarget(router, browserPath)
  } else if (isRedirectGatewayPath(router.currentRoute.value.fullPath)) {
    pending = router.currentRoute.value.fullPath
    applied = applyNavigationTarget(router, pending)
  } else if (isRedirectGatewayPath(window.location.pathname)) {
    pending = `${window.location.pathname}${window.location.search}${window.location.hash}`
    applied = applyNavigationTarget(router, pending)
  }

  if (applied) {
    navigationRestored = true
    console.info('[SubAppRedirect] navigation restore done')
    return true
  }

  if (pending) {
    console.warn('[SubAppRedirect] cannot restore target, fallback overview:', pending)
    router.replace('/').catch(() => undefined)
    navigationRestored = true
    return false
  }

  return false
}

/**
 * Logged-in user on gateway page: parse and open micro-app.
 */
export function handleRedirectGatewayWhenAuthed(
  router: Router,
  gatewayFullPath: string,
): boolean {
  const parsed = parseRedirectGateway(gatewayFullPath)
  if (!parsed) {
    router.replace('/').catch(() => undefined)
    return false
  }

  if (!canRestoreNavigation()) {
    return false
  }

  const opened = applyNavigationTarget(router, gatewayFullPath)
  if (!opened) {
    router.replace('/').catch(() => undefined)
  }
  return opened
}
