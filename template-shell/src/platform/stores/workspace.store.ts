import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { WorkspaceTab, WorkspaceView } from '../types/workspace'
import { microAppInstanceId, microAppTabId } from '../../shared/qiankun-id'
import { syncBrowserAddressForTab } from '../apps/sync-browser-url'
import { useRuntimeStore } from './runtime.store'

export const OVERVIEW_VIEW_ID = 'shell.overview'
export const OVERVIEW_TAB_ID = 'tab.shell.overview'

function createOverviewTab(): WorkspaceTab {
  return {
    tabId: OVERVIEW_TAB_ID,
    viewId: OVERVIEW_VIEW_ID,
    title: '首页',
    kind: 'shell',
    closable: false,
    shellPage: 'overview',
  }
}

export const useWorkspaceStore = defineStore('shell-workspace', () => {
  const tabs = ref<WorkspaceTab[]>([createOverviewTab()])
  const activeTabId = ref(OVERVIEW_TAB_ID)

  const activeTab = computed(
    () => tabs.value.find((tab) => tab.tabId === activeTabId.value) ?? tabs.value[0],
  )

  function openShellView(view: WorkspaceView): void {
    if (view.kind !== 'shell' || !view.shellPage) {
      throw new Error('openShellView requires a shell page view')
    }
    const existing = tabs.value.find((tab) => tab.viewId === view.viewId)
    if (existing) {
      activateTab(existing.tabId)
      return
    }
    const tab: WorkspaceTab = {
      tabId: `tab.${view.viewId}`,
      viewId: view.viewId,
      title: view.title,
      kind: 'shell',
      closable: view.closable,
      shellPage: view.shellPage,
    }
    tabs.value.push(tab)
    activateTab(tab.tabId)
  }

  function activateTab(tabId: string): void {
    const next = tabs.value.find((tab) => tab.tabId === tabId)
    if (!next) return
    const previous = activeTab.value
    if (previous?.kind === 'micro-app' && previous.instanceId && previous.tabId !== tabId) {
      useRuntimeStore().markInactive(previous.instanceId)
    }
    activeTabId.value = tabId
    syncBrowserAddressForTab(next)
  }

  async function closeTab(tabId: string): Promise<void> {
    const index = tabs.value.findIndex((tab) => tab.tabId === tabId)
    if (index < 0) return
    const tab = tabs.value[index]
    if (!tab.closable) return

    if (tab.kind === 'micro-app' && tab.instanceId) {
      await useRuntimeStore().destroyInstance(tab.instanceId)
    }

    const wasActive = activeTabId.value === tabId
    tabs.value.splice(index, 1)

    if (!wasActive) return

    const right = tabs.value[index]
    const left = tabs.value[index - 1]
    const fallback = right ?? left ?? tabs.value.find((item) => item.tabId === OVERVIEW_TAB_ID)
    if (fallback) {
      activateTab(fallback.tabId)
    } else {
      tabs.value = [createOverviewTab()]
      activeTabId.value = OVERVIEW_TAB_ID
      syncBrowserAddressForTab(tabs.value[0])
    }
  }

  /**
   * Remove a micro-app Tab after mount failure (instance already rolled back by RuntimeStore).
   */
  async function discardFailedMicroAppTab(tabId: string): Promise<void> {
    const index = tabs.value.findIndex((tab) => tab.tabId === tabId)
    if (index < 0) return
    const tab = tabs.value[index]
    if (tab.kind !== 'micro-app') return

    console.info('[WorkspaceStore] discardFailedMicroAppTab', {
      tabId,
      instanceId: tab.instanceId,
      viewId: tab.viewId,
      applicationCode: tab.applicationCode,
    })

    if (tab.instanceId) {
      const runtime = useRuntimeStore()
      if (runtime.instances.has(tab.instanceId)) {
        await runtime.destroyInstance(tab.instanceId).catch(() => undefined)
      }
    }

    const wasActive = activeTabId.value === tabId
    tabs.value.splice(index, 1)

    if (!wasActive) return

    const right = tabs.value[index]
    const left = tabs.value[index - 1]
    const fallback = right ?? left ?? tabs.value.find((item) => item.tabId === OVERVIEW_TAB_ID)
    if (fallback) {
      activateTab(fallback.tabId)
    } else {
      tabs.value = [createOverviewTab()]
      activeTabId.value = OVERVIEW_TAB_ID
      syncBrowserAddressForTab(tabs.value[0])
    }
  }

  /**
   * Open trusted micro-app view.
   * Dedupes by applicationCode + viewId. instanceId = appKey = `${applicationCode}:${viewId}`.
   * Does NOT put instanceId into loadMicroApp name.
   */
  async function openMicroAppView(view: WorkspaceView): Promise<void> {
    if (view.kind !== 'micro-app' || !view.applicationCode) {
      throw new Error('openMicroAppView requires a micro-app view with applicationCode')
    }
    if (!view.initialRoute || !view.initialRoute.startsWith('/')) {
      throw new Error(
        `openMicroAppView requires initialRoute starting with "/": viewId=${view.viewId}`,
      )
    }

    const runtime = useRuntimeStore()
    if (!runtime.definitions.has(view.applicationCode)) {
      throw new Error(
        `Unknown applicationCode "${view.applicationCode}". Register MicroAppDefinition from authority menus first.`,
      )
    }

    const existing = tabs.value.find(
      (tab) =>
        tab.kind === 'micro-app' &&
        tab.applicationCode === view.applicationCode &&
        tab.viewId === view.viewId,
    )
    if (existing) {
      activateTab(existing.tabId)
      return
    }

    const instanceId = microAppInstanceId(view.applicationCode, view.viewId)
    const tabId = microAppTabId(view.applicationCode, view.viewId)
    console.info('[WorkspaceStore] openMicroAppView', {
      viewId: view.viewId,
      instanceId,
      tabId,
      applicationCode: view.applicationCode,
      title: view.title,
      initialRoute: view.initialRoute,
    })
    const tab: WorkspaceTab = {
      tabId,
      viewId: view.viewId,
      title: view.title,
      kind: 'micro-app',
      closable: view.closable,
      applicationCode: view.applicationCode,
      instanceId,
      initialRoute: view.initialRoute,
    }
    tabs.value.push(tab)
    activateTab(tab.tabId)
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openShellView,
    openMicroAppView,
    activateTab,
    closeTab,
    discardFailedMicroAppTab,
  }
})
