import { getHttpClient, type Result } from '@runtime/http';

export interface LocaleCodeName {
  code: string;
  name: string;
}

export async function getLocaleCodeNameList(): Promise<LocaleCodeName[]> {
  const httpClient = getHttpClient('auth');
  const result = (await httpClient.get('/api/infra/locale_setting/code_name_map')) as Result<LocaleCodeName[]>;
  return result.data ?? [];
}
