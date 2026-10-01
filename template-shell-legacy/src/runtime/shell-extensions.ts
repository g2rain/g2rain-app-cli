import {
  getSharedRuntimeLoader,
  setAdapterResolver,
} from '../platform/stores/runtime.store'
import { createLegacyAwareAdapterResolver } from '../platform/legacy/adapter'
import { startLegacyMessageBridge } from '../components/micro-app/legacy-message-bridge'

/**
 * `--with-legacy` overlay: install registry-aware AdapterResolver and legacy message bridge.
 * Does not fork RuntimeStore; reuses the shared qiankun loader.
 */
export function installShellExtensions(): void {
  setAdapterResolver(createLegacyAwareAdapterResolver(getSharedRuntimeLoader()))
  startLegacyMessageBridge()
}
