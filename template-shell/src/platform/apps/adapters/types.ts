import type { MainPublicProps } from '@g2rain/platform/main'

/**
 * Protocol adapter port used by RuntimeStore via AdapterResolver.
 * Input props stay MainPublicProps; legacy may widen only at the loader boundary.
 */
export interface ShellMicroAppMountInput {
  instanceId: string
  entry: string
  container: string | HTMLElement
  props: Readonly<MainPublicProps>
  name: string
}

export interface ShellMicroAppAdapter {
  mount(input: ShellMicroAppMountInput): Promise<void>
  update(instanceId: string, props: Readonly<MainPublicProps>): Promise<void>
  unmount(instanceId: string): Promise<void>
  has(instanceId: string): boolean
}

export type AdapterResolver = (applicationCode: string) => ShellMicroAppAdapter
