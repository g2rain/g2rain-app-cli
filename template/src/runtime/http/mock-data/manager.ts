import type { AxiosRequestConfig } from 'axios';
import type { MockData, MockDataFunction, MockDataMap } from './types';

/**
 * 应用运行时 Mock 数据管理器
 * 
 * 职责：
 * - 提供 mock 数据的注册、查询、匹配功能
 * - 不包含任何业务逻辑或业务数据
 * - 支持精确匹配和通配符匹配
 */
export class MockManager {
  private mockDataMap: MockDataMap = {};

  /**
   * 规范化 URL：仅保留 path 部分（去掉 query/hash）
   * 例如：
   * - /lua/sign_code?jti=xxx -> /lua/sign_code
   * - /main/lua/sign_code?jti=xxx#part -> /main/lua/sign_code
   */
  private normalizeUrl(url: string): string {
    const [path] = url.split('?');
    return path.split('#')[0];
  }

  /**
   * 注册单个 mock 数据
   * @param url URL 路径（支持通配符，如 '/api/user/*'）
   * @param data Mock 数据或函数
   */
  register(url: string, data: MockData | MockDataFunction): void {
    this.mockDataMap[url] = data;
  }

  /**
   * 批量注册 mock 数据
   * @param map Mock 数据映射
   */
  registerAll(map: MockDataMap): void {
    Object.assign(this.mockDataMap, map);
  }

  /**
   * 获取 mock 数据
   * @param url 请求 URL
   * @param config 请求配置
   * @returns Mock 数据，如果不存在则返回 null
   */
  async getMockData(url: string, config: AxiosRequestConfig): Promise<MockData | null> {
    const normalizedUrl = this.normalizeUrl(url);
    // 精确匹配
    if (this.mockDataMap[normalizedUrl]) {
      const data = this.mockDataMap[normalizedUrl];
      return typeof data === 'function' ? await data(config) : data;
    }

    // 通配符匹配
    for (const [pattern, data] of Object.entries(this.mockDataMap)) {
      if (this.matchPattern(normalizedUrl, pattern)) {
        return typeof data === 'function' ? await data(config) : data;
      }
    }

    return null;
  }

  /**
   * 检查是否存在 mock 数据
   * @param url 请求 URL
   * @returns 是否存在 mock 数据
   */
  hasMockData(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    // 精确匹配
    if (this.mockDataMap[normalizedUrl]) {
      return true;
    }

    // 通配符匹配
    for (const pattern of Object.keys(this.mockDataMap)) {
      if (this.matchPattern(normalizedUrl, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 匹配 URL 模式（支持通配符 *）
   * @param url 实际 URL
   * @param pattern 模式（如 '/api/user/*'）
   * @returns 是否匹配
   */
  private matchPattern(url: string, pattern: string): boolean {
    // 将通配符模式转换为正则表达式
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  /**
   * 清除所有 mock 数据
   */
  clear(): void {
    this.mockDataMap = {};
  }

  /**
   * 获取所有已注册的 URL 模式（用于调试）
   */
  getRegisteredPatterns(): string[] {
    return Object.keys(this.mockDataMap);
  }
}

// 创建单例实例
export const mockManager = new MockManager();

