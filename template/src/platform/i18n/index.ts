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
/** 进行中的加载。并发切换时只有最后一次请求的语言会被应用。 */
let pending: { locale: string; promise: Promise<void> } | null = null;

/**
 * 加载并应用某个语言的文案。同一语言的并发调用共用一次请求；
 * 切到别的语言时发起新请求，先发出的旧请求结束后丢弃结果，不会把语言切回去。
 */
export async function loadAndApplyI18nMessages(locale: string, force = false): Promise<void> {
  const trimmed = locale.trim();
  if (!trimmed) {
    return;
  }
  if (pending?.locale === trimmed) {
    return pending.promise;
  }
  if (!force && !pending && trimmed === lastLoadedLocale) {
    return;
  }

  const current = { locale: trimmed, promise: Promise.resolve() };
  pending = current;
  current.promise = (async () => {
    let messages: Record<string, string> | null = null;
    try {
      const list = await fetchI18nLocaleMessages(trimmed);
      messages = {};
      for (const item of list) {
        const text = item.messageText?.trim();
        if (item.messageCode && text) {
          messages[item.messageCode] = text;
        }
      }
    } catch (error) {
      console.warn('[I18n] 文案包加载失败，将使用降级文案:', error);
    }
    if (pending !== current) {
      return;
    }
    if (messages) {
      i18n.global.setLocaleMessage(trimmed, messages);
      lastLoadedLocale = trimmed;
    }
    (i18n.global.locale as { value: string }).value = trimmed;
  })().finally(() => {
    if (pending === current) {
      pending = null;
    }
  });

  return current.promise;
}

export function resetI18nLoader(): void {
  lastLoadedLocale = '';
  pending = null;
}
