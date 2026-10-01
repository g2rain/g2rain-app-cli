import type { WorkspaceView } from './workspace'

/** Shell-local page, folder, or micro-app leaf. */
export type MenuItemType = 'shell' | 'group' | 'sub'

export interface MenuItem {
  key: string
  menuCode: string
  title: string
  type: MenuItemType
  children?: MenuItem[]

  /** Shell Workspace page key when type === 'shell'. */
  shellPage?: WorkspaceView['shellPage']
  viewId?: string
  closable?: boolean

  /** Sub-app fields when type === 'sub'. */
  applicationCode?: string
  /** Runtime application identity (same as applicationCode for sub). */
  name?: string
  activeRule?: string
  entry?: string
  /** Sub-app initial path (from AuthorityMenuVo.linkPath). */
  routePath?: string
}
