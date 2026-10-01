/** Replaced by create-g2rain-app during scaffold when used as {{PROJECT_NAME}}. */
import { PROJECT_NAME } from './project'

declare global {
  interface Window {
    _env_?: Record<string, string | undefined>
    __g2rainEnvConfigReady__?: Promise<void>
  }
}

/**
 * Prefer runtime window._env_ (env-config.js + docker-entrypoint), then import.meta.env.
 * Skip unresolved placeholders like __SSO_BASE_URL__.
 */
function getEnvVar(key: string, defaultValue = ''): string {
  if (typeof window !== 'undefined' && window._env_) {
    const runtimeValue = window._env_[key]
    if (typeof runtimeValue === 'string' && runtimeValue !== '') {
      if (!runtimeValue.startsWith('__') && !runtimeValue.endsWith('__')) {
        return runtimeValue
      }
    }
  }

  const buildTime = (import.meta.env as Record<string, string | undefined>)[key]
  if (typeof buildTime === 'string' && buildTime !== '') {
    if (buildTime.startsWith('__') && buildTime.endsWith('__')) {
      return defaultValue
    }
    // Unexpanded ${SSO_BASE_URL} from .env.production must not win over empty runtime
    if (buildTime.includes('${')) {
      return defaultValue
    }
    return buildTime
  }

  return defaultValue
}

/** Wait for index.html env-config.js loader (no-op / immediate in vite dev onerror). */
export async function awaitRuntimeEnvConfig(): Promise<void> {
  if (typeof window === 'undefined') return
  const ready = window.__g2rainEnvConfigReady__
  if (ready) {
    await ready
  }
}

export function getContextPath(): string {
  const raw = getEnvVar('VITE_CONTEXT_PATH', import.meta.env.VITE_CONTEXT_PATH || '/admin')
  return raw.endsWith('/') ? raw.slice(0, -1) || '/' : raw
}

/** Vite proxy / docs helper; browser HTTP clients use same-origin Context Path (main-shell 同款). */
export function getBackendOrigin(): string {
  return getEnvVar('VITE_BACKEND_ORIGIN', import.meta.env.VITE_BACKEND_ORIGIN || '')
}

export function getApplicationCode(): string {
  const raw = getEnvVar('VITE_APPLICATION_CODE', import.meta.env.VITE_APPLICATION_CODE || PROJECT_NAME)
  return raw.trim() || PROJECT_NAME
}

export function getSsoBaseUrl(): string {
  return getEnvVar('VITE_SSO_BASE_URL', '').replace(/\/$/, '')
}

export function getAuthEndPoint(): string {
  return getEnvVar('VITE_AUTH_END_POINT', import.meta.env.VITE_AUTH_END_POINT || '/auth/authorize')
}

export function getTokenEndPoint(): string {
  return getEnvVar('VITE_TOKEN_END_POINT', import.meta.env.VITE_TOKEN_END_POINT || '/auth/token')
}

export function getRedirectUriPath(): string {
  const raw = getEnvVar('VITE_REDIRECT_URI', import.meta.env.VITE_REDIRECT_URI || '/sso_callback')
  return raw.startsWith('/') ? raw : `/${raw}`
}

/** Join Shell context path with a route path (leading slash, no double slash). */
export function getPathWithContextPath(routePath: string): string {
  const base = getContextPath()
  const path = routePath.startsWith('/') ? routePath : `/${routePath}`
  if (base === '/' || base === '') return path
  return `${base}${path}`
}

export function isAuthPublicPath(pathname: string): boolean {
  return pathname.endsWith('/sso_callback') || pathname.endsWith('/logout')
}

/** DingTalk passport bind mode: INTERNAL | THIRD_PARTY */
export function getDingTalkBindMode(): string {
  const raw = getEnvVar('VITE_DINGTALK_BIND_MODE', import.meta.env.VITE_DINGTALK_BIND_MODE || 'INTERNAL')
  return raw.trim() || 'INTERNAL'
}
