import type { RuntimeAdapter } from '../../types/runtime-adapter'
import { createAppkitAdapter } from './appkit-adapter'
import type { AdapterResolver, ShellMicroAppAdapter } from './types'

export type {
  AdapterResolver,
  ShellMicroAppAdapter,
  ShellMicroAppMountInput,
} from './types'
export { createAppkitAdapter } from './appkit-adapter'

/** Default resolver: every applicationCode uses the AppKit protocol adapter. */
export function createAppkitAdapterResolver(loader: RuntimeAdapter): AdapterResolver {
  const appkit: ShellMicroAppAdapter = createAppkitAdapter(loader)
  return () => appkit
}
