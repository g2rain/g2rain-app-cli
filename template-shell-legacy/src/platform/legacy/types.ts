import type { MainPublicProps } from '@g2rain/platform/main'
import type { DpopClient } from '@g2rain/http'

/**
 * Private mount props for legacy sub-apps only.
 * Must not appear on Workspace, Definition, or @g2rain/platform/main types.
 * Never log these fields.
 */
export type LegacyMountProps = Readonly<MainPublicProps> &
  Readonly<{
    token?: string
    tokenKid?: string
    client?: DpopClient
  }>

export interface LegacyIntegrationSpec {
  protocolVersion: 'legacy'
}
