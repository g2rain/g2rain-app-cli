<template>
  <div class="logout-page">
    <div class="panel">
      <h1>{{ projectName }}</h1>
      <h2>您已安全退出</h2>
      <p>
        账户已在本应用退出。如需彻底退出，请访问
        <a href="javascript:void(0)" @click.prevent="gotoSsoIndex">IAM 系统</a>
        。系统将在 {{ countdown }} 秒后自动跳转。
      </p>
      <button type="button" class="btn primary" @click="relogin">重新登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { PROJECT_NAME } from '../../shared/project'
import { sso } from '../../runtime/auth/sso'

const projectName = PROJECT_NAME
const countdown = ref(5)
let timer: number | null = null

function relogin(): void {
  void sso.redirectToSSO()
}

function gotoSsoIndex(): void {
  void sso.redirectToSSOIndex()
}

onMounted(() => {
  timer = window.setInterval(() => {
    if (countdown.value > 1) {
      countdown.value -= 1
      return
    }
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
    void sso.redirectToSSOIndex()
  }, 1000)
})

onUnmounted(() => {
  if (timer != null) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.logout-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--g2-bg-page);
  color: var(--g2-text-primary);
  padding: 24px;
}

.panel {
  max-width: 480px;
  width: 100%;
  padding: 32px;
  border-radius: 8px;
  background: var(--g2-bg-container);
  border: 1px solid var(--g2-border-color);
  text-align: center;
}

.panel a {
  color: var(--g2-color-primary);
}

.btn.primary {
  margin-top: 16px;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: var(--g2-color-primary);
  color: #fff;
  cursor: pointer;
}
</style>
