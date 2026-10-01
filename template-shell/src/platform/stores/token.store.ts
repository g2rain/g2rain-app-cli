import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { jwtVerify } from 'jose'
import type { DpopClient } from '@g2rain/http'
import { getApplicationCode } from '../../shared/env'
import { publicKeyStringToJwk } from '../../shared/jwt'

export interface ApplicationScope {
  applicationCode: string
  scopes?: string[]
}

/** Non-sensitive JWT claims kept in memory for session decisions. */
export interface AccessTokenClaims {
  clientId: string
  clientPublicKey: string
  applicationScopes: ApplicationScope[]
  expireAt: number
  refreshExpireAt: number
  adminCompany: boolean
  organId?: number
}

export type TokenSessionStatus = 'NORMAL' | 'SSO' | 'LOGOUT'

/** Legacy fixed key (pre-namespacing). Migrate once into the namespaced key when claims belong to this shell. */
const LEGACY_STORAGE_KEY = 'g2rain-shell-token'

/** Shell-owned persist key; namespace by applicationCode so multiple independent shells on the same origin do not share token state. */
function getTokenStorageKey(): string {
  return `${LEGACY_STORAGE_KEY}:${getApplicationCode()}`
}

interface PersistedTokenState {
  client: DpopClient | null
  token: AccessTokenClaims | null
  tokenString: string | null
  logged: boolean
  tokenExpired: boolean
}

function parsePersisted(raw: string | null): PersistedTokenState | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as PersistedTokenState
  } catch {
    return null
  }
}

/** Migrate only when applicationScopes include this shell's code, so another shell's legacy session is not claimed. */
function belongsToCurrentShell(state: PersistedTokenState): boolean {
  const code = getApplicationCode()
  const scopes = state.token?.applicationScopes
  if (!scopes?.length) return false
  return scopes.some((scope) => scope.applicationCode === code)
}

function readPersisted(): PersistedTokenState | null {
  try {
    const storageKey = getTokenStorageKey()
    const current = parsePersisted(localStorage.getItem(storageKey))
    if (current) return current

    // One-time migrate from shared legacy key when it belongs to this shell.
    const legacy = parsePersisted(localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!legacy || !belongsToCurrentShell(legacy)) return null
    localStorage.setItem(storageKey, JSON.stringify(legacy))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return legacy
  } catch {
    return null
  }
}

function writePersisted(state: PersistedTokenState): void {
  try {
    localStorage.setItem(getTokenStorageKey(), JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

function clearPersisted(): void {
  try {
    localStorage.removeItem(getTokenStorageKey())
  } catch {
    /* ignore */
  }
}

/**
 * Shell-owned Token Store. Satisfies @g2rain/http HttpAuthSession.
 * Persist key is g2rain-shell-token:${applicationCode} (same-origin multi-shell isolation).
 * Never put tokenString into public props, URL, Header UI, or durable logs.
 */
export const useAccessTokenStore = defineStore('shell-access-token', () => {
  const persisted = readPersisted()

  const client = ref<DpopClient | null>(persisted?.client ?? null)
  const token = ref<AccessTokenClaims | null>(persisted?.token ?? null)
  const tokenString = ref<string | null>(persisted?.tokenString ?? null)
  const logged = ref(persisted?.logged ?? false)
  const status = ref<TokenSessionStatus>('NORMAL')
  const tokenExpired = ref(persisted?.tokenExpired ?? false)

  const isLogin = computed(() => {
    if (!client.value || !token.value) return false
    const refreshExpireAt = new Date(token.value.refreshExpireAt * 1000)
    return refreshExpireAt > new Date()
  })

  const isAccessTokenValid = computed(() => {
    if (!token.value?.expireAt) return false
    return new Date(token.value.expireAt * 1000) > new Date()
  })

  const organId = computed(() => token.value?.organId)

  function persistSnapshot(): void {
    writePersisted({
      client: client.value,
      token: token.value,
      tokenString: tokenString.value,
      logged: logged.value,
      tokenExpired: tokenExpired.value,
    })
  }

  function setTokenExpired(expired: boolean): void {
    tokenExpired.value = expired
    persistSnapshot()
  }

  function setStatus(next: TokenSessionStatus): void {
    status.value = next
  }

  async function setTokens(
    nextTokenString: string,
    tokenKid: string,
    iamKeyId: string,
    publicKey: string,
  ): Promise<void> {
    if (tokenKid !== iamKeyId) {
      throw new Error('TokenKid does not match IAM key id')
    }
    const publicKeyJwk = await publicKeyStringToJwk(publicKey)
    const { payload } = await jwtVerify(nextTokenString, publicKeyJwk)

    const rawOrganId = payload.organId
    const parsedOrganId =
      rawOrganId != null && rawOrganId !== '' ? Number(rawOrganId) : undefined

    tokenString.value = nextTokenString
    token.value = {
      clientId: (payload.clientId as string) || '',
      clientPublicKey: (payload.clientPublicKey as string) || '',
      applicationScopes: (payload.applicationScopes as ApplicationScope[]) || [],
      expireAt: (payload.expireAt as number) || 0,
      refreshExpireAt: (payload.refreshExpireAt as number) || 0,
      adminCompany: payload.adminCompany === true,
      organId:
        parsedOrganId != null && !Number.isNaN(parsedOrganId) ? parsedOrganId : undefined,
    }
    logged.value = true
    status.value = 'NORMAL'
    tokenExpired.value = false
    if (client.value) {
      client.value = { ...client.value, isAuthenticated: true }
    }
    persistSnapshot()
  }

  function logout(): void {
    token.value = null
    tokenString.value = null
    client.value = null
    tokenExpired.value = false
    logged.value = false
    status.value = 'LOGOUT'
    clearPersisted()
  }

  function setClient(next: DpopClient | null): void {
    client.value = next
    persistSnapshot()
  }

  return {
    client,
    token,
    tokenString,
    logged,
    status,
    tokenExpired,
    isLogin,
    isAccessTokenValid,
    organId,
    setTokenExpired,
    setStatus,
    setTokens,
    setClient,
    logout,
    persistSnapshot,
  }
})
