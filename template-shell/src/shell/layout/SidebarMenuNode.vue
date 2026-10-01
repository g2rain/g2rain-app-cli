<template>
  <div v-if="item.type === 'group'" class="menu-group">
    <button
      type="button"
      class="menu-group-title"
      :class="{ expandable: hasChildren, expanded }"
      :aria-expanded="hasChildren ? expanded : undefined"
      @click="toggleExpand"
    >
      <span class="menu-label">{{ item.title }}</span>
      <span v-if="hasChildren" class="menu-caret" aria-hidden="true" />
    </button>
    <div v-if="expanded && item.children?.length" class="menu-children">
      <SidebarMenuNode
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :active-view-id="activeViewId"
        @select="(selected) => $emit('select', selected)"
      />
    </div>
  </div>
  <div v-else class="menu-branch">
    <button
      type="button"
      class="menu-item"
      :class="{ active: isActive, expandable: hasChildren, expanded }"
      :aria-expanded="hasChildren ? expanded : undefined"
      @click="onBranchClick"
    >
      <span class="menu-label">{{ item.title }}</span>
      <span v-if="hasChildren" class="menu-caret" aria-hidden="true" />
    </button>
    <div v-if="expanded && item.children?.length" class="menu-children">
      <SidebarMenuNode
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :active-view-id="activeViewId"
        @select="(selected) => $emit('select', selected)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MenuItem } from '../../platform/types/menu.type'
import { microAppViewIdFromMenuKey } from '../../shared/qiankun-id'

const props = defineProps<{
  item: MenuItem
  activeViewId?: string
}>()

const emit = defineEmits<{
  select: [item: MenuItem]
}>()

function resolveViewId(item: MenuItem): string | undefined {
  if (item.type === 'shell') return item.viewId
  if (item.type === 'sub' && item.name) {
    return item.viewId ?? microAppViewIdFromMenuKey(item.key)
  }
  return undefined
}

function containsActiveView(item: MenuItem, viewId: string): boolean {
  if (resolveViewId(item) === viewId) return true
  return item.children?.some((child) => containsActiveView(child, viewId)) ?? false
}

const hasChildren = computed(() => !!props.item.children?.length)
const expanded = ref(false)

watch(
  () => props.activeViewId,
  (viewId) => {
    if (viewId && hasChildren.value && containsActiveView(props.item, viewId)) {
      expanded.value = true
    }
  },
  { immediate: true },
)

const resolvedViewId = computed(() => resolveViewId(props.item))
const isActive = computed(() => props.activeViewId === resolvedViewId.value)

function toggleExpand(): void {
  if (!hasChildren.value) return
  expanded.value = !expanded.value
}

function onBranchClick(): void {
  if (hasChildren.value) {
    toggleExpand()
    return
  }
  emit('select', props.item)
}
</script>
