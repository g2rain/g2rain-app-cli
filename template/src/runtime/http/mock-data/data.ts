/**
 * 应用 HTTP Mock 数据定义
 * 在这里定义各个 URL 对应的 mock 数据
 */

import type { MockDataMap, MockDataFunction } from './index';
import type { Result } from '../types';
import { mockMenuList, authMockDataMap } from './data/auth.data';
import { testMockDataMap } from './data/test.api';
import resourcesConfig from '@shared/config-util/config/resources.json';
import { normalizeResourceApiEndpoint } from '@/runtime/boot/types';
import type { ResourceApiEndpoint } from '@/runtime/boot/types';

interface ResourcePageMock {
  pageName: string;
  pageCode: string;
  linkPath: string;
}

interface ResourcePageElementMock {
  parentId: number | null;
  pageElementName: string;
  pageElementCode: string;
  pageElementType: string;
  pageCode: string;
  status: string;
}

interface ApplicationResourcesMock {
  pages: ResourcePageMock[];
  pageElements: ResourcePageElementMock[];
  apiEndpoints: ResourceApiEndpoint[];
}

function createResult<T>(data: T): Result<T> {
  return {
    requestId: 'mock-request-id',
    requestTime: new Date().toISOString(),
    status: 200,
    errorCode: '',
    errorMessage: '',
    data,
  };
}

/**
 * Mock 数据映射
 * 在这里添加你的 mock 数据
 *
 * 支持通配符配置：
 * - 精确匹配：'/api/example/info' - 精确匹配该 URL
 * - 通配符匹配：'/api/example/*' - 匹配所有以 '/api/example/' 开头的 URL
 *
 * Mock 数据类型：
 * - 对象：返回 JSON 格式响应
 * - 字符串：返回纯文本格式响应（Content-Type: text/plain）
 * - 函数：根据请求配置动态生成响应数据
 */
export const mockDataMap: MockDataMap = {
  // 菜单列表接口
  '/menu/list': {
    requestId: 'mock-request-id',
    requestTime: new Date().toISOString(),
    status: 200,
    errorCode: '',
    errorMessage: '',
    data: mockMenuList,
  } as Result,

  // GET /basis/authority/resources - 资源接口
  // 从 config 读取 pages/pageElements/apiEndpoints 数据
  '/basis/authority/resources': (() => {
    const pages = (resourcesConfig.pages ?? []) as ResourcePageMock[];
    const pageElements = (resourcesConfig.pageElements ?? []) as ResourcePageElementMock[];
    const apiEndpoints = (resourcesConfig.apiEndpoints ?? []).map((item) =>
      normalizeResourceApiEndpoint(item as Record<string, unknown>),
    );
    const resources: ApplicationResourcesMock = {
      pages,
      pageElements,
      apiEndpoints,
    };
    return createResult(resources);
  }) as MockDataFunction,

  // 认证相关接口（含 /auth/token、/lua/sign_code、/keys/*，从 auth.data.ts 导入）
  ...authMockDataMap,

  // 测试相关接口（从 test.api.ts 导入）
  ...testMockDataMap,

  // 可以添加更多 mock 数据
  // '/api/example/info': { ... },
  // '/api/system/*': (config) => { ... },
};
