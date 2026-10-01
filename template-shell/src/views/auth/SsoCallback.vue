<template>
  <div class="sso-callback">
    <div v-if="isLoading" class="panel">
      <div class="spinner" />
      <p>正在处理认证...</p>
    </div>
    <div v-else-if="error" class="panel error">
      <h2>认证失败</h2>
      <p>{{ error }}</p>
      <button type="button" class="btn primary" @click="retry">重试</button>
      <button type="button" class="btn" @click="goToLogin">返回登录</button>
    </div>
    <div v-else class="panel success">
      <h2>认证成功</h2>
      <p>正在进入应用...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useSessionStore } from '../../platform/stores/session.store'
import { sso } from '../../runtime/auth/sso'

const router = useRouter()
const isLoading = ref(true)
const error = ref<string | null>(null)

async function processCallback(): Promise<void> {
  const tokenStore = useAccessTokenStore()
  tokenStore.setStatus('SSO')

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const clientId = params.get('clientId')
  if (!code || !clientId) {
    error.value = '未找到授权码或客户端 ID'
    isLoading.value = false
    return
  }

  try {
    await sso.generateToken(code)
    tokenStore.setStatus('NORMAL')
    await useSessionStore().bootstrapSession()
    await router.replace('/')
  } catch (err) {
    tokenStore.setStatus('NORMAL')
    error.value = err instanceof Error ? err.message : '认证处理失败'
    isLoading.value = false
  }
}

function retry(): void {
  isLoading.value = true
  error.value = null
  void processCallback()
}

function goToLogin(): void {
  void sso.redirectToSSO()
}

onMounted(() => {
  void processCallback()
})
</script>

<style scoped>
.sso-callback {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--g2-bg-page);
  color: var(--g2-text-primary);
}

.panel {
  padding: 32px;
  border-radius: 8px;
  background: var(--g2-bg-container);
  border: 1px solid var(--g2-border-color);
  text-align: center;
  min-width: 280px;
}

.panel.error {
  border-left: 4px solid var(--g2-color-danger, #f56c6c);
}

.panel.success {
  border-left: 4px solid var(--g2-color-primary);
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 16px;
  border: 3px solid var(--g2-border-color);
  border-top-color: var(--g2-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn {
  margin: 8px;
  padding: 8px 14px;
  border-radius: 4px;
  border: 1px solid var(--g2-border-color);
  background: var(--g2-bg-muted);
  color: var(--g2-text-regular);
  cursor: pointer;
}

.btn.primary {
  background: var(--g2-color-primary);
  border-color: var(--g2-color-primary);
  color: #fff;
}
</style>
