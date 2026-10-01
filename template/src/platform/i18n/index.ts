import { createI18n } from 'vue-i18n';
import { fetchI18nLocaleMessages } from '@/runtime/api/i18n.api';

const defaultLocale = 'zh-CN';

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  messages: { [defaultLocale]: {} },
  missing: (_locale, key) => key,
});

function currentI18nLocale(): string {
  const loc = i18n.global.locale;
  return typeof loc === 'string' ? loc : loc.value;
}

export function t(code: string, defaultText?: string): string {
  void currentI18nLocale();
  if (defaultText !== undefined) {
    return i18n.global.t(code, defaultText);
  }
  return i18n.global.t(code);
}

let lastLoadedLocale = '';
let loading: Promise<void> | null = null;

export async function loadAndApplyI18nMessages(locale: string, force = false): Promise<void> {
  const trimmed = locale.trim();
  if (!trimmed) {
    return;
  }
  if (!force && trimmed === lastLoadedLocale) {
    return;
  }
  if (loading) {
    return loading;
  }

  loading = (async () => {
    try {
      const list = await fetchI18nLocaleMessages(trimmed);
      const messages: Record<string, string> = {};
      for (const item of list) {
        const text = item.messageText?.trim();
        if (item.messageCode && text) {
          messages[item.messageCode] = text;
        }
      }
      i18n.global.setLocaleMessage(trimmed, messages);
      (i18n.global.locale as { value: string }).value = trimmed;
      lastLoadedLocale = trimmed;
    } catch (error) {
      console.warn('[I18n] 文案包加载失败，将使用降级文案:', error);
      (i18n.global.locale as { value: string }).value = trimmed;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export function resetI18nLoader(): void {
  lastLoadedLocale = '';
  loading = null;
}
