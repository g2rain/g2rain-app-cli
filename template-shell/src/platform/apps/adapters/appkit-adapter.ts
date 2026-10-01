import type { MainPublicProps } from '@g2rain/platform/main'
import type { RuntimeAdapter } from '../../types/runtime-adapter'
import type { ShellMicroAppAdapter, ShellMicroAppMountInput } from './types'

/**
 * AppKit path: pass public props through; Auth Bridge stays on window CustomEvent.
 */
export function createAppkitAdapter(loader: RuntimeAdapter): ShellMicroAppAdapter {
  return {
    async mount(input: ShellMicroAppMountInput): Promise<void> {
      await loader.mount({
        instanceId: input.instanceId,
        entry: input.entry,
        container: input.container,
        props: input.props,
        name: input.name,
      })
    },

    async update(instanceId: string, props: Readonly<MainPublicProps>): Promise<void> {
      await loader.update(instanceId, props)
    },

    async unmount(instanceId: string): Promise<void> {
      await loader.unmount(instanceId)
    },

    has(instanceId: string): boolean {
      return loader.has(instanceId)
    },
  }
}
