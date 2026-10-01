/**
 * 测试相关应用 Mock 接口
 * 包含测试数据的 CRUD 操作接口
 */

import type { MockDataMap, MockDataFunction } from '../index';
import type { Result } from '../../types';
import type { AxiosRequestConfig } from 'axios';
import Mock from 'mockjs';

/**
 * 生成符合 Result 格式的响应
 */
function createResult<T>(data: T, status: number = 200): Result<T> {
  return Mock.mock({
    requestId: '@guid',
    requestTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
    status,
    errorCode: status === 200 ? '' : '@word(5,10)',
    errorMessage: status === 200 ? '' : '@cword(5,15)',
    data,
  }) as Result<T>;
}

/**
 * 生成符合 TestVo 类型的 Mock 数据模板
 * 注意：使用下划线命名，与前端 DictItem 类型保持一致
 */
function getTestVoTemplate(overrides: Partial<any> = {}): any {
  return {
    'id|+1': 1,
    type: '@pick(["system", "user", "config", "menu", "role"])',
    name: '@cword(3,8)',
    'code|1': ['@word(3,10)', null],
    'parent_dict_id|1': ['@word(10,20)', null],
    'page_code|1': ['@word(5,15)', null],
    'delete_flag|1': [0, 1], // 0 或 1，不是布尔值
    version: '@integer(1, 100)',
    create_time: '@datetime("yyyy-MM-dd HH:mm:ss")',
    update_time: '@datetime("yyyy-MM-dd HH:mm:ss")',
    ...overrides,
  };
}

/**
 * 从 AxiosRequestConfig 中获取查询参数
 */
function getQueryParams(config: AxiosRequestConfig): Record<string, any> {
  if (config.params) {
    return config.params;
  }
  const url = config.url || '';
  const queryString = url.split('?')[1];
  if (!queryString) {
    return {};
  }
  const params: Record<string, any> = {};
  queryString.split('&').forEach((param) => {
    const [key, value] = param.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });
  return params;
}

/**
 * 测试相关 Mock 接口配置
 */
export const testMockDataMap: MockDataMap = {
  '/api/test': ((config: AxiosRequestConfig) => {
    const query = getQueryParams(config);
    const type = query?.type;
    const name = query?.name;
    const code = query?.code;
    const parent_dict_id = query?.parent_dict_id;
    const page_code = query?.page_code;

    const count = type ? 5 : 15;

    const list: any[] = [];
    for (let i = 0; i < count; i++) {
      const item = Mock.mock(
        getTestVoTemplate({
          id: i + 1,
          ...(type ? { type } : {}),
        }),
      );
      list.push(item);
    }

    let filteredList = list;
    if (type) {
      filteredList = filteredList.filter((item: any) => item.type === type);
    }
    if (name) {
      filteredList = filteredList.filter((item: any) => item.name.includes(name));
    }
    if (code) {
      filteredList = filteredList.filter((item: any) => item.code && item.code.includes(code));
    }
    if (parent_dict_id) {
      filteredList = filteredList.filter((item: any) => item.parent_dict_id === parent_dict_id);
    }
    if (page_code) {
      filteredList = filteredList.filter(
        (item: any) => item.page_code && item.page_code.includes(page_code),
      );
    }

    return createResult(filteredList);
  }) as MockDataFunction,

  '/api/test/list': ((config: AxiosRequestConfig) => {
    const query = getQueryParams(config);
    const type = query?.type;
    const name = query?.name;
    const code = query?.code;
    const parent_dict_id = query?.parent_dict_id || query?.parentDictId;
    const page_code = query?.page_code || query?.pageCode;

    const count = type ? 5 : 15;

    const list: any[] = [];
    for (let i = 0; i < count; i++) {
      const item = Mock.mock(
        getTestVoTemplate({
          id: i + 1,
          ...(type ? { type } : {}),
        }),
      );
      list.push(item);
    }

    let filteredList = list;
    if (type) {
      filteredList = filteredList.filter((item: any) => item.type === type);
    }
    if (name) {
      filteredList = filteredList.filter((item: any) => item.name.includes(name));
    }
    if (code) {
      filteredList = filteredList.filter((item: any) => item.code && item.code.includes(code));
    }
    if (parent_dict_id) {
      filteredList = filteredList.filter((item: any) => item.parent_dict_id === parent_dict_id);
    }
    if (page_code) {
      filteredList = filteredList.filter(
        (item: any) => item.page_code && item.page_code.includes(page_code),
      );
    }

    return createResult(filteredList);
  }) as MockDataFunction,

  '/api/test/page': ((config: AxiosRequestConfig) => {
    const query = getQueryParams(config);
    const pageNum = parseInt(query?.pageNum || query?.page || '1', 10);
    const pageSize = parseInt(query?.pageSize || query?.size || '10', 10);
    const type = query?.type;

    const total = type ? 25 : 50;

    const count = Math.min(pageSize, total - (pageNum - 1) * pageSize);
    const template: any = {
      [`records|${count}`]: [getTestVoTemplate()],
    };

    if (type) {
      template['records|' + count] = [getTestVoTemplate({ type })];
    }

    const result = Mock.mock(template);

    const pageData = {
      pageNum,
      pageSize,
      total,
      records: result.records,
    };

    return createResult(pageData);
  }) as MockDataFunction,

  '/api/test/save': (() => {
    const newId = Mock.Random.integer(1000, 9999);
    return createResult(newId);
  }) as MockDataFunction,

  '/api/test/*': (() => {
    const deletedRows = 1;
    return createResult(deletedRows);
  }) as MockDataFunction,
};
