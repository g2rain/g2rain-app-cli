import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem } from '../types/menu.type'
import { normalizeContextPath } from '../../shared/context-path'
import { resolveMicroAppEntry } from '../../shared/url'
import { useRuntimeStore } from './runtime.store'

export const useMenuStore = defineStore('shell-menu', () => {
  const menuItems = ref<MenuItem[]>([])
  const initialized = ref(false)

  function setMenuItems(items: MenuItem[]): void {
    menuItems.value = items
    initialized.value = true
  }

  /**
   * Register MicroAppDefinition entries from `sub` menu leaves.
   * Dedupes by applicationCode; entry = origin + contextPath + trailing `/`.
   */
  function registerAppsFromMenus(items: MenuItem[]): void {
    const runtime = useRuntimeStore()
    const seen = new Set<string>()

    const traverse = (list: MenuItem[]): void => {
      for (const item of list) {
        if (item.type === 'sub' && item.name && item.entry && item.activeRule) {
          if (!seen.has(item.name)) {
            seen.add(item.name)
            const contextPath = normalizeContextPath(item.activeRule, 'MenuItem.activeRule')
            const entry = resolveMicroAppEntry(item.entry, contextPath)
            console.info('[MenuStore] register sub-app from menu', {
              applicationCode: item.name,
              menuKey: item.key,
              rawEntry: item.entry,
              contextPath,
              joinedEntry: entry,
            })
            runtime.registerDefinition({
              applicationCode: item.name,
              // Must equal vite-plugin-qiankun registration name (= applicationCode).
              name: item.name,
              entry,
              contextPath,
              activeRule: contextPath,
            })
          }
        }
        if (item.children?.length) {
          traverse(item.children)
        }
      }
    }

    traverse(items)
  }

  function reset(): void {
    menuItems.value = []
    initialized.value = false
    useRuntimeStore().clearDefinitions()
  }

  return {
    menuItems,
    initialized,
    setMenuItems,
    registerAppsFromMenus,
    reset,
  }
})
