import { emitDirectedMessage } from './emit-directed-message'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import { sso } from '../../runtime/auth/sso'
import { cloneClient } from '../../runtime/auth/shared-auth'

const TOKEN_INVALID = 'g2rain:sub-app:token-invalid'
const TOKEN_RESPONSE = 'g2rain:main-app:token-response'
const TOKEN_ERROR = 'g2rain:main-app:token-error'

interface TokenInvalidDetail {
  type?: string
  requestId?: string
  instanceId?: string
  appKey?: string
  applicationCode?: string
  viewId?: string
  data?: unknown
  timestamp?: number
}

let started = false

/**
 * Sub → Main TOKEN_INVALID → refresh → Main → Sub TOKEN_RESPONSE (+ client copy).
 * Does not self-listen TOKEN_RESPONSE.
 * Never console.log message detail (may contain tokens).
 */
export function startTokenInvalidHandler(): void {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener(TOKEN_INVALID, ((event: Event) => {
    void handleTokenInvalid(event)
  }) as EventListener)
}

async function handleTokenInvalid(event: Event): Promise<void> {
  const detail = (event as CustomEvent<TokenInvalidDetail>).detail
  if (!detail || typeof detail !== 'object') return

  const instanceId =
    (typeof detail.instanceId === 'string' && detail.instanceId.trim()) ||
    (typeof detail.appKey === 'string' && detail.appKey.trim()) ||
    ''
  if (!instanceId) return

  const runtime = useRuntimeStore()
  const instance = runtime.instances.get(instanceId)
  if (!instance) return

  try {
    const result = await sso.refreshToken()
    if (!runtime.instances.has(instanceId)) return

    const client = result.client ? cloneClient(result.client) : undefined
    emitDirectedMessage({
      type: TOKEN_RESPONSE,
      data: {
        token: result.token,
        tokenKid: result.tokenKid,
        ...(client ? { client } : {}),
      },
      applicationCode: instance.applicationCode,
      viewId: instance.viewId,
      instanceId: instance.instanceId,
      appKey: instance.instanceId,
      timestamp: Date.now(),
      ...(detail.requestId ? { requestId: detail.requestId } : {}),
    })
  } catch (error) {
    console.error('[shell] TOKEN_INVALID refresh failed')
    void error
    if (!runtime.instances.has(instanceId)) return
    emitDirectedMessage({
      type: TOKEN_ERROR,
      data: { code: 'SESSION_EXPIRED' },
      applicationCode: instance.applicationCode,
      viewId: instance.viewId,
      instanceId: instance.instanceId,
      appKey: instance.instanceId,
      timestamp: Date.now(),
      ...(detail.requestId ? { requestId: detail.requestId } : {}),
    })
  }
}
