import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LocaleOption } from '@platform/locale';
import { loadSavedLocale, saveLocale } from '@platform/locale';
import { getLocaleCodeNameList, type LocaleCodeName } from '@/runtime/api/locale.api';
import { loadAndApplyI18nMessages } from '@platform/i18n';

function toLocaleOption(item: LocaleCodeName): LocaleOption {
  return {
    code: item.code,
    name: item.name,
  };
}

function resolveInitialLocale(options: LocaleOption[], saved: string | null): string {
  if (saved && options.some((o) => o.code === saved)) {
    return saved;
  }
  return options[0]?.code ?? '';
}

export const useLocaleStore = defineStore('locale', () => {
  const options = ref<LocaleOption[]>([]);
  const locale = ref('');
  const initialized = ref(false);
  let initializing: Promise<void> | null = null;

  const current = computed<LocaleOption | null>(() => {
    if (!locale.value) {
      return null;
    }
    return (
      options.value.find((o) => o.code === locale.value) ?? {
        code: locale.value,
        name: locale.value,
      }
    );
  });

  async function syncI18nMessages(force = false): Promise<void> {
    if (!locale.value) {
      return;
    }
    await loadAndApplyI18nMessages(locale.value, force);
  }

  function applyLocale(code: string): void {
    if (!code || !options.value.some((o) => o.code === code)) {
      return;
    }
    locale.value = code;
    saveLocale(code);
  }

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return;
    }
    if (initializing) {
      return initializing;
    }

    initializing = (async () => {
      try {
        const list = await getLocaleCodeNameList();
        const mapped = list.map(toLocaleOption);
        options.value = mapped;

        const saved = loadSavedLocale();
        const code = resolveInitialLocale(mapped, saved);
        if (code) {
          locale.value = code;
          saveLocale(code);
        } else {
          locale.value = '';
        }

        initialized.value = true;
      } catch (error) {
        console.error('[LocaleStore] 语言列表初始化失败:', error);
        throw error;
      } finally {
        initializing = null;
      }

      await syncI18nMessages(true);
      console.log('[LocaleStore] 语言列表初始化完成:', locale.value || '(无可用项)');
    })();

    return initializing;
  }

  async function setLocale(code: string): Promise<void> {
    if (!initialized.value) {
      console.warn('[LocaleStore] 尚未初始化，忽略切换:', code);
      return;
    }
    if (locale.value === code) {
      return;
    }
    applyLocale(code);
    await syncI18nMessages(true);
  }

  /** 集成模式：主应用通过 props.locale 驱动 */
  async function applyFromMain(nextLocale: string): Promise<void> {
    const trimmed = nextLocale.trim();
    if (!trimmed) {
      return;
    }
    if (locale.value === trimmed && initialized.value) {
      return;
    }
    locale.value = trimmed;
    saveLocale(trimmed);
    initialized.value = true;
    await syncI18nMessages(true);
    console.log('[LocaleStore] 已应用主应用语言:', trimmed);
  }

  function reset(): void {
    options.value = [];
    locale.value = '';
    initialized.value = false;
    initializing = null;
  }

  return {
    options,
    locale,
    current,
    initialized,
    initialize,
    setLocale,
    applyFromMain,
    reset,
  };
});
