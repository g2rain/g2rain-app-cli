import type { LegacyIntegrationSpec } from './types'

/**
 * Legacy-only applicationCode registry.
 * Unlisted codes use AppKit. Do not add new AppKit apps here.
 * Start empty; register codes only during an active migration.
 */
export const LEGACY_APPLICATION_REGISTRY: Record<string, LegacyIntegrationSpec> = {
  // Example (do not ship business codes in the template overlay):
  // 'g2rain-manager-app': { protocolVersion: 'legacy' },
}

export function isLegacyApplication(applicationCode: string): boolean {
  const code = applicationCode.trim()
  if (!code) return false
  return Object.prototype.hasOwnProperty.call(LEGACY_APPLICATION_REGISTRY, code)
}

export function getLegacyIntegration(
  applicationCode: string,
): LegacyIntegrationSpec | undefined {
  const code = applicationCode.trim()
  if (!code) return undefined
  return LEGACY_APPLICATION_REGISTRY[code]
}
