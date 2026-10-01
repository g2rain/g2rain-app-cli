import type { MainPublicProps } from '@g2rain/platform/main'

/**
 * Props accepted by the shared qiankun loader.
 * AppKit path uses MainPublicProps; legacy protocol adapters may add private fields
 * only at the loader boundary (never on Workspace / Definition / AppKit types).
 */
export type LoaderMountProps = Readonly<MainPublicProps> & Readonly<Record<string, unknown>>

/**
 * qiankun loadMicroApp / handle ownership stays in the Shell RuntimeAdapter.
 * Do not move loadMicroApp into @g2rain/platform.
 */
export interface RuntimeAdapter {
  mount(input: {
    instanceId: string
    entry: string
    /** Prefer CSS selector `#sub-app-container-{instanceId}` (main-shell style). */
    container: string | HTMLElement
    props: LoaderMountProps
    name: string
  }): Promise<void>
  update(instanceId: string, props: LoaderMountProps): Promise<void>
  unmount(instanceId: string): Promise<void>
  has(instanceId: string): boolean
}
