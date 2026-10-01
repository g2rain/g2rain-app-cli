import type { AxiosRequestConfig } from 'axios';

/**
 * 应用 Mock 数据类型
 */
export type MockData = any;

/**
 * Mock 数据函数类型
 * 可以根据请求参数动态生成 mock 数据
 */
export type MockDataFunction = (config: AxiosRequestConfig) => MockData | Promise<MockData>;

/**
 * Mock 数据映射类型
 * key: URL 路径（支持通配符，如 '/api/user/*'）
 * value: Mock 数据或返回 Mock 数据的函数
 */
export type MockDataMap = Record<string, MockData | MockDataFunction>;

