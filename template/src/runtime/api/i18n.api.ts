import { getHttpClient, type Result } from '@runtime/http';
import { env } from '@/shared/env';

export interface I18nLocaleMessage {
  messageCode: string;
  messageText: string;
  extendField?: string;
}

/** GET /api/infra/i18n_message/locale?tags={VITE_I18N_TAGS}&locale=zh-CN */
/** GET /api/infra/i18n_message/locale?tag=TEMPLATE&locale=zh-CN */
export async function fetchI18nLocaleMessages(locale: string): Promise<I18nLocaleMessage[]> {
  const httpClient = getHttpClient('auth');
  const result = (await httpClient.get('/api/infra/i18n_message/locale', {
    tags: env.VITE_I18N_TAGS,
    locale: locale.trim(),
  })) as Result<I18nLocaleMessage[]>;

  return result.data ?? [];
}
