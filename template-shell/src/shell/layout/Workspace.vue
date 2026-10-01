<template>
  <main class="workspace">
    <template v-for="tab in tabs" :key="tab.tabId">
      <section
        v-if="tab.kind === 'micro-app' && tab.instanceId"
        v-show="tab.tabId === activeTabId"
        class="micro-slot"
      >
        <p v-if="mountErrors[tab.tabId]" class="mount-error">{{ mountErrors[tab.tabId] }}</p>
        <p v-else-if="isTabLoading(tab)" class="mount-status">子应用加载中…</p>
        <div :id="microAppContainerId(tab.instanceId)" class="micro-container" />
      </section>
    </template>

    <OverviewPage v-if="shellPage === 'overview'" />
    <PassportPage v-else-if="shellPage === 'passport'" />
    <TenantProvisionPage v-else-if="shellPage === 'tenant-provision'" />
    <section
      v-else-if="activeTab?.kind === 'shell' && !shellPage"
      class="shell-page empty"
    >
      <p>当前 Tab 没有可渲染的 Shell 页面。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import type { WorkspaceTab } from '../../platform/types/workspace'
import { microAppContainerId, microAppContainerSelector } from '../../shared/qiankun-id'
import OverviewPage from '../pages/OverviewPage.vue'
import PassportPage from '../pages/PassportPage.vue'
import TenantProvisionPage from '../pages/TenantProvisionPage.vue'

const workspace = useWorkspaceStore()
const runtime = useRuntimeStore()
const { tabs, activeTabId, activeTab } = storeToRefs(workspace)

/** Per-tab mount in-flight / error (keyed by tabId). */
const mountingByTab = reactive<Record<string, boolean>>({})
const mountErrors = reactive<Record<string, string | null>>({})

const shellPage = computed(() =>
  activeTab.value?.kind === 'shell' ? activeTab.value.shellPage : undefined,
)

function isTabLoading(tab: WorkspaceTab): boolean {
  if (!tab.instanceId) return !!mountingByTab[tab.tabId]
  if (mountingByTab[tab.tabId]) return true
  const instance = runtime.instances.get(tab.instanceId)
  return instance?.status === 'loading'
}

async function waitForContainer(instanceId: string, attempts = 20): Promise<Element> {
  const selector = microAppContainerSelector(instanceId)
  for (let i = 0; i < attempts; i++) {
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`Micro-app container not found: ${selector}`)
}

function clearTabMountState(tabId: string): void {
  delete mountingByTab[tabId]
  delete mountErrors[tabId]
}

watch(
  activeTab,
  async (tab) => {
    if (tab?.kind !== 'micro-app' || !tab.instanceId || !tab.applicationCode) {
      return
    }

    const existing = runtime.instances.get(tab.instanceId)
    if (existing && (existing.status === 'mounted' || existing.status === 'inactive')) {
      existing.status = 'mounted'
      mountErrors[tab.tabId] = null
      console.info('[Workspace] reuse without remount', {
        instanceId: tab.instanceId,
        tabId: tab.tabId,
        status: 'mounted',
      })
      return
    }

    const tabId = tab.tabId
    const instanceId = tab.instanceId
    mountingByTab[tabId] = true
    mountErrors[tabId] = null
    try {
      await nextTick()
      const selector = microAppContainerSelector(instanceId)
      console.info('[Workspace] mounting micro-app (first open)', {
        instanceId,
        applicationCode: tab.applicationCode,
        viewId: tab.viewId,
        initialRoute: tab.initialRoute,
        containerSelector: selector,
        qiankunName: tab.applicationCode,
      })
      await waitForContainer(instanceId)
      await runtime.mountInstance({
        instanceId,
        applicationCode: tab.applicationCode,
        viewId: tab.viewId,
        initialRoute: tab.initialRoute,
        container: selector,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mountErrors[tabId] = `子应用加载失败，可重试：${message}`
      console.error('[Workspace] mountInstance failed:', {
        applicationCode: tab.applicationCode,
        viewId: tab.viewId,
        instanceId,
        error: message,
      })
      ElMessage.error(`子应用加载失败，可重试：${message}`)
      clearTabMountState(tabId)
      await workspace.discardFailedMicroAppTab(tabId)
    } finally {
      mountingByTab[tabId] = false
    }
  },
  { immediate: true },
)

watch(
  tabs,
  (nextTabs) => {
    const ids = new Set(nextTabs.map((t) => t.tabId))
    for (const tabId of Object.keys(mountingByTab)) {
      if (!ids.has(tabId)) clearTabMountState(tabId)
    }
  },
  { deep: true },
)
</script>

<style scoped>
.workspace {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--g2-bg-page);
  position: relative;
}

.micro-slot,
.empty {
  padding: 24px;
  background: var(--g2-bg-container);
  color: var(--g2-text-primary);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.micro-slot {
  position: absolute;
  inset: 0;
}

.mount-error {
  margin: 0 0 12px;
  color: var(--g2-color-danger, #c45656);
  flex-shrink: 0;
}

.mount-status {
  margin: 0 0 12px;
  color: var(--g2-text-secondary);
  flex-shrink: 0;
}

.micro-container {
  flex: 1;
  min-height: 320px;
}

.empty p {
  margin: 0;
  color: var(--g2-text-regular);
  line-height: 1.6;
}
</style>
