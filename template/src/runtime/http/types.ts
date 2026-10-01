/**
 * HTTP 运行时类型：公共契约来自 @g2rain/http，应用侧放宽 params 类型以兼容业务 Query DTO。
 */
import type { AxiosRequestConfig, AxiosInstance } from 'axios';
import type {
  Result,
  EnsureAccessTokenOptions,
  HttpAuthSession,
  DpopClient,
  DpopSignInput,
  HttpClientOptions as PackageHttpClientOptions,
  HttpResponse,
  HttpClientType,
  G2rainHttpError,
  G2rainHttpErrorOptions,
  HttpErrorSource,
} from '@g2rain/http';

export type {
  Result,
  EnsureAccessTokenOptions,
  HttpAuthSession,
  DpopClient,
  DpopSignInput,
  HttpClientType,
  HttpResponse,
  G2rainHttpError,
  G2rainHttpErrorOptions,
  HttpErrorSource,
};

export type { DpopClient as Client } from '@g2rain/http';

/** 与包一致，供 initHttp / options map 使用 */
export type HttpClientOptions = PackageHttpClientOptions;

/**
 * 应用侧 HttpClient：params 使用 object，避免业务 Query 接口缺少 index signature 报错。
 */
export interface HttpClient<Direct extends boolean = false> {
  request<T = unknown, Body = unknown>(config: AxiosRequestConfig<Body>): Promise<HttpResponse<T, Direct>>;
  get<T = unknown>(
    url: string,
    params?: object,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T, Direct>>;
  post<T = unknown, Body = unknown>(
    url: string,
    data?: Body,
    config?: AxiosRequestConfig<Body>,
  ): Promise<HttpResponse<T, Direct>>;
  put<T = unknown, Body = unknown>(
    url: string,
    data?: Body,
    config?: AxiosRequestConfig<Body>,
  ): Promise<HttpResponse<T, Direct>>;
  patch<T = unknown, Body = unknown>(
    url: string,
    data?: Body,
    config?: AxiosRequestConfig<Body>,
  ): Promise<HttpResponse<T, Direct>>;
  delete<T = unknown>(
    url: string,
    params?: object,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T, Direct>>;
}

export interface HttpClientInstance<Direct extends boolean = false> {
  axios: AxiosInstance;
  client: HttpClient<Direct>;
  dispose(): void;
}

/**
 * 各 HttpClientType 对应包工厂的 isDirectResponse
 */
export type ResponseTypeMap = {
  default: false;
  auth: true;
  docs: true;
};

export type DefaultResponseType<T = unknown> = Result<T>;
export type DirectResponseType<T = unknown> = T;
