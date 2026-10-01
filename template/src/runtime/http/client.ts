/**
 * 应用 HTTP 客户端装配：内核用 @g2rain/http，应用层叠加 Loading 与 Mock 短路。
 */
import {
  createHttpClient as createPackageHttpClient,
  type HttpClientOptions,
  type HttpResponse,
  type Result,
} from '@g2rain/http';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { loadingManager, shouldShowLoading } from '@/components/loading';
import { env } from '@shared/env';
import { getMockResponse, shouldUseMock } from './mock-utils';
import type { HttpClient, HttpClientInstance } from './types';

function isResult(value: unknown): value is Result {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as Result).status === 'number' &&
    'errorCode' in value &&
    'errorMessage' in value
  );
}

/**
 * Loading 拦截器（Mock 短路路径不经 axios，由 wrapClient 自行 show/hide）
 */
function installLoadingInterceptors(instance: AxiosInstance): () => void {
  const requestId = instance.interceptors.request.use(
    (config) => {
      if (shouldShowLoading(config) && !shouldUseMock(config)) {
        const loadingText = (config as InternalAxiosRequestConfig & { loadingText?: string }).loadingText;
        loadingManager.show({ text: loadingText });
      }
      return config;
    },
    (error) => {
      loadingManager.hide();
      return Promise.reject(error);
    },
  );

  const responseId = instance.interceptors.response.use(
    (response) => {
      loadingManager.hide();
      return response;
    },
    (error) => {
      loadingManager.hide();
      return Promise.reject(error);
    },
  );

  return () => {
    instance.interceptors.request.eject(requestId);
    instance.interceptors.response.eject(responseId);
  };
}

async function tryMockResponse<T>(config: AxiosRequestConfig): Promise<T | undefined> {
  const internal = config as InternalAxiosRequestConfig;
  if (!shouldUseMock(internal)) {
    return undefined;
  }

  const headers = config.headers || {};
  const headerMockEnabled =
    (headers as Record<string, unknown>)['x-g2rain-mock'] === 'true' ||
    (headers as Record<string, unknown>)['X-G2rain-Mock'] === 'true';

  try {
    if (shouldShowLoading(internal)) {
      const loadingText = (internal as InternalAxiosRequestConfig & { loadingText?: string }).loadingText;
      loadingManager.show({ text: loadingText });
    }
    const response = await getMockResponse(internal);
    return response.data as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Mock data not found')) {
      if (headerMockEnabled) {
        throw error;
      }
      return undefined;
    }
    throw error;
  } finally {
    loadingManager.hide();
  }
}

function wrapClientWithMockShortCircuit<Direct extends boolean>(
  client: {
    request<T = unknown, Body = unknown>(config: AxiosRequestConfig<Body>): Promise<HttpResponse<T, Direct>>;
  },
  isDirectResponse: Direct,
): HttpClient<Direct> {
  async function request<T = unknown, Body = unknown>(
    config: AxiosRequestConfig<Body>,
  ): Promise<HttpResponse<T, Direct>> {
    const mocked = await tryMockResponse<HttpResponse<T, Direct>>(config);
    if (mocked !== undefined) {
      if (!isDirectResponse && isResult(mocked) && mocked.status !== 0 && mocked.status !== 200) {
        throw new Error(mocked.errorMessage || 'Backend request failed');
      }
      return mocked;
    }
    return client.request<T, Body>(config);
  }

  return {
    request,
    get: (url, params, config) => request({ ...config, url, method: 'GET', params }),
    delete: (url, params, config) => request({ ...config, url, method: 'DELETE', params }),
    post: (url, data, config) => request({ ...config, url, method: 'POST', data }),
    put: (url, data, config) => request({ ...config, url, method: 'PUT', data }),
    patch: (url, data, config) => request({ ...config, url, method: 'PATCH', data }),
  };
}

/**
 * 按配置创建 HttpClient（包内核 + Loading + Mock）
 */
export function createHttpClient<Direct extends boolean = false>(
  options: HttpClientOptions & { isDirectResponse?: Direct } = {},
): HttpClientInstance<Direct> {
  const withAuth = options.withAuth ?? true;
  const isDirectResponse = (options.isDirectResponse ?? false) as Direct;

  const packageOptions: HttpClientOptions & { isDirectResponse?: Direct } = {
    ...options,
    isDirectResponse,
    dpop:
      options.dpop ??
      (withAuth ? { applicationCode: env.VITE_APPLICATION_CODE } : undefined),
  };

  const { axios, client, dispose: packageDispose } = createPackageHttpClient(packageOptions);
  const ejectLoading = installLoadingInterceptors(axios);

  return {
    axios,
    client: wrapClientWithMockShortCircuit(client, isDirectResponse),
    dispose() {
      ejectLoading();
      packageDispose();
    },
  };
}
