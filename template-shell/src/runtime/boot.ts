import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { G2rainUi } from '@g2rain/ui'
import type { MainPublicProps } from '@g2rain/platform/main'
import AppRoot from '../App.vue'
import {
  emitDirectedMessage,
  openAuthBridge,
  startRequestTokenHandler,
  startRouteChangeHandler,
  startTokenInvalidHandler,
} from '../components/micro-app'
import { initMainPlatform } from '../platform/main-platform'
import { initThemeController } from '../platform/theme'
import { useLocaleStore } from '../platform/stores/locale.store'
import { useRuntimeStore } from '../platform/stores/runtime.store'
import { useSessionStore } from '../platform/stores/session.store'
import { awaitRuntimeEnvConfig } from '../shared/env'
import { createShellRouter } from './router'
import { initHttpClient } from './http'
import { sso } from './auth/sso'
import { startMenuBoot, setMenuBootRouter } from './boot/menu.boot'
import { ensureQiankunStarted } from '../platform/apps/qiankun-adapter'
import { rewriteMicroDeepLinkToGateway } from './navigation/sub-app-redirect'
import { installShellExtensions } from './shell-extensions'

/**
 * Target boot order (contract):
 * Vue App → Store / i18n / UI → Theme → HTTP → Session/SSO → MicroApp → Tab → mount
 */
export async function boot(): Promise<App> {
  // Wait for env-config.js (runtime SSO) before any SSO redirect
  await awaitRuntimeEnvConfig()

  // Must run before Vue Router: outside-base micro URLs would be rewritten to
  // /{context}/member/... by createHref on the first navigation.
  rewriteMicroDeepLinkToGateway()

  const app = createApp(AppRoot)
  const pinia = createPinia()
  app.use(pinia)

  const localeStore = useLocaleStore()
  app.use(ElementPlus)
  app.use(G2rainUi, {
    translate: (_key, fallback) => fallback,
    locale: () => localeStore.locale,
  })

  initThemeController()
  initHttpClient()

  const runtimeStore = useRuntimeStore()
  initMainPlatform({
    async updateInstanceProps(instanceId, props: Readonly<MainPublicProps>) {
      await runtimeStore.updateInstanceProps(instanceId, props)
    },
    emit(message) {
      emitDirectedMessage(message)
    },
  })

  // Optional overlay (e.g. --with-legacy) installs AdapterResolver / bridges here.
  installShellExtensions()

  startTokenInvalidHandler()
  startRequestTokenHandler()
  startRouteChangeHandler()
  openAuthBridge()
  ensureQiankunStarted()

  const router = createShellRouter()
  setMenuBootRouter(router)
  app.use(router)

  sso.start()
  await useSessionStore().bootstrapSession()
  startMenuBoot()
  await router.isReady()
  app.mount('#app')
  return app
}
