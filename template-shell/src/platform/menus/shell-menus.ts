import type { MenuItem } from '../types/menu.type'
import type { WorkspaceView } from '../types/workspace'

/** Default Shell-local menus — always prepended before backend authority menus. */
export interface ShellMenuItem {
  key: string
  title: string
  view: WorkspaceView
}

export interface ShellMenuGroup {
  key: string
  title: string
  children: ShellMenuItem[]
}

export type ShellMenuNode = ShellMenuItem | ShellMenuGroup

function isShellMenuGroup(node: ShellMenuNode): node is ShellMenuGroup {
  return 'children' in node && Array.isArray(node.children)
}

/** Home + Init group — aligned with main-shell createDefaultMenus(). */
export const SHELL_MENUS: ShellMenuNode[] = [
  {
    key: 'overview',
    title: '首页',
    view: {
      viewId: 'shell.overview',
      title: '首页',
      kind: 'shell',
      closable: false,
      shellPage: 'overview',
    },
  },
  {
    key: 'init',
    title: '初始化',
    children: [
      {
        key: 'passport',
        title: '账号管理',
        view: {
          viewId: 'shell.passport',
          title: '账号管理',
          kind: 'shell',
          closable: true,
          shellPage: 'passport',
        },
      },
      {
        key: 'tenant-provision',
        title: '租户初始化',
        view: {
          viewId: 'shell.tenant-provision',
          title: '租户初始化',
          kind: 'shell',
          closable: true,
          shellPage: 'tenant-provision',
        },
      },
    ],
  },
]

function shellItemAsMenuItem(item: ShellMenuItem): MenuItem {
  return {
    key: `shell.${item.key}`,
    menuCode: item.key,
    title: item.title,
    type: 'shell',
    shellPage: item.view.shellPage,
    viewId: item.view.viewId,
    closable: item.view.closable,
  }
}

/** Convert static SHELL_MENUS into MenuItem nodes for the Sidebar tree. */
export function shellMenusAsMenuItems(): MenuItem[] {
  return SHELL_MENUS.map((node) => {
    if (isShellMenuGroup(node)) {
      return {
        key: `shell.${node.key}`,
        menuCode: node.key,
        title: node.title,
        type: 'group' as const,
        children: node.children.map(shellItemAsMenuItem),
      }
    }
    return shellItemAsMenuItem(node)
  })
}
