/**
 * 应用资源类型定义
 * 用于平台资源管理：页面、页面元素、API端点
 */

import type { PageElementStatus } from '@/components/permission';

/**
 * 资源页面表（resource_page）
 * 用于定义应用中的页面资源
 */
export interface ResourcePage {
  /**
   * 页面名称
   */
  pageName: string;

  /**
   * 页面编码（唯一标识）
   */
  pageCode: string;

  /**
   * 链接路径（路由路径，如 '/user'）
   */
  linkPath: string;
}

/**
 * 页面元素表（resource_page_element）
 * 用于定义页面内的控制点（按钮、操作等）
 */
export interface ResourcePageElement {
  /**
   * 父页面元素标识（用于树形结构）
   */
  parentId: number | null;

  /**
   * 页面元素名称
   */
  pageElementName: string;

  /**
   * 页面元素编码（唯一标识，用于权限控制）
   */
  pageElementCode: string;

  /**
   * 页面元素类型（如 'button', 'menu', 'action' 等）
   */
  pageElementType: string;

  /**
   * 页面编码（关联到 resource_page.page_code）
   */
  pageCode: string | null;

  /**
   * 页面元素状态
   * visible: 显示但不可点击（disabled）
   * enabled: 显示且可点击（enabled）
   */
  status?: PageElementStatus;
}

/**
 * 接口地址表（resource_api_endpoint）
 * 与后端 authority resources 中 apiEndpoints 项对齐
 */
export interface ResourceApiEndpoint {
  /** 资源接口标识 */
  id?: number;
  /** 接口地址状态 */
  status?: string;
  /** 服务名称 */
  serviceName: string;
  /** 目标地址 */
  endpoint?: string;
  /** 路由前缀（contextPath） */
  routePrefix: string;
  /** 接口名称 */
  apiName: string;
  /** 请求方法（如 GET、POST） */
  method: string;
  /** 请求路径（不含 routePrefix） */
  path: string;
}

/**
 * 完整请求路径：routePrefix + path（等同历史字段 apiUrl）
 */
export function buildResourceApiUrl(endpoint: Pick<ResourceApiEndpoint, 'routePrefix' | 'path'>): string {
  const prefix = (endpoint.routePrefix ?? '').trim().replace(/\/$/, '');
  let p = (endpoint.path ?? '').trim();
  if (p && !p.startsWith('/')) {
    p = `/${p}`;
  }
  if (!prefix) {
    return p || '';
  }
  if (!p) {
    return prefix;
  }
  return `${prefix}${p}`;
}

/**
 * 兼容旧 mock / 配置（apiUrl、requestMethod、apiTag）与后端新结构
 */
export function normalizeResourceApiEndpoint(raw: Record<string, unknown>): ResourceApiEndpoint {
  if (raw.routePrefix != null || raw.path != null || raw.method != null) {
    const routePrefix = String(raw.routePrefix ?? '').trim();
    let path = String(raw.path ?? '').trim();
    if (path && !path.startsWith('/')) {
      path = `/${path}`;
    }
    if (!path) {
      path = '/';
    }
    return {
      id: raw.id != null ? Number(raw.id) : undefined,
      status: raw.status != null ? String(raw.status) : undefined,
      serviceName: String(raw.serviceName ?? ''),
      endpoint: raw.endpoint != null ? String(raw.endpoint) : undefined,
      routePrefix,
      apiName: String(raw.apiName ?? ''),
      method: String(raw.method ?? 'GET').toUpperCase(),
      path,
    };
  }

  const apiUrl = String(raw.apiUrl ?? '').trim();
  const method = String(raw.requestMethod ?? raw.method ?? 'GET').toUpperCase();
  const serviceName = String(raw.serviceName ?? raw.apiTag ?? '');
  const slash = apiUrl.indexOf('/', 1);
  const routePrefix = slash === -1 ? apiUrl : apiUrl.slice(0, slash);
  const path = slash === -1 ? '/' : apiUrl.slice(slash);

  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    serviceName,
    endpoint: raw.endpoint != null ? String(raw.endpoint) : undefined,
    routePrefix,
    apiName: String(raw.apiName ?? ''),
    method,
    path,
  };
}

/**
 * 应用资源集合
 * 包含当前应用的所有资源信息
 */
export interface ApplicationResources {
  /**
   * 页面资源列表
   */
  pages: ResourcePage[];

  /**
   * 页面元素资源列表
   */
  pageElements: ResourcePageElement[];

  /**
   * API端点资源列表
   */
  apiEndpoints: ResourceApiEndpoint[];
}

