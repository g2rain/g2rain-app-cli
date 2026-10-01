import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { mockManager } from './mock-data';
import { env } from '@shared/env';

/**
 * 获取 Mock 数据
 * @param config 请求配置
 * @returns Mock 响应数据
 */
export async function getMockResponse(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = config.url || '';
  const headers = config.headers || {};
  const headerMockEnabled = headers['x-g2rain-mock'] === 'true' || headers['X-G2rain-Mock'] === 'true';

  const mockData = await mockManager.getMockData(url, config);

  if (mockData) {
    // 检查是否是特殊格式的 mock 响应（包含 data 和 headers）
    if (typeof mockData === 'object' && mockData !== null && '__mockResponse' in mockData) {
      const mockResponse = mockData as any;
      return {
        data: mockResponse.data,
        status: mockResponse.status || 200,
        statusText: mockResponse.statusText || 'OK',
        headers: mockResponse.headers || {},
        config: config as any,
      } as AxiosResponse;
    }

    // 如果是字符串，返回纯文本响应
    if (typeof mockData === 'string') {
      return {
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/plain',
        },
        config: config as any,
      } as AxiosResponse;
    }

    // 默认返回 JSON 响应
    return {
      data: mockData,
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
      config: config as any,
    } as AxiosResponse;
  } else if (headerMockEnabled) {
    // header 中明确要求使用 mock，但 mock 数据不存在，报错
    throw new Error(`Mock data not found for URL: ${url}`);
  }

  // 如果环境变量开启了 mock，但 mock 数据不存在，抛出错误（会在 adapter 中捕获并继续正常请求）
  throw new Error('Mock data not found');
}

/**
 * 检查是否需要使用 Mock 数据
 * @param config 请求配置
 * @returns 如果需要使用 mock，返回 true；否则返回 false
 */
export function shouldUseMock(config: InternalAxiosRequestConfig): boolean {
  const headers = config.headers || {};

  // 检查 header 中的 x-g2rain-mock
  const headerMockEnabled = headers['x-g2rain-mock'] === 'true' || headers['X-G2rain-Mock'] === 'true';

  // 检查环境变量中的 mock 开关
  const envMockEnabled = env.VITE_MOCK_ENABLED;

  return headerMockEnabled || envMockEnabled;
}
