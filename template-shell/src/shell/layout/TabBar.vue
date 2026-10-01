<template>
  <div class="tab-bar" role="tablist" aria-label="Workspace tabs">
    <div
      v-for="tab in tabs"
      :key="tab.tabId"
      class="tab"
      role="tab"
      :aria-selected="tab.tabId === activeTabId"
      :class="{ active: tab.tabId === activeTabId }"
      @click="onActivate(tab.tabId)"
    >
      <span class="title">{{ tab.title }}</span>
      <button
        v-if="tab.closable"
        type="button"
        class="close"
        :aria-label="`关闭 ${tab.title}`"
        @click.stop="onClose(tab.tabId)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'

const workspace = useWorkspaceStore()
const { tabs, activeTabId } = storeToRefs(workspace)

function onActivate(tabId: string): void {
  workspace.activateTab(tabId)
}

async function onClose(tabId: string): Promise<void> {
  await workspace.closeTab(tabId)
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  gap: 4px;
  min-height: 40px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--g2-border-color);
  background: var(--g2-bg-muted);
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: var(--g2-text-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.tab:hover {
  color: var(--g2-text-primary);
  background: var(--g2-bg-container);
}

.tab.active {
  color: var(--g2-color-primary);
  background: var(--g2-bg-container);
  border-color: var(--g2-border-color);
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.close:hover {
  background: var(--g2-fill-light);
  color: var(--g2-text-primary);
}
</style>
