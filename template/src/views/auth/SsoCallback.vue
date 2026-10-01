<template>
  <div class="sso-callback">
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>正在处理认证...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h2>认证失败</h2>
      <p>{{ error }}</p>
      <button @click="retry" class="retry-button">重试</button>
      <button @click="goToLogin" class="login-button">返回登录</button>
    </div>

    <div v-else class="success-container">
      <h2>认证成功</h2>
      <p>正在跳转到应用...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { sso } from '@runtime/auth';
import { useAccessTokenStore } from '@platform/stores';

const isLoading = ref(true);
const error = ref<string | null>(null);
const vueRouter = useRouter(); // 在独立模式下使用 Vue Router 实例

const extractCodeFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};

const extractClientIdFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('clientId');
};

const processCallback = async () => {
  try {
    const accessTokenStore = useAccessTokenStore();
    accessTokenStore.status = 'SSO';
    const code = extractCodeFromUrl();
    const clientId = extractClientIdFromUrl();
    if (!code || !clientId) {
      throw new Error('未找到授权码或者客户端ID');
    }

    await sso.generateToken(code);

    const returnUrl = localStorage.getItem('return_url') || '/';
    localStorage.removeItem('return_url');

    // 设置加载状态为 false，显示成功状态
    isLoading.value = false;
    
    // 短暂延迟，确保 UI 更新
    await new Promise(resolve => setTimeout(resolve, 300));

    // 根据运行模式进行路由跳转
    try {
        await vueRouter.replace(returnUrl);
    } catch (routerError) {
      console.error('[SsoCallback] 路由跳转失败:', routerError);
      // 如果路由跳转失败，尝试使用 window.location
      window.location.href = returnUrl;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '认证处理失败';
    isLoading.value = false;
  }
};

const retry = () => {
  isLoading.value = true;
  error.value = null;
  processCallback();
};

const goToLogin = () => {
  sso.redirectToSSO();
};

onMounted(() => {
  processCallback();
});
</script>

<style scoped>
.sso-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  height: 100%;
  text-align: center;
}
.loading-container,
.error-container,
.success-container {
  padding: 2rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error-container {
  border-left: 4px solid #e74c3c;
}
.success-container {
  border-left: 4px solid #2ecc71;
}
.retry-button,
.login-button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.retry-button {
  background: #3498db;
  color: white;
}
.login-button {
  background: #95a5a6;
  color: white;
}
</style>

