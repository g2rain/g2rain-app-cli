/**
 * HTTP 客户端类型定义
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { JWK, JWTHeaderParameters, JWTPayload } from 'jose';
import type { Result } from './api.type';

// dpop协议的header
export interface DpopHeader extends JWTHeaderParameters {
  typ: string; //类型
  alg: string; // 算法
  ph_alg: string; // 参数hash算法
  jwk: JWK; // 公钥
  kid: string; // clientId
}

// dpop协议的payload
export interface DpopPayload extends JWTPayload {
  htu: string; //链接地址
  htm: string; // HTTP方法
  iat?: number; // 有效期时间
  jti?: string; // 随机值
  acd: string; // 应用编码
  pha: string; // 请求参数SHA256哈希值
}

export interface Token {
  clientId: string; //终端ID
  clientPublicKey: string; //终端公钥
  applicationScopes: ApplicationScope[]; // 可用应用列表
  expireAt: number; // 过期时间
  refreshExpireAt: number; // token刷新过期时间
  adminCompany: boolean; // 平台管理组织标记
  organId?: number; // 当前用户所属组织
}

export interface ApplicationScope {
  applicationId: number;      // 应用主键
  applicationCode: string;    // 应用编码
  applicationOrganId: number; // 应用所属机构
}

/**
 * HTTP 客户端接口
 */
export interface IHttpClient {
  request<T = any>(config: AxiosRequestConfig): Promise<Result<T>>;
  get<T = any>(
    url: string,
    params?: any,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<Result<T>>;
  post<T = any>(
    url: string,
    data?: any,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<Result<T>>;
  put<T = any>(
    url: string,
    data?: any,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<Result<T>>;
  delete<T = any>(
    url: string,
    params?: any,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<Result<T>>;
  patch<T = any>(
    url: string,
    data?: any,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<Result<T>>;
}

/**
 * 导出 Axios 相关类型
 */
export type { AxiosInstance, AxiosRequestConfig, AxiosResponse };

