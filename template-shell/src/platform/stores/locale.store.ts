import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ShellLocaleCode = 'zh-CN' | 'en-US'

export interface ShellLocaleOption {
  code: ShellLocaleCode
  label: string
}

const STORAGE_KEY = 'g2rain-shell-locale'

export const SHELL_LOCALE_OPTIONS: readonly ShellLocaleOption[] = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' },
] as const

function readPersistedLocale(): ShellLocaleCode {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'en-US' || value === 'zh-CN' ? value : 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

/**
 * Shell-owned locale preference. Full message catalogs remain an extension;
 * this store drives UI preference, G2rainUi locale injection, and Main→Sub notifyLocale.
 */
export const useLocaleStore = defineStore('shell-locale', () => {
  const locale = ref<ShellLocaleCode>(readPersistedLocale())
  const options = computed(() => SHELL_LOCALE_OPTIONS)
  const label = computed(
    () => options.value.find((item) => item.code === locale.value)?.label ?? locale.value,
  )

  function setLocale(next: ShellLocaleCode): void {
    locale.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }

  return {
    locale,
    options,
    label,
    setLocale,
  }
})
