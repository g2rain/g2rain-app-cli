/**
 * Permission 公共类型定义
 * - 仅包含 permission 模块对外的稳定类型
 */

/**
 * 页面元素状态
 * VISIBLE: 显示但不可点击（disabled）
 * ENABLED: 显示且可点击（enabled）
 */
export type PageElementStatus = 'VISIBLE' | 'ENABLED';

/**
 * 页面元素权限数据提供者（由 platform/runtime 适配并注册）
 */
export interface PageElementPermissionProvider {
  hasPageElementPermission(elementCode: string): boolean;
  getPageElementStatus(elementCode: string): PageElementStatus | undefined;
}

/**
 * API 权限数据提供者（由 platform/runtime 适配并注册）
 */
export interface ApiPermissionProvider {
  hasApiPermission(apiUrl: string, requestMethod: string): boolean;
}

