import { watch } from 'vue'
import {
  createDpopProof,
  type DpopClient,
  type EnsureAccessTokenOptions,
  type Result,
} from '@g2rain/http'
import {
  getApplicationCode,
  getAuthEndPoint,
  getPathWithContextPath,
  getRedirectUriPath,
  getSsoBaseUrl,
  getTokenEndPoint,
  isAuthPublicPath,
} from '../../shared/env'
import { Generator } from '../../shared/id'
import { generateClient } from '../../shared/jwt'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import {
  fetchIamKeyId,
  fetchIamPublicKey,
  getAuthHttpClient,
  getSignHttpClient,
  refreshBarrier,
} from '../http'
import { peekReturnUrl, saveReturnUrl } from '../navigation/sub-app-redirect'

export interface TokenRefreshResult {
  token: string
  tokenKid: string
  client?: DpopClient
}

/**
 * Shell-owned SSO orchestration. Uses @g2rain/http auth client for token exchange;
 * business client injects ensureAccessToken from this service.
 */
class SsoService {
  private isAuthenticationPending = false
  private isRefreshPending = false
  private pendingSubscribers: Array<() => void> = []
  private refreshPromise: Promise<{ token: string; tokenKid: string }> | null = null
  private ensureAccessTokenPromise: Promise<void> | null = null
  private stopWatchTokenExpired: (() => void) | null = null
  private stopWatchLogged: (() => void) | null = null

  private getStore() {
    return useAccessTokenStore()
  }

  private createTokenProof(url: string, data: unknown, client: DpopClient | null, jti: string) {
    if (!client) throw new Error('DPoP client is required')
    return createDpopProof({
      url,
      method: 'post',
      params: '',
      data,
      applicationCode: getApplicationCode(),
      client,
      jti,
    })
  }

  private async callSignApi(
    data: unknown,
    headerDPoP: string,
    jti: string,
  ): Promise<string> {
    const http = getSignHttpClient()
    const response = await http.client.post<{ token: string }>(`/lua/sign_code?jti=${jti}`, data, {
      headers: {
        'Content-Type': 'application/json',
        DPoP: headerDPoP,
      },
    })
    const body = response as unknown as { token?: string }
    if (!body.token) {
      throw new Error('Failed to obtain Application-DPoP')
    }
    return body.token
  }

  async redirectToSSO(): Promise<void> {
    const store = this.getStore()
    if (!store.client) {
      store.setClient(await generateClient())
    }
    if (!store.client) {
      throw new Error('Client not initialized')
    }

    const ssoBaseUrl = getSsoBaseUrl()
    if (!ssoBaseUrl) {
      throw new Error('VITE_SSO_BASE_URL is not configured')
    }

    if (!peekReturnUrl()) {
      saveReturnUrl()
    }

    const redirectUri = window.location.origin + getPathWithContextPath(getRedirectUriPath())
    const ssoUrl = new URL(ssoBaseUrl + getAuthEndPoint())
    ssoUrl.search = new URLSearchParams({
      clientId: store.client.clientId,
      redirectUri,
      responseType: 'code',
      publicKey: JSON.stringify(store.client.publicKey),
    }).toString()

    store.persistSnapshot()
    window.location.href = ssoUrl.toString()
  }

  async redirectToSSOIndex(): Promise<void> {
    const ssoBaseUrl = getSsoBaseUrl()
    if (!ssoBaseUrl) {
      throw new Error('VITE_SSO_BASE_URL is not configured')
    }
    window.location.href = new URL('/auth/index.html', ssoBaseUrl).toString()
  }

  async generateToken(code: string): Promise<void> {
    if (this.isAuthenticationPending) {
      return new Promise((resolve) => {
        this.pendingSubscribers.push(() => resolve())
      })
    }

    this.isAuthenticationPending = true
    const store = this.getStore()
    const http = getAuthHttpClient()
    const data = { code, grantType: 'authorization_code' }
    const jti = Generator.random()
    const dpop = await this.createTokenProof(getTokenEndPoint(), data, store.client, jti)
    const applicationDpop = await this.callSignApi(data, dpop, jti)

    try {
      const response = await http.client.post<{ token: string; keyId: string }>(
        getTokenEndPoint(),
        data,
        {
          headers: {
            DPoP: dpop,
            'Application-DPoP': applicationDpop,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      const result = response as unknown as Result<{ token: string; keyId: string }>
      if (result.status !== 200 && result.status !== 0) {
        throw new Error('GENERATE_TOKEN_FAILURE')
      }
      const { token, keyId } = result.data
      const signHttp = getSignHttpClient()
      const iamKeyId = await fetchIamKeyId(signHttp.client)
      const publicKey = await fetchIamPublicKey(signHttp.client)
      await store.setTokens(token, keyId, iamKeyId, publicKey)
      this.pendingSubscribers.splice(0).forEach((fn) => fn())
    } catch (error) {
      this.pendingSubscribers = []
      throw error
    } finally {
      this.isAuthenticationPending = false
    }
  }

  async ensureAccessToken(opts?: EnsureAccessTokenOptions): Promise<void> {
    const store = this.getStore()
    if (!opts?.force && store.isAccessTokenValid) return
    if (!store.isLogin) throw new Error('NO_LOGIN')
    if (this.ensureAccessTokenPromise) return this.ensureAccessTokenPromise

    const run = (async () => {
      const barrier = refreshBarrier.waitForRefresh()
      await this.requestRefreshToken({ grantType: 'refresh_token' })
      await barrier
    })()

    this.ensureAccessTokenPromise = run.finally(() => {
      this.ensureAccessTokenPromise = null
    })
    return this.ensureAccessTokenPromise
  }

  async refreshToken(): Promise<TokenRefreshResult> {
    await this.ensureAccessToken({ force: true })
    const store = this.getStore()
    const iamKeyId = await fetchIamKeyId(getSignHttpClient().client)
    if (!store.tokenString) {
      throw new Error('TOKEN_REFRESH_FAILED')
    }
    return {
      token: store.tokenString,
      tokenKid: iamKeyId,
      client: store.client ?? undefined,
    }
  }

  async requestRefreshToken(requestData: {
    grantType: string
    userId?: string | number | null
  }): Promise<{ token: string; tokenKid: string }> {
    if (this.isRefreshPending && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshPending = true
    const store = this.getStore()

    this.refreshPromise = (async () => {
      try {
        if (!store.isLogin || !store.tokenString) {
          throw new Error('NO_LOGIN')
        }

        const http = getAuthHttpClient()
        const jti = Generator.random()
        const dpop = await this.createTokenProof(
          getTokenEndPoint(),
          requestData,
          store.client,
          jti,
        )

        const response = await http.client.post<{ token: string; keyId: string }>(
          getTokenEndPoint(),
          requestData,
          {
            headers: {
              Authorization: `Bearer ${store.tokenString}`,
              DPoP: dpop,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )

        const result = response as unknown as Result<{ token: string; keyId: string }>
        if (result.status !== 200 && result.status !== 0) {
          throw new Error('REFRESH_TOKEN_FAILURE')
        }

        const { token, keyId } = result.data
        const signHttp = getSignHttpClient()
        const iamKeyId = await fetchIamKeyId(signHttp.client)
        const publicKey = await fetchIamPublicKey(signHttp.client)
        await store.setTokens(token, keyId, iamKeyId, publicKey)
        refreshBarrier.resolveRefresh()
        return { token, tokenKid: keyId }
      } catch (error) {
        const refreshError = error instanceof Error ? error : new Error('TOKEN_REFRESH_FAILED')
        refreshBarrier.rejectRefresh(refreshError)
        throw refreshError
      } finally {
        this.isRefreshPending = false
        this.refreshPromise = null
        this.getStore().setTokenExpired(false)
      }
    })()

    return this.refreshPromise
  }

  /** Exchange token for another user context (tenant provision / organ switch). */
  async switchToken(userId: string | number): Promise<TokenRefreshResult> {
    const result = await this.requestRefreshToken({ grantType: 'exchange_token', userId })
    const store = this.getStore()
    return {
      token: result.token,
      tokenKid: result.tokenKid,
      client: store.client ?? undefined,
    }
  }

  start(): void {
    this.stop()
    const store = this.getStore()
    if (isAuthPublicPath(window.location.pathname)) {
      return
    }

    if (!store.isLogin && store.status === 'NORMAL') {
      void this.redirectToSSO().catch((error) => {
        console.error('[SSO] redirect on start failed:', error)
      })
    }

    this.stopWatchTokenExpired = watch(
      () => store.tokenExpired,
      async (expired) => {
        if (!expired || !store.isLogin) return
        try {
          await this.ensureAccessToken()
        } catch (error) {
          console.error('[SSO] auto refresh failed:', error)
          if (store.status === 'NORMAL') {
            await this.redirectToSSO()
          }
        }
      },
    )

    this.stopWatchLogged = watch(
      () => store.logged,
      async (logged) => {
        if (store.status === 'SSO' || store.status === 'LOGOUT') return
        if (!logged && store.status === 'NORMAL') {
          await this.redirectToSSO()
        }
      },
      { immediate: true },
    )
  }

  stop(): void {
    this.stopWatchTokenExpired?.()
    this.stopWatchTokenExpired = null
    this.stopWatchLogged?.()
    this.stopWatchLogged = null
  }
}

export const sso = new SsoService()
