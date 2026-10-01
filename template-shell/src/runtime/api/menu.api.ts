import type { MenuItem, MenuItemType } from '../../platform/types/menu.type'
import type { WorkspaceView } from '../../platform/types/workspace'
import { getApplicationCode } from '../../shared/env'
import { getHttpClient } from '../http'
import type { AuthorityMenuVo } from './menu.type'

function mapShellPage(
  menuCode: string,
  linkPath: string | null,
): WorkspaceView['shellPage'] | undefined {
  const hay = `${menuCode} ${linkPath ?? ''}`.toLowerCase()
  if (hay.includes('passport')) return 'passport'
  if (hay.includes('tenant_provision') || hay.includes('tenant-provision')) {
    return 'tenant-provision'
  }
  if (hay.includes('overview') || hay.includes('home') || hay === 'main') {
    return 'overview'
  }
  return undefined
}

function convertMenuToMenuItem(serverMenu: AuthorityMenuVo): MenuItem | null {
  const shellAppCode = getApplicationCode()
  let type: MenuItemType

  if (serverMenu.applicationCode === shellAppCode) {
    const shellPage = mapShellPage(serverMenu.menuCode, serverMenu.linkPath)
    if (!shellPage) {
      // Shell menus without a known Workspace page are skipped (SHELL_MENUS cover locals).
      if (serverMenu.subMenus?.length) {
        type = 'group'
      } else {
        return null
      }
    } else {
      type = 'shell'
      const item: MenuItem = {
        key: String(serverMenu.id),
        menuCode: serverMenu.menuCode,
        title: serverMenu.menuName,
        type,
        shellPage,
        viewId:
          shellPage === 'overview'
            ? 'shell.overview'
            : shellPage === 'passport'
              ? 'shell.passport'
              : 'shell.tenant-provision',
        closable: shellPage !== 'overview',
      }
      if (serverMenu.subMenus?.length) {
        item.children = serverMenu.subMenus
          .map((child) => convertMenuToMenuItem(child))
          .filter((child): child is MenuItem => child !== null)
      }
      return item
    }
  } else if (!serverMenu.linkPath || serverMenu.linkPath.trim() === '') {
    type = 'group'
  } else {
    type = 'sub'
  }

  const menuItem: MenuItem = {
    key: String(serverMenu.id),
    menuCode: serverMenu.menuCode,
    title: serverMenu.menuName,
    type,
  }

  if (type === 'sub') {
    menuItem.applicationCode = serverMenu.applicationCode
    menuItem.name = serverMenu.applicationCode
    if (serverMenu.contextPath) {
      menuItem.activeRule = serverMenu.contextPath
    }
    // Entry origin comes from menus / Mock endpointUrl only — no local DEV override map.
    const entry = serverMenu.endpointUrl?.trim()
    if (entry) {
      menuItem.entry = entry
    }
    if (serverMenu.linkPath) {
      const path = serverMenu.linkPath.trim()
      if (!path.startsWith('/')) {
        console.warn('[MenuAPI] sub menu linkPath must start with /', {
          id: serverMenu.id,
          applicationCode: serverMenu.applicationCode,
          linkPath: serverMenu.linkPath,
        })
      } else {
        menuItem.routePath = path
      }
    }
  }

  if (serverMenu.subMenus?.length) {
    menuItem.children = serverMenu.subMenus
      .map((child) => convertMenuToMenuItem(child))
      .filter((child): child is MenuItem => child !== null)
  }

  return menuItem
}

/** GET /basis/authority/menus */
export async function getMenuList(): Promise<MenuItem[]> {
  const http = getHttpClient()
  const res = await http.client.get<AuthorityMenuVo[]>('/basis/authority/menus')
  const serverMenus = res.data || []
  const items = serverMenus
    .map((menu) => convertMenuToMenuItem(menu))
    .filter((menu): menu is MenuItem => menu !== null)
  console.info('[MenuAPI] getMenuList ok', { count: items.length })
  return items
}
