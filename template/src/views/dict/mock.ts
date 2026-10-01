/**
 * dict 相关 Mock 数据
 */

import type { AxiosRequestConfig } from 'axios';
import type { Result } from '@g2rain/http';
import { mockManager, type MockDataMap } from '@runtime/http';
import Mock from 'mockjs';

import type { DictItem } from './type';

function createResult<T>(data: T, status: number = 200): Result<T> {
  const result = Mock.mock({
    requestId: '@guid',
    requestTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
    status,
    errorCode: status === 200 ? '' : '@word(5,10)',
    errorMessage: status === 200 ? '' : '@cword(5,15)',
  }) as Result<T>;

  (result as any).data = data;
  return result;
}

function getDictItemTemplate(overrides: Partial<any> = {}): any {
  return {
    'id|+1': 1,
    parentId: null,
    'code|1': ['DICT_CODE_A', 'DICT_CODE_B', 'DICT_CODE_C'],
    'name|1': ['字典项A', '字典项B', '字典项C'],
    description: '@cword(5,10)',
    sortIndex: '@integer(1, 100)',
    version: '@integer(1, 100)',
    createTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
    updateTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
    ...overrides,
  };
}

const dictItems: DictItem[] = [
  ...Array.from({ length: 18 }).map((_, i) =>
    Mock.mock(
      getDictItemTemplate({
        id: i + 1,
        code: `DICT_CODE_${i + 1}`,
        name: `字典项${i + 1}`,
        sortIndex: i + 1,
        usageCode: i % 2 === 0 ? 'CMS_ARTICLE_CONTENT_TYPE' : `USAGE_${(i % 3) + 1}`,
      }),
    ),
  ),
  Mock.mock(
    getDictItemTemplate({
      id: 1001,
      code: 'ACTIVE',
      name: '有效',
      sortIndex: 1,
      usageCode: 'MEMBER_STATUS',
    }),
  ),
  Mock.mock(
    getDictItemTemplate({
      id: 1002,
      code: 'INACTIVE',
      name: '无效',
      sortIndex: 2,
      usageCode: 'MEMBER_STATUS',
    }),
  ),
];

function filterDictItems(query: Record<string, any>): DictItem[] {
  const code = query?.code;
  const name = query?.name ?? query?.key;
  const usageCode = query?.usageCode;

  let filtered = dictItems;
  if (code) {
    filtered = filtered.filter((item) => String(item.code) === String(code));
  }
  if (name) {
    const keyword = String(name);
    filtered = filtered.filter((item) => item.name.includes(keyword) || (item.code || '').includes(keyword));
  }

  if (usageCode) {
    filtered = filtered.filter((item) => String((item as any).usageCode) === String(usageCode));
  }

  return filtered;
}

export const DictItemMockDataMap: MockDataMap = {
  '/infra/dictionary_item/list': (config: AxiosRequestConfig) => {
    const query = config.params || {};
    return createResult<DictItem[]>(filterDictItems(query));
  },

  '/infra/dictionary_item/localized_options': (config: AxiosRequestConfig) => {
    const query = config.params || {};
    return createResult<DictItem[]>(filterDictItems(query));
  },
};

mockManager.registerAll(DictItemMockDataMap);
