<template>
  <aside class="shell-sidebar">
    <nav>
      <SidebarMenuNode
        v-for="item in menuItems"
        :key="item.key"
        :item="item"
        :active-view-id="activeViewId"
        @select="onSelect"
      />
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { MenuItem } from '../../platform/types/menu.type'
import type { WorkspaceView } from '../../platform/types/workspace'
import { microAppViewIdFromMenuKey } from '../../shared/qiankun-id'
import { useMenuStore } from '../../platform/stores/menu.store'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'
import SidebarMenuNode from './SidebarMenuNode.vue'

const menuStore = useMenuStore()
const workspace = useWorkspaceStore()
const { menuItems } = storeToRefs(menuStore)
const { activeTab } = storeToRefs(workspace)
const activeViewId = computed(() => activeTab.value?.viewId)

function onSelect(item: MenuItem): void {
  if (item.type === 'group') return

  if (item.type === 'shell' && item.shellPage && item.viewId) {
    workspace.openShellView({
      viewId: item.viewId,
      title: item.title,
      kind: 'shell',
      closable: item.closable ?? true,
      shellPage: item.shellPage,
    })
    return
  }

  if (item.type === 'sub' && item.name) {
    // viewId = menu key; instanceId = applicationCode:viewId (not used as qiankun name).
    const viewId = item.viewId ?? microAppViewIdFromMenuKey(item.key)
    // routePath/linkPath is the sub-app INTERNAL route (may equal contextPath, e.g. /member).
    const initialRoute = item.routePath?.trim()
    if (!initialRoute || !initialRoute.startsWith('/')) {
      console.error('[Sidebar] micro-app menu missing internal route', {
        key: item.key,
        viewId,
        applicationCode: item.name,
        routePath: item.routePath,
      })
      return
    }
    console.info('[Sidebar] open sub menu', {
      key: item.key,
      viewId,
      applicationCode: item.name,
      title: item.title,
      entry: item.entry,
      activeRule: item.activeRule,
      initialRoute,
    })
    const view: WorkspaceView = {
      viewId,
      title: item.title,
      kind: 'micro-app',
      closable: true,
      applicationCode: item.name,
      initialRoute,
    }
    void workspace.openMicroAppView(view).catch((error: unknown) => {
      console.error('[Sidebar] openMicroAppView failed:', error)
    })
  }
}
</script>

<style scoped>
.shell-sidebar {
  width: 200px;
  border-right: 1px solid var(--g2-border-color-light, #eee);
  background: var(--g2-bg-container);
  overflow: auto;
}

.shell-sidebar nav {
  padding: 4px 0;
}

/* Align with main-shell / Element Plus vertical menu */
:deep(.menu-item),
:deep(.menu-group-title) {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 50px;
  box-sizing: border-box;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--g2-text-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  padding: 0 20px;
  border-radius: 0;
  cursor: pointer;
  margin: 0;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

:deep(.menu-group-title:not(.expandable)) {
  cursor: default;
}

/* Hover: primary tint background (EP --el-menu-hover-bg-color) */
:deep(.menu-item:hover),
:deep(.menu-group-title.expandable:hover) {
  background-color: color-mix(in srgb, var(--g2-color-primary) 10%, var(--g2-bg-container));
}

/* Active leaf: primary text only — distinct from hover */
:deep(.menu-item.active) {
  color: var(--g2-color-primary);
  background-color: transparent;
}

:deep(.menu-item.active:hover) {
  background-color: color-mix(in srgb, var(--g2-color-primary) 10%, var(--g2-bg-container));
  color: var(--g2-color-primary);
}

/* Nested level: shorter row + indent (EP sub-item) */
:deep(.menu-children .menu-item),
:deep(.menu-children .menu-group-title) {
  min-height: 44px;
  padding-left: 40px;
}

:deep(.menu-children .menu-children .menu-item),
:deep(.menu-children .menu-children .menu-group-title) {
  padding-left: 60px;
}

:deep(.menu-children .menu-children .menu-children .menu-item),
:deep(.menu-children .menu-children .menu-children .menu-group-title) {
  padding-left: 80px;
}

:deep(.menu-item .menu-label),
:deep(.menu-group-title .menu-label) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.menu-caret) {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: auto;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 5px solid currentColor;
  opacity: 0.65;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

:deep(.expanded > .menu-caret) {
  transform: rotate(90deg);
}

:deep(.menu-children) {
  padding-left: 0;
}
</style>
