import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import { envConfigPlugin } from './vite-plugin-env-config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // 确保 base 以 / 结尾
  const rawBase = env.VITE_CONTEXT_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';
  const serverPort = parseInt(process.env.VITE_SERVER_PORT || '3001', 10);

  return {
    base: base,
    define: {
      // 完全禁用 HMR，避免与 qiankun 冲突
      'import.meta.hot': 'undefined',
      '__VUE_PROD_DEVTOOLS__': 'false',
      '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false',
      // 定义 DEV 环境变量
      'import.meta.env.DEV': mode === 'development',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@platform': path.resolve(__dirname, './src/platform'),
        '@runtime': path.resolve(__dirname, './src/runtime'),
        '@shared': path.resolve(__dirname, './src/shared'),
        vue: 'vue/dist/vue.runtime.esm-bundler.js',
      },
    },
    server: {
      host: '0.0.0.0',
      port: serverPort,
      open: true,
      cors: true,
      // origin 用于设置开发服务器的源，确保资源路径正确
      // 使用协议相对路径，与 base 保持一致
      origin: mode === 'development' ? `//localhost:${serverPort}` : undefined,
      // 在 qiankun 模式下，HMR 可能导致卸载时的冲突
      // 完全禁用 HMR 以避免与 qiankun 的冲突
      hmr: false,
      proxy: {
        // 将 /keys 路径代理到后端服务器
        [`${base}keys/iam-public-key`]: {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        [`${base}keys/iam-key-id`]: {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        // 将 /sign_code 路径代理到后端服务器
        [`${base}lua/sign_code`]: {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        [`${base}auth/`]: {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        // 将 /api 路径代理到后端服务器
        [`${base}api/`]: {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      vue(),
      // Qiankun 插件配置（必须在 vue() 之后）
      qiankun(env.VITE_APPLICATION_CODE || 'g2rain-app', {
        useDevMode: true, // 开发环境启用
      }),
      envConfigPlugin(), // 生成运行时环境配置文件
    ],
    esbuild: {
      drop: [],
    },
    build: {
      minify: 'esbuild'
    }
  };
});

