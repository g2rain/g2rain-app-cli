/** Stable application identity from a trusted catalog (not a runtime instance key). */
export interface MicroAppDefinition {
  applicationCode: string
  name: string
  entry: string
  /**
   * Sub-app route prefix for public props (not the Shell VITE_CONTEXT_PATH).
   * Example: `/member`.
   */
  contextPath: string
  activeRule: string
}

/** Workspace / Tab view opened by Shell or a micro-app. */
export type WorkspaceViewKind = 'shell' | 'micro-app'

export interface WorkspaceView {
  viewId: string
  title: string
  kind: WorkspaceViewKind
  /** Fixed overview tab cannot be closed. */
  closable: boolean
  /** Shell-local route component key when kind === 'shell'. */
  shellPage?: 'overview' | 'passport' | 'tenant-provision'
  applicationCode?: string
  /**
   * Sub-app internal route for this menu (e.g. `/member_identity`).
   * Not the Shell Context Path; not the same as activeRule/contextPath duties.
   */
  initialRoute?: string
}

export type RuntimeInstanceStatus =
  | 'created'
  | 'loading'
  | 'mounted'
  | 'inactive'
  | 'unmounted'

/**
 * One running micro-app instance. instanceId is the sole runtime key;
 * migration-era appKey must equal instanceId.
 */
export interface RuntimeInstance {
  instanceId: string
  applicationCode: string
  viewId: string
  status: RuntimeInstanceStatus
  containerId: string
  /** Sub-app internal route opened with this instance. */
  initialRoute?: string
  /**
   * Last known sub-app internal path (from route-change).
   * Used when re-activating a Tab to restore the browser address bar.
   */
  lastActivePath?: string
}

export interface WorkspaceTab {
  tabId: string
  viewId: string
  title: string
  kind: WorkspaceViewKind
  closable: boolean
  shellPage?: WorkspaceView['shellPage']
  applicationCode?: string
  instanceId?: string
  /** Sub-app internal route; passed to mount public props. */
  initialRoute?: string
}
