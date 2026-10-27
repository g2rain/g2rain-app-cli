<template>
  <div class="redirect-gateway">
    <div class="loading-container">
      <div class="spinner" />
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, type WatchStopHandle } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sso } from '../../runtime/auth/sso'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useMenuStore } from '../../platform/stores/menu.store'
import {
  saveReturnUrl,
  handleRedirectGatewayWhenAuthed,
} from '../../runtime/navigation/sub-app-redirect'

const route = useRoute()
const router = useRouter()
const menuStore = useMenuStore()
const message = ref('正在跳转...')

function menusReady(): boolean {
  // 菜单接口失败时仍会 initialized；不再等子应用定义数量，避免深链卡住
  return menuStore.initialized
}

async function tryOpenTarget(): Promise<boolean> {
  if (!menusReady()) {
    return false
  }
  return handleRedirectGatewayWhenAuthed(router, route.fullPath)
}

onMounted(async () => {
  const tokenStore = useAccessTokenStore()

  if (!tokenStore.isLogin) {
    message.value = '正在跳转登录...'
    saveReturnUrl(route.fullPath)
    try {
      await sso.redirectToSSO()
    } catch (e) {
      console.error('[SubAppRedirectGateway] SSO redirect failed:', e)
      message.value = '跳转登录失败'
    }
    return
  }

  message.value = '正在打开应用...'

  // Only watch (incl. immediate) — avoid onMounted + watch both calling tryOpenTarget.
  let stop: WatchStopHandle | null = null
  stop = watch(
    () => menuStore.initialized,
    async (menuReady) => {
      if (!menuReady) {
        return
      }
      if (await tryOpenTarget()) {
        stop?.()
        stop = null
      }
    },
    { immediate: true },
  )
})
</script>

<style scoped>
.redirect-gateway {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  text-align: center;
  background: var(--g2-bg-page);
  color: var(--g2-text-primary);
}

.loading-container {
  padding: 32px;
}

.spinner {
  border: 4px solid var(--g2-border-color);
  border-top: 4px solid var(--g2-color-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
