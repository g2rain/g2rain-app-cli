import { emitDirectedMessage } from './emit-directed-message'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'
import { sso } from '../../runtime/auth/sso'
import { cloneClient } from '../../runtime/auth/shared-auth'
import { isLegacyApplication } from '../../platform/legacy/registry'
import {
  hasAmbiguousLegacyInstances,
  resolveLegacyInstance,
} from '../../platform/legacy/resolve-instance'
import type { RuntimeInstance } from '../../platform/types/workspace'

const TOKEN_INVALID = 'g2rain:sub-app:token-invalid'
const TOKEN_RESPONSE = 'g2rain:main-app:token-response'
const TOKEN_ERROR = 'g2rain:main-app:token-error'

interface LegacyTokenInvalidDetail {
  type?: string
  requestId?: string
  instanceId?: string
  appKey?: string
  applicationCode?: string
  viewId?: string
  data?: {
    applicationCode?: string
    source?: string
    reason?: string
  }
  timestamp?: number
}

let started = false

/**
 * Normalize Manager-style TOKEN_INVALID (data.applicationCode only, no top-level
 * instanceId/appKey) onto a concrete RuntimeInstance, then refresh + directed response.
 *
 * Protocol selection uses legacy registry only — never MicroAppDefinition fields.
 * AppKit messages that already carry instanceId/appKey are ignored here.
 * Never log token / full message payloads.
 */
export function startLegacyMessageBridge(): void {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener(TOKEN_INVALID, ((event: Event) => {
    void handleLegacyTokenInvalid(event)
  }) as EventListener)
}

async function handleLegacyTokenInvalid(event: Event): Promise<void> {
  const detail = (event as CustomEvent<LegacyTokenInvalidDetail>).detail
  if (!detail || typeof detail !== 'object') return

  const topInstanceId =
    (typeof detail.instanceId === 'string' && detail.instanceId.trim()) ||
    (typeof detail.appKey === 'string' && detail.appKey.trim()) ||
    ''
  // AppKit / normalized messages: leave to startTokenInvalidHandler.
  if (topInstanceId) return

  const applicationCode =
    (typeof detail.data?.applicationCode === 'string' && detail.data.applicationCode.trim()) ||
    (typeof detail.applicationCode === 'string' && detail.applicationCode.trim()) ||
    ''
  if (!applicationCode) {
    console.warn('[LegacyMessageBridge] TOKEN_INVALID missing applicationCode, ignore')
    return
  }

  if (!isLegacyApplication(applicationCode)) {
    console.warn('[LegacyMessageBridge] applicationCode not in legacy registry, ignore', {
      applicationCode,
    })
    return
  }

  const runtime = useRuntimeStore()
  const workspace = useWorkspaceStore()
  const resolveInput = {
    applicationCode,
    activeTab: workspace.activeTab,
    instances: runtime.instances.values(),
  }

  const resolved = resolveLegacyInstance(resolveInput)
  if (!resolved) {
    if (hasAmbiguousLegacyInstances(resolveInput)) {
      console.warn('[LegacyMessageBridge] multiple instances; need active Tab — not routing', {
        applicationCode,
      })
    } else {
      console.warn('[LegacyMessageBridge] cannot resolve instance for TOKEN_INVALID', {
        applicationCode,
      })
    }
    return
  }

  const instance = runtime.instances.get(resolved.instanceId)
  if (!instance) {
    console.warn('[LegacyMessageBridge] resolved instance missing from RuntimeStore', {
      applicationCode,
      instanceId: resolved.instanceId,
    })
    return
  }

  await respondWithRefreshedToken(instance, detail.requestId)
}

async function respondWithRefreshedToken(
  instance: RuntimeInstance,
  requestId?: string,
): Promise<void> {
  const runtime = useRuntimeStore()
  try {
    const result = await sso.refreshToken()
    if (!runtime.instances.has(instance.instanceId)) return

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
      ...(requestId ? { requestId } : {}),
    })
  } catch (error) {
    console.error('[LegacyMessageBridge] TOKEN_INVALID refresh failed', {
      applicationCode: instance.applicationCode,
    })
    void error
    if (!runtime.instances.has(instance.instanceId)) return
    emitDirectedMessage({
      type: TOKEN_ERROR,
      data: { code: 'SESSION_EXPIRED' },
      applicationCode: instance.applicationCode,
      viewId: instance.viewId,
      instanceId: instance.instanceId,
      appKey: instance.instanceId,
      timestamp: Date.now(),
      ...(requestId ? { requestId } : {}),
    })
  }
}
