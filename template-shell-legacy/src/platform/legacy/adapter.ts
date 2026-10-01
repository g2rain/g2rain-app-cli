import type { MainPublicProps } from '@g2rain/platform/main'
import type { LoaderMountProps, RuntimeAdapter } from '../types/runtime-adapter'
import {
  createAppkitAdapter,
  type AdapterResolver,
  type ShellMicroAppAdapter,
  type ShellMicroAppMountInput,
} from '../apps/adapters'
import { cloneClient, getSharedAuth } from '../../runtime/auth/shared-auth'
import { isLegacyApplication } from './registry'
import type { LegacyMountProps } from './types'

/**
 * Merge Shell session into mount/update props for legacy sub-apps.
 * Never log token / tokenKid / client.
 */
async function withLegacyTokenProps(
  publicProps: Readonly<MainPublicProps>,
): Promise<LegacyMountProps> {
  const auth = await getSharedAuth()
  return {
    ...publicProps,
    token: auth.token,
    tokenKid: auth.tokenKid,
    client: cloneClient(auth.client),
  }
}

function createLegacyAdapter(loader: RuntimeAdapter): ShellMicroAppAdapter {
  return {
    async mount(input: ShellMicroAppMountInput): Promise<void> {
      const props = await withLegacyTokenProps(input.props)
      await loader.mount({
        instanceId: input.instanceId,
        entry: input.entry,
        container: input.container,
        props: props as LoaderMountProps,
        name: input.name,
      })
    },

    async update(instanceId: string, props: Readonly<MainPublicProps>): Promise<void> {
      const next = await withLegacyTokenProps(props)
      await loader.update(instanceId, next as LoaderMountProps)
    },

    async unmount(instanceId: string): Promise<void> {
      await loader.unmount(instanceId)
    },

    has(instanceId: string): boolean {
      return loader.has(instanceId)
    },
  }
}

/**
 * Registry-aware resolver: legacy codes get Token-in-props adapter; others AppKit.
 * Reuses the shared qiankun loader (single handle map).
 */
export function createLegacyAwareAdapterResolver(loader: RuntimeAdapter): AdapterResolver {
  const appkit = createAppkitAdapter(loader)
  const legacy = createLegacyAdapter(loader)

  return (applicationCode: string): ShellMicroAppAdapter => {
    return isLegacyApplication(applicationCode) ? legacy : appkit
  }
}
