import type { DpopClient } from '@g2rain/http'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { fetchIamKeyId, getSignHttpClient } from '../http'
import { sso } from './sso'

export interface SharedAuthPayload {
  token: string
  tokenKid: string
  client: DpopClient
}

export class SharedAuthError extends Error {
  readonly code: 'SESSION_EXPIRED' | 'AUTH_UNAVAILABLE'

  constructor(code: 'SESSION_EXPIRED' | 'AUTH_UNAVAILABLE', message?: string) {
    super(message ?? code)
    this.name = 'SharedAuthError'
    this.code = code
  }
}

/** Shallow-copy DPoP client so sub-apps cannot mutate Shell's master object. */
export function cloneClient(client: DpopClient): DpopClient {
  return {
    clientId: client.clientId,
    isAuthenticated: client.isAuthenticated,
    publicKey: { ...client.publicKey },
    privateKey: { ...client.privateKey },
  }
}

/**
 * Read Shell-owned session for Auth Bridge.
 * Reuses sso.ensureAccessToken single-flight; never logs token / client.
 */
export async function getSharedAuth(): Promise<SharedAuthPayload> {
  try {
    await sso.ensureAccessToken()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('NO_LOGIN') || message.includes('TOKEN_REFRESH')) {
      throw new SharedAuthError('SESSION_EXPIRED')
    }
    throw new SharedAuthError('AUTH_UNAVAILABLE', message)
  }

  const store = useAccessTokenStore()
  if (!store.tokenString || !store.client) {
    throw new SharedAuthError('SESSION_EXPIRED')
  }

  const tokenKid = await fetchIamKeyId(getSignHttpClient().client)

  return {
    token: store.tokenString,
    tokenKid,
    client: cloneClient(store.client),
  }
}
