import type { InternalAxiosRequestConfig } from 'axios';
import { useLocaleStore } from '@platform/stores/locale.store';

export const ACCEPT_LANGUAGE_HEADER = 'Accept-Language';

export function applyAcceptLanguageHeader(config: InternalAxiosRequestConfig): void {
  const localeStore = useLocaleStore();
  const value = localeStore.locale;
  if (!value) {
    return;
  }

  config.headers = config.headers || {};
  const headers = config.headers as Record<string, string | undefined>;
  if (headers[ACCEPT_LANGUAGE_HEADER] != null && headers[ACCEPT_LANGUAGE_HEADER] !== '') {
    return;
  }

  headers[ACCEPT_LANGUAGE_HEADER] = value;
}
