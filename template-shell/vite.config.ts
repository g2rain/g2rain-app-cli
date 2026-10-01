import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { envConfigPlugin } from './vite-plugin-env-config'
import { microAppSpaFallbackPlugin } from './vite-plugin-micro-spa-fallback'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawBase = env.VITE_CONTEXT_PATH || '/admin'
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
  const serverPort = parseInt(env.VITE_SERVER_PORT || '3000', 10)
  const backendOrigin = (env.VITE_BACKEND_ORIGIN || 'http://localhost:8080').replace(/\/$/, '')

  const backendProxy = {
    target: backendOrigin,
    changeOrigin: true,
    secure: false,
  }

  return {
    base,
    plugins: [vue(), envConfigPlugin(), microAppSpaFallbackPlugin(rawBase)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@platform': path.resolve(__dirname, './src/platform'),
        '@runtime': path.resolve(__dirname, './src/runtime'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@shell': path.resolve(__dirname, './src/shell'),
        vue: 'vue/dist/vue.runtime.esm-bundler.js',
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number.isFinite(serverPort) ? serverPort : 3000,
      open: true,
      cors: true,
      // main-shell 同款：同域 Context Path，全部代理到 VITE_BACKEND_ORIGIN
      proxy: {
        [`${base}keys/iam-public-key`]: backendProxy,
        [`${base}keys/iam-key-id`]: backendProxy,
        [`${base}lua/sign_code`]: backendProxy,
        [`${base}auth/`]: backendProxy,
        [`${base}api/`]: backendProxy,
      },
    },
    build: {
      target: 'es2020',
      sourcemap: true,
    },
  }
})
