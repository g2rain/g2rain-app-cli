import type { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { loadEnv } from 'vite';

/**
 * Vite 插件：生成运行时环境配置文件
 * 在构建时生成 env-config.js，只对需要运行时替换的变量使用占位符
 * 其他变量从构建时的环境变量中读取
 */
export function envConfigPlugin(): Plugin {
  let env: Record<string, string> = {};
  
  return {
    name: 'vite-plugin-env-config',
    configResolved(config) {
      // 在配置解析时读取所有环境变量
      env = loadEnv(config.mode, config.envDir || process.cwd(), '');
    },
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      
      // 处理 VITE_CONTEXT_PATH：确保以 / 结尾（除非是根路径）
      let contextPath = env.VITE_CONTEXT_PATH || '/';
      if (contextPath !== '/' && !contextPath.endsWith('/')) {
        contextPath = contextPath + '/';
      }
      
      // 生成 env-config.js
      // 只对需要运行时替换的变量使用占位符，其他变量使用构建时的值
      const configContent = `// env-config.js
// 这个文件会在容器启动时被 docker-entrypoint.sh 替换为实际的配置
// 优先使用 window._env_ 中的配置，如果没有则使用 import.meta.env
window._env_ = {
  VITE_SSO_BASE_URL: '__SSO_BASE_URL__',
};
`;
      writeFileSync(resolve(outDir, 'env-config.js'), configContent, 'utf-8');
      console.log(`✅ env-config.js 已生成 (VITE_CONTEXT_PATH: ${contextPath})`);
    },
  };
}

