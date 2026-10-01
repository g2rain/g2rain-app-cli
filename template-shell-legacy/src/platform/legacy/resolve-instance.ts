/** Structural instance shape for legacy TOKEN_INVALID routing (avoids core-type coupling). */
export interface LegacyResolvableInstance {
  instanceId: string
  applicationCode: string
  status: string
}

export interface LegacyInstanceResolveInput {
  applicationCode: string
  activeTab?: {
    kind?: string
    applicationCode?: string
    instanceId?: string
  } | null
  instances: Iterable<LegacyResolvableInstance>
}

function isLiveStatus(status: string): boolean {
  return status === 'loading' || status === 'mounted' || status === 'inactive'
}

/**
 * Prefer the active Tab instance for this applicationCode; else the sole live instance.
 * When multiple live instances and no active Tab match: return null (do not guess).
 */
export function resolveLegacyInstance(
  input: LegacyInstanceResolveInput,
): LegacyResolvableInstance | null {
  const applicationCode = input.applicationCode.trim()
  if (!applicationCode) return null

  const active = input.activeTab
  if (
    active?.kind === 'micro-app' &&
    active.applicationCode === applicationCode &&
    active.instanceId
  ) {
    for (const item of input.instances) {
      if (item.instanceId === active.instanceId) {
        return item
      }
    }
  }

  const candidates = [...input.instances].filter(
    (item) => item.applicationCode === applicationCode && isLiveStatus(item.status),
  )

  if (candidates.length === 1) {
    return candidates[0] ?? null
  }

  return null
}

export function hasAmbiguousLegacyInstances(input: LegacyInstanceResolveInput): boolean {
  const applicationCode = input.applicationCode.trim()
  if (!applicationCode) return false
  if (resolveLegacyInstance(input)) return false

  const candidates = [...input.instances].filter(
    (item) => item.applicationCode === applicationCode && isLiveStatus(item.status),
  )
  return candidates.length > 1
}
