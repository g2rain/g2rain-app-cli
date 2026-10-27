import { watch } from 'vue'
import type { Router } from 'vue-router'
import { getMenuList } from '../api/menu.api'
import { shellMenusAsMenuItems } from '../../platform/menus/shell-menus'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useMenuStore } from '../../platform/stores/menu.store'
import {
  clearReturnUrl,
  resetNavigationRestoreState,
  restoreAfterAuth,
} from '../navigation/sub-app-redirect'

let watching = false
let shellRouter: Router | null = null
let menuRequest = 0

/** Inject router created in boot() so restoreAfterAuth can navigate. */
export function setMenuBootRouter(router: Router): void {
  shellRouter = router
}

/**
 * Load authority menus when logged in; always prepend Shell-local SHELL_MENUS.
 * Watches token login so SSO callback also triggers registration.
 */
export async function initMenus(): Promise<void> {
  const request = ++menuRequest
  const tokenStore = useAccessTokenStore()
  const menuStore = useMenuStore()
  const shellItems = shellMenusAsMenuItems()

  if (!tokenStore.isLogin) {
    menuStore.setMenuItems(shellItems)
    return
  }

  if (menuStore.initialized && menuStore.menuItems.length > shellItems.length) {
    tryRestore()
    return
  }

  try {
    const backend = await getMenuList()
    if (request !== menuRequest || !tokenStore.isLogin) return
    const finalMenus = [...shellItems, ...backend]
    menuStore.setMenuItems(finalMenus)
    menuStore.registerAppsFromMenus(finalMenus)
    tryRestore()
  } catch (error) {
    if (request !== menuRequest || !tokenStore.isLogin) return
    console.warn('[menu.boot] failed to load authority menus:', error)
    menuStore.setMenuItems(shellItems)
    // 标记已初始化并尝试恢复深链；恢复失败时 restoreAfterAuth 会回首页
    tryRestore()
  }
}

function tryRestore(): void {
  if (!shellRouter) return
  restoreAfterAuth(shellRouter)
}

export function startMenuBoot(): void {
  if (watching) return
  watching = true

  const tokenStore = useAccessTokenStore()
  const menuStore = useMenuStore()

  watch(
    () => tokenStore.isLogin,
    async (loggedIn, wasLoggedIn) => {
      if (loggedIn) {
        menuStore.reset()
        resetNavigationRestoreState()
        await initMenus()
        return
      }
      menuStore.reset()
      menuRequest++
      // Only clear on real logout — immediate boot (wasLoggedIn undefined) must keep deep-link return_url
      if (wasLoggedIn === true) {
        clearReturnUrl()
      }
      resetNavigationRestoreState()
      menuStore.setMenuItems(shellMenusAsMenuItems())
    },
    { immediate: true },
  )
}
