import { createRouter, createWebHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'
import { getContextPath, isAuthPublicPath } from '../../shared/env'
import SsoCallback from '../../views/auth/SsoCallback.vue'
import Logout from '../../views/auth/Logout.vue'
import PassportBindResult from '../../views/auth/PassportBindResult.vue'
import SubAppRedirectGateway from '../../views/redirect/SubAppRedirectGateway.vue'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import {
  isMicroAppBrowserPath,
  isRedirectGatewayPath,
  saveReturnUrl,
} from '../navigation/sub-app-redirect'

/**
 * Silent catch-all for micro-app address-bar paths (e.g. /member/...).
 * Must NOT redirect — qiankun/single-spa synthesizes popstate after replaceState.
 */
const MicroAppFallback = defineComponent({
  name: 'MicroAppFallback',
  setup() {
    return () => h('div', { style: 'display:none', 'aria-hidden': 'true' })
  },
})

const routes: RouteRecordRaw[] = [
  {
    path: '/sso_callback',
    name: 'sso-callback',
    component: SsoCallback,
    meta: { requiresAuth: false, bare: true },
  },
  {
    path: '/logout',
    name: 'logout',
    component: Logout,
    meta: { requiresAuth: false, bare: true },
  },
  {
    path: '/passport/bind_result',
    name: 'passport-bind-result',
    component: PassportBindResult,
    meta: { requiresAuth: true, bare: true },
  },
  {
    path: '/redirect/:pathMatch(.*)*',
    name: 'SubAppRedirectGateway',
    component: SubAppRedirectGateway,
    meta: { requiresAuth: false, bare: true },
  },
  {
    path: '/',
    name: 'shell-root',
    component: MicroAppFallback,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'MicroAppFallback',
    component: MicroAppFallback,
    meta: { requiresAuth: true, microApp: true },
  },
]

export function createShellRouter(): Router {
  const base = `${getContextPath()}/`
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  })

  router.beforeEach(async (to) => {
    if (to.meta.requiresAuth === false) {
      // Gateway: unauthenticated users land on the page which saves return_url + SSO
      return true
    }
    if (isAuthPublicPath(window.location.pathname)) return true

    const tokenStore = useAccessTokenStore()
    if (tokenStore.isLogin) return true

    // Unauthenticated deep micro path or gateway — remember then SSO
    const browserPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (
      to.meta.microApp === true ||
      isMicroAppBrowserPath(window.location.pathname) ||
      isRedirectGatewayPath(to.fullPath) ||
      isRedirectGatewayPath(browserPath)
    ) {
      saveReturnUrl(browserPath)
    }

    const { sso } = await import('../auth/sso')
    await sso.redirectToSSO()
    return false
  })

  return router
}
