import type { Plugin } from 'vite'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const APP_CONTEXT_PATH_PLACEHOLDER = '__G2RAIN_APP_CONTEXT_PATH__'

/**
 * URL 用 Context Path：取自 VITE_CONTEXT_PATH，去掉尾部斜杠。
 * @example '/admin/' -> '/admin'，'/' -> '/'
 */
function normalizeContextPathForUrl(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed || trimmed === '/') {
    return '/'
  }
  let p = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  p = p.replace(/\/+$/, '')
  return p || '/'
}

/**
 * 构建期生成 dist/env-config.js（容器启动时由 docker-entrypoint 替换 SSO），
 * 并向 index.html 注入 Context Path（与 main-shell 同款）。
 */
export function envConfigPlugin(): Plugin {
  let env: Record<string, string> = {}

  const getContextPathForUrl = () => normalizeContextPathForUrl(env.VITE_CONTEXT_PATH)

  return {
    name: 'vite-plugin-env-config',
    configResolved(config) {
      env = loadEnv(config.mode, config.envDir || process.cwd(), '')
    },
    transformIndexHtml(html) {
      return html.split(APP_CONTEXT_PATH_PLACEHOLDER).join(getContextPathForUrl())
    },
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      const contextPathForUrl = getContextPathForUrl()

      const configContent = `// env-config.js
// Replaced at container start by docker-entrypoint.sh (SSO_BASE_URL)
window._env_ = {
  VITE_SSO_BASE_URL: '__SSO_BASE_URL__',
};
`
      writeFileSync(resolve(outDir, 'env-config.js'), configContent, 'utf-8')
      console.log(
        `env-config.js generated; app context path: ${contextPathForUrl} (from VITE_CONTEXT_PATH)`,
      )
    },
  }
}
