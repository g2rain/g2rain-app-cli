import { emitDirectedMessage } from './emit-directed-message'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import {
  getSharedAuth,
  SharedAuthError,
  type SharedAuthPayload,
} from '../../runtime/auth/shared-auth'
import type { RuntimeInstanceStatus } from '../../platform/types/workspace'

const REQUEST_TOKEN = 'g2rain:sub-app:request-token'
const TOKEN_RESPONSE = 'g2rain:main-app:token-response'
const TOKEN_ERROR = 'g2rain:main-app:token-error'

const ALLOWED_STATUS: ReadonlySet<RuntimeInstanceStatus> = new Set([
  'loading',
  'mounted',
  'inactive',
])

export type AuthErrorCode =
  | 'UNAUTHORIZED_INSTANCE'
  | 'SESSION_EXPIRED'
  | 'AUTH_TIMEOUT'
  | 'AUTH_UNAVAILABLE'

interface RequestTokenDetail {
  type?: string
  requestId?: string
  instanceId?: string
  appKey?: string
  applicationCode?: string
  viewId?: string
  data?: { reason?: string }
  timestamp?: number
}

const pendingAuthByInstance = new Map<string, Promise<SharedAuthPayload>>()
let started = false
let bridgeOpen = true

/** Stop accepting REQUEST_TOKEN (logout). In-flight emits are skipped after instance teardown. */
export function closeAuthBridge(): void {
  bridgeOpen = false
  pendingAuthByInstance.clear()
}

export function openAuthBridge(): void {
  bridgeOpen = true
}

export function clearPendingAuthForInstance(instanceId: string): void {
  pendingAuthByInstance.delete(instanceId)
}

/**
 * Sub → Main REQUEST_TOKEN → getSharedAuth → Main → Sub TOKEN_RESPONSE | TOKEN_ERROR.
 * Never console.log message detail (may contain tokens / client).
 */
export function startRequestTokenHandler(): void {
  if (started || typeof window === 'undefined') return
  started = true
  bridgeOpen = true

  window.addEventListener(REQUEST_TOKEN, ((event: Event) => {
    void handleRequestToken(event)
  }) as EventListener)
}

async function handleRequestToken(event: Event): Promise<void> {
  const detail = (event as CustomEvent<RequestTokenDetail>).detail
  if (!detail || typeof detail !== 'object') return

  const requestId = typeof detail.requestId === 'string' ? detail.requestId.trim() : ''
  const instanceId =
    (typeof detail.instanceId === 'string' && detail.instanceId.trim()) ||
    (typeof detail.appKey === 'string' && detail.appKey.trim()) ||
    ''
  const applicationCode =
    typeof detail.applicationCode === 'string' ? detail.applicationCode.trim() : ''
  const viewId = typeof detail.viewId === 'string' ? detail.viewId.trim() : ''
  const appKey = typeof detail.appKey === 'string' ? detail.appKey.trim() : instanceId

  if (!instanceId || !requestId) {
    return
  }

  const identity = {
    applicationCode: applicationCode || 'unknown',
    viewId: viewId || 'unknown',
    instanceId,
    appKey: appKey || instanceId,
  }

  if (!bridgeOpen) {
    emitAuthError(identity, requestId, 'SESSION_EXPIRED')
    return
  }

  const runtime = useRuntimeStore()
  const instance = runtime.instances.get(instanceId)
  if (!instance) {
    emitAuthError(identity, requestId, 'UNAUTHORIZED_INSTANCE')
    return
  }

  if (appKey && appKey !== instanceId) {
    emitAuthError(
      {
        applicationCode: instance.applicationCode,
        viewId: instance.viewId,
        instanceId: instance.instanceId,
        appKey: instance.instanceId,
      },
      requestId,
      'UNAUTHORIZED_INSTANCE',
    )
    return
  }

  if (
    (applicationCode && applicationCode !== instance.applicationCode) ||
    (viewId && viewId !== instance.viewId)
  ) {
    emitAuthError(
      {
        applicationCode: instance.applicationCode,
        viewId: instance.viewId,
        instanceId: instance.instanceId,
        appKey: instance.instanceId,
      },
      requestId,
      'UNAUTHORIZED_INSTANCE',
    )
    return
  }

  if (!ALLOWED_STATUS.has(instance.status)) {
    emitAuthError(
      {
        applicationCode: instance.applicationCode,
        viewId: instance.viewId,
        instanceId: instance.instanceId,
        appKey: instance.instanceId,
      },
      requestId,
      'UNAUTHORIZED_INSTANCE',
    )
    return
  }

  if (!runtime.definitions.has(instance.applicationCode)) {
    emitAuthError(
      {
        applicationCode: instance.applicationCode,
        viewId: instance.viewId,
        instanceId: instance.instanceId,
        appKey: instance.instanceId,
      },
      requestId,
      'UNAUTHORIZED_INSTANCE',
    )
    return
  }

  const target = {
    applicationCode: instance.applicationCode,
    viewId: instance.viewId,
    instanceId: instance.instanceId,
    appKey: instance.instanceId,
  }

  try {
    const auth = await getOrCreatePendingAuth(instance.instanceId)
    if (!bridgeOpen || !runtime.instances.has(instance.instanceId)) {
      return
    }
    emitDirectedMessage({
      type: TOKEN_RESPONSE,
      data: {
        token: auth.token,
        tokenKid: auth.tokenKid,
        client: auth.client,
      },
      applicationCode: target.applicationCode,
      viewId: target.viewId,
      instanceId: target.instanceId,
      appKey: target.appKey,
      timestamp: Date.now(),
      requestId,
    })
  } catch (error) {
    if (!bridgeOpen || !runtime.instances.has(instance.instanceId)) {
      return
    }
    const code =
      error instanceof SharedAuthError
        ? error.code
        : ('AUTH_UNAVAILABLE' as AuthErrorCode)
    emitAuthError(target, requestId, code)
  }
}

function getOrCreatePendingAuth(instanceId: string): Promise<SharedAuthPayload> {
  const existing = pendingAuthByInstance.get(instanceId)
  if (existing) return existing

  const pending = getSharedAuth().finally(() => {
    pendingAuthByInstance.delete(instanceId)
  })
  pendingAuthByInstance.set(instanceId, pending)
  return pending
}

function emitAuthError(
  identity: {
    applicationCode: string
    viewId: string
    instanceId: string
    appKey: string
  },
  requestId: string,
  code: AuthErrorCode,
): void {
  emitDirectedMessage({
    type: TOKEN_ERROR,
    data: { code },
    applicationCode: identity.applicationCode,
    viewId: identity.viewId,
    instanceId: identity.instanceId,
    appKey: identity.appKey,
    timestamp: Date.now(),
    requestId,
  })
}
