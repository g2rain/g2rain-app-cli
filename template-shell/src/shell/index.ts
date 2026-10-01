/**
 * Shell module public exports.
 * Layout, menus and shell-local pages — import from this barrel, not deep paths.
 */

export { default as MainLayout } from './layout/MainLayout.vue'
export { default as Header } from './layout/Header.vue'
export { default as Sidebar } from './layout/Sidebar.vue'
export { default as TabBar } from './layout/TabBar.vue'
export { default as Workspace } from './layout/Workspace.vue'

export { default as OverviewPage } from './pages/OverviewPage.vue'
export { default as PassportPage } from './pages/PassportPage.vue'
export { default as TenantProvisionPage } from './pages/TenantProvisionPage.vue'

export {
  SHELL_MENUS,
  shellMenusAsMenuItems,
  type ShellMenuItem,
  type ShellMenuGroup,
  type ShellMenuNode,
} from './menu'
