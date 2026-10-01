/** Shared utilities for the Main Shell template. External modules must import from this barrel. */

export {
  awaitRuntimeEnvConfig,
  getApplicationCode,
  getAuthEndPoint,
  getBackendOrigin,
  getContextPath,
  getPathWithContextPath,
  getRedirectUriPath,
  getSsoBaseUrl,
  getTokenEndPoint,
  isAuthPublicPath,
} from './env'
export { Generator } from './id'
export { generateClient, publicKeyStringToJwk } from './jwt'
export { PROJECT_NAME } from './project'
export { normalizeContextPath, resolveEntryOrigin } from './context-path'
export {
  joinUrlSegments,
  resolveMicroAppEntry,
  replaceBrowserPathname,
  stripActiveRule,
  wrapActiveRule,
} from './url'
export {
  microAppContainerId,
  microAppContainerSelector,
  microAppInstanceId,
  microAppTabId,
  microAppViewIdFromMenuKey,
  toQiankunSafeId,
} from './qiankun-id'

export function assertNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}
