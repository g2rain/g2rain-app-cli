import {
  createHttpClient,
  type EnsureAccessTokenOptions,
  type HttpAuthSession,
  type HttpClientInstance,
} from '@g2rain/http'
import {
  getApplicationCode,
  getContextPath,
} from '../../shared/env'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useLocaleStore } from '../../platform/stores/locale.store'

let businessClient: HttpClientInstance | undefined
/** Token exchange: same-origin Context Path + /auth/* (Vite/Nginx → IAM). */
let authClient: HttpClientInstance<true> | undefined
/** Application-DPoP sign + IAM key files: same-origin Context Path + /lua|/keys. */
let signClient: HttpClientInstance<true> | undefined

function authSessionProvider(): HttpAuthSession {
  const store = useAccessTokenStore()
  return {
    client: store.client,
    isLogin: store.isLogin,
    isAccessTokenValid: store.isAccessTokenValid,
    tokenExpired: store.tokenExpired,
    tokenString: store.tokenString,
    setTokenExpired: (expired) => store.setTokenExpired(expired),
  }
}

/**
 * Shell HTTP assembly.
 * - business client: withAuth → same-origin `{contextPath}/api`（main-shell 同款）
 * - auth / sign clients: withAuth false → same-origin Context Path
 *   开发期由 Vite 代理：/admin/api/*、/admin/auth/*、/admin/lua/*
 */
export function initHttpClient(): HttpClientInstance {
  if (businessClient) return businessClient

  const ensureAccessToken = async (opts?: EnsureAccessTokenOptions): Promise<void> => {
    const { sso } = await import('../auth/sso')
    await sso.ensureAccessToken(opts)
  }

  const authErrorHandler = async (
    reason: 'NO_LOGIN' | 'TOKEN_REFRESH_FAILED',
  ): Promise<void> => {
    console.warn(`[shell-http] auth error: ${reason}`)
    const store = useAccessTokenStore()
    if (store.client) {
      store.setClient({ ...store.client, isAuthenticated: false })
    }
    const { sso } = await import('../auth/sso')
    await sso.redirectToSSO()
  }

  // Align with main-shell: baseURL = Context Path (e.g. /admin)
  const shellBaseURL = getContextPath()
  const sameOriginBase = shellBaseURL === '/' ? undefined : shellBaseURL
  const apiBaseURL =
    shellBaseURL === '/' || shellBaseURL === '' ? '/api' : `${shellBaseURL}/api`

  businessClient = createHttpClient({
    baseURL: apiBaseURL,
    withAuth: true,
    dpop: { applicationCode: getApplicationCode() },
    authSessionProvider,
    ensureAccessToken,
    authErrorHandler,
    getLocale: () => useLocaleStore().locale || undefined,
  })

  authClient = createHttpClient({
    baseURL: sameOriginBase,
    withAuth: false,
    isDirectResponse: true,
  })

  signClient = createHttpClient({
    baseURL: sameOriginBase,
    withAuth: false,
    isDirectResponse: true,
  })

  return businessClient
}

export function getHttpClient(): HttpClientInstance {
  if (!businessClient) {
    throw new Error('HTTP client is not initialized. Call initHttpClient from the composition root.')
  }
  return businessClient
}

export function getAuthHttpClient(): HttpClientInstance<true> {
  if (!authClient) {
    initHttpClient()
  }
  if (!authClient) {
    throw new Error('Auth HTTP client is not initialized')
  }
  return authClient
}

export function getSignHttpClient(): HttpClientInstance<true> {
  if (!signClient) {
    initHttpClient()
  }
  if (!signClient) {
    throw new Error('Sign HTTP client is not initialized')
  }
  return signClient
}

export { refreshBarrier } from './refresh-barrier'
export { fetchIamKeyId, fetchIamPublicKey, clearIamKeyCache } from './iam-keys'
