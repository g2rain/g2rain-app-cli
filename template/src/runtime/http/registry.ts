/**
 * 应用 HTTP Client 注册表
 *
 * - 负责类型导出与实例选择（getHttpClient）
 * - 为每个 HttpClientType 维护对应的 HttpClientOptions，并提供更新方法
 * - 内核由 @g2rain/http 提供；Mock / Loading / 单例表留在应用层
 */
import type {
  HttpClient,
  HttpClientInstance,
  HttpClientOptions,
  HttpClientType,
  ResponseTypeMap,
  Result,
  HttpAuthSession,
  EnsureAccessTokenOptions,
} from './types';
import { createHttpClient } from './client';
import { env, getPathWithContextPath } from '@shared/env';
import { isQiankunRuntime } from '@shared/utils/mode.util';

export interface HttpHostLocation {
  entryOrigin?: string;
  activeRule?: string;
}

type ClientOptionsEntry = HttpClientOptions & { isDirectResponse: boolean };

/**
 * 每个 HttpClientType 对应的默认配置
 */
const httpClientOptionsMap: Record<HttpClientType, ClientOptionsEntry> = {
  default: {
    baseURL: `${env.VITE_CONTEXT_PATH}/api`,
    withAuth: true,
    isDirectResponse: false,
    dpop: { applicationCode: env.VITE_APPLICATION_CODE },
  },
  auth: {
    baseURL: env.VITE_CONTEXT_PATH,
    withAuth: false,
    isDirectResponse: true,
  },
  docs: {
    baseURL: `${env.VITE_CONTEXT_PATH}/api`,
    withAuth: false,
    isDirectResponse: true,
  },
};

const clientInstanceMap = new Map<HttpClientType, HttpClientInstance<boolean>>();

function disposeClient(type: HttpClientType): void {
  const existing = clientInstanceMap.get(type);
  if (existing) {
    existing.dispose();
    clientInstanceMap.delete(type);
  }
}

function createAndCache<T extends HttpClientType>(type: T): HttpClientInstance<ResponseTypeMap[T]> {
  const options = httpClientOptionsMap[type];
  const instance = createHttpClient({
    ...options,
    isDirectResponse: options.isDirectResponse as ResponseTypeMap[T],
  }) as HttpClientInstance<ResponseTypeMap[T]>;
  clientInstanceMap.set(type, instance as HttpClientInstance<boolean>);
  return instance;
}

/**
 * 获取指定类型的 HttpClient 实例（单例）
 */
export function getHttpClient<T extends HttpClientType = 'default'>(
  type: T = 'default' as T,
): HttpClient<ResponseTypeMap[T]> {
  if (!clientInstanceMap.has(type)) {
    createAndCache(type);
  }
  return clientInstanceMap.get(type)!.client as HttpClient<ResponseTypeMap[T]>;
}

/**
 * 覆盖指定类型的 HttpClientOptions，并重置对应单例
 */
export function setHttpClientOptions(type: HttpClientType, options: ClientOptionsEntry): void {
  httpClientOptionsMap[type] = options;
  disposeClient(type);
}

/**
 * 合并更新指定类型的 HttpClientOptions，并重置对应单例
 */
export function updateHttpClientOptions(
  type: HttpClientType,
  patch: Partial<ClientOptionsEntry>,
): void {
  httpClientOptionsMap[type] = {
    ...httpClientOptionsMap[type],
    ...patch,
  };
  disposeClient(type);
}

/**
 * 更新指定类型的 baseURL；若该类型已有活跃实例则立即重建
 */
export function updateHttpBaseURL(type: HttpClientType, baseURL: string): void {
  const wasActive = clientInstanceMap.has(type);
  updateHttpClientOptions(type, { baseURL });
  if (wasActive) {
    createAndCache(type);
  }
}

/**
 * 按宿主传入的 entryOrigin / activeRule 更新 baseURL。
 * 不读取 window 上的 qiankun props，避免把 Token 留在全局对象里。
 */
export function updateHttpBaseURLFromHost(host?: HttpHostLocation): void {
  let newDefaultBaseURL = getPathWithContextPath('/api');
  let newAuthBaseURL = getPathWithContextPath('');

  if (isQiankunRuntime() && host?.entryOrigin) {
    try {
      const entryOrigin = new URL(host.entryOrigin, window.location.origin).origin;
      const cleanActiveRule = `/${host.activeRule || ''}`.replace(/\/+/g, '/').replace(/\/$/, '');
      try {
        newDefaultBaseURL = new URL(`${cleanActiveRule}/api`, entryOrigin).toString();
      } catch {
        newDefaultBaseURL = `${entryOrigin}${cleanActiveRule}/api`.replace(/\/+/g, '/');
      }

      try {
        newAuthBaseURL = new URL(cleanActiveRule || '/', entryOrigin).toString();
      } catch {
        newAuthBaseURL = `${entryOrigin}${cleanActiveRule}`.replace(/\/+/g, '/');
      }

      console.log('[updateHttpBaseURLFromHost] 集成模式，使用 entry origin 和 activeRule:', {
        entryOrigin: host.entryOrigin,
        normalizedEntryOrigin: entryOrigin,
        activeRule: host.activeRule,
        cleanActiveRule,
        defaultBaseURL: newDefaultBaseURL,
        authBaseURL: newAuthBaseURL,
      });
    } catch (error) {
      console.warn('[updateHttpBaseURLFromHost] 获取 entry origin 失败:', error);
    }
  } else if (isQiankunRuntime()) {
    console.warn('[updateHttpBaseURLFromHost] 集成模式但未提供 entry origin，使用默认值');
  }

  updateHttpBaseURL('default', newDefaultBaseURL);
  updateHttpBaseURL('auth', newAuthBaseURL);
  updateHttpBaseURL('docs', newDefaultBaseURL);
}

/**
 * 释放全部 HTTP 客户端（qiankun unmount / 应用退出）
 */
export function disposeAllHttpClients(): void {
  for (const type of [...clientInstanceMap.keys()]) {
    disposeClient(type);
  }
}

export type {
  HttpClient,
  HttpClientInstance,
  HttpClientOptions,
  HttpClientType,
  Result,
  HttpAuthSession,
  EnsureAccessTokenOptions,
  ResponseTypeMap,
};

export { fetchIamKeyId, fetchIamPublicKey } from './iam-keys';
export type { Client } from './types';
