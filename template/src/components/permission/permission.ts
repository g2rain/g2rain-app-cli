/**
 * 权限控制工具
 * 基于 resource_page_element 和 resource_api_endpoint 实现权限控制
 */

import type { ApiPermissionProvider, PageElementPermissionProvider, PageElementStatus } from './types';

/**
 * 页面元素权限控制
 * 用于控制页面内按钮、操作等元素的显示和可用性
 */
export class PageElementPermission {
  private static provider: PageElementPermissionProvider | null = null;

  /**
   * 注册权限数据提供者（由 platform/runtime 调用）
   */
  static registerProvider(provider: PageElementPermissionProvider): void {
    this.provider = provider;
  }

  /**
   * 检查是否有页面元素权限
   * @param elementCode 元素编码
   * @returns 是否有权限
   */
  static has(elementCode: string): boolean {
    return this.provider?.hasPageElementPermission(elementCode) ?? false;
  }

  /**
   * 获取页面元素状态
   * @param elementCode 元素编码
   * @returns 元素状态：'visible' | 'enabled' | undefined（不存在）
   */
  static getStatus(elementCode: string): PageElementStatus | undefined {
    return this.provider?.getPageElementStatus(elementCode);
  }

  /**
   * 检查元素是否可用（enabled）
   * @param elementCode 元素编码
   * @returns 是否可用
   */
  static isEnabled(elementCode: string): boolean {
    const status = this.getStatus(elementCode);
    return status === 'ENABLED';
    // return true;
  }

  /**
   * 检查元素是否可见（visible 或 enabled）
   * @param elementCode 元素编码
   * @returns 是否可见
   */
  static isVisible(elementCode: string): boolean {
    const status = this.getStatus(elementCode);
    return status === 'VISIBLE' || status === 'ENABLED';
  }

  /**
   * Vue 指令：v-permission
   * 用法：v-permission="'elementCode'"
   * 根据 pageElementStatus 控制元素的显示和可用性：
   * - VISIBLE: 显示但不可点击（disabled / 置灰）
   * - ENABLED: 显示且可点击
   * - undefined: 按钮等隐藏；el-switch 仍显示但置灰
   */
  static directive = {
    mounted(el: HTMLElement, binding: { value: string }) {
      PageElementPermission.applyPermission(el, binding.value);
    },
    updated(el: HTMLElement, binding: { value: string }) {
      PageElementPermission.applyPermission(el, binding.value);
    },
  };

  /**
   * 应用权限状态到元素
   * @param el 元素
   * @param elementCode 元素编码
   */
  private static applyPermission(el: HTMLElement, elementCode: string): void {
    const status = PageElementPermission.getStatus(elementCode);

    const isElButton =
      el.classList.contains('el-button') ||
      el.getAttribute('data-component') === 'el-button' ||
      el.tagName === 'BUTTON';

    /** el-switch：无权限 / VISIBLE 均展示但置灰，仅 ENABLED 可操作 */
    const isElSwitch = el.classList.contains('el-switch');

    if (isElSwitch) {
      el.style.display = '';
      el.style.pointerEvents = '';
      el.style.opacity = '';
      el.style.cursor = '';
      if (status === 'ENABLED') {
        el.removeAttribute('disabled');
        el.classList.remove('is-disabled');
      } else {
        el.setAttribute('disabled', 'disabled');
        el.classList.add('is-disabled');
      }
      return;
    }

    if (!status) {
      el.style.display = 'none';
      return;
    }

    el.style.display = '';

    if (isElButton) {
      if (status === 'ENABLED') {
        el.removeAttribute('disabled');
        el.classList.remove('is-disabled');
      } else {
        el.setAttribute('disabled', 'disabled');
        el.classList.add('is-disabled');
      }
    } else {
      if (status === 'VISIBLE') {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.6';
        el.style.cursor = 'not-allowed';
      } else {
        el.style.pointerEvents = '';
        el.style.opacity = '';
        el.style.cursor = '';
      }
    }
  }

  /**
   * 组合式函数：usePermission
   * 在 Vue 组件中使用
   */
  static usePermission() {
    return {
      hasPermission: (elementCode: string) => PageElementPermission.has(elementCode),
      getStatus: (elementCode: string) => PageElementPermission.getStatus(elementCode),
      isEnabled: (elementCode: string) => PageElementPermission.isEnabled(elementCode),
      isVisible: (elementCode: string) => PageElementPermission.isVisible(elementCode),
    };
  }
}

/**
 * API 调用权限控制
 * 用于在 HTTP 请求拦截器中检查 API 调用权限
 */
export class ApiPermission {
  private static provider: ApiPermissionProvider | null = null;

  /**
   * 注册权限数据提供者（由 platform/runtime 调用）
   */
  static registerProvider(provider: ApiPermissionProvider): void {
    this.provider = provider;
  }

  /**
   * 检查是否有 API 调用权限
   * @param apiUrl API路径
   * @param requestMethod 请求方法
   * @returns 是否有权限
   */
  static has(apiUrl: string, requestMethod: string): boolean {
    return this.provider?.hasApiPermission(apiUrl, requestMethod) ?? false;
  }

  /**
   * 检查请求配置是否有权限
   * @param url 请求URL（可能是相对路径或完整URL）
   * @param method 请求方法
   * @param baseURL 可选的baseURL（用于处理相对路径）
   * @returns 是否有权限
   */
  static checkRequest(url: string, method: string = 'GET', baseURL?: string): boolean {
    // 从完整URL中提取API路径
    const apiPath = this.extractApiPath(url, baseURL);
    return this.has(apiPath, method);
  }

  /**
   * 从完整URL中提取API路径
   * @param url 请求URL（可能是相对路径或完整URL）
   * @param baseURL 可选的baseURL
   * @returns API路径（如 '/user'）
   */
  private static extractApiPath(url: string, baseURL?: string): string {
    try {
      // 如果是完整URL，提取路径部分
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }

      // 如果是相对路径，需要结合baseURL
      if (baseURL && !url.startsWith('/')) {
        // 相对路径，需要拼接baseURL
        const fullUrl = baseURL.endsWith('/') ? baseURL + url : baseURL + '/' + url;
        try {
          const urlObj = new URL(fullUrl);
          return urlObj.pathname;
        } catch {
          // URL解析失败，直接使用相对路径
          return '/' + url.split('?')[0];
        }
      }

      // 如果已经是绝对路径，直接返回（去掉查询参数）
      return url.startsWith('/') ? url.split('?')[0] : '/' + url.split('?')[0];
    } catch {
      // 如果解析失败，返回原始URL（去掉查询参数）
      return url.startsWith('/') ? url.split('?')[0] : '/' + url.split('?')[0];
    }
  }
}

/**
 * 导出便捷函数
 */
export const hasPageElementPermission = PageElementPermission.has;
export const getPageElementStatus = PageElementPermission.getStatus;
export const isPageElementEnabled = PageElementPermission.isEnabled;
export const isPageElementVisible = PageElementPermission.isVisible;
export const hasApiPermission = ApiPermission.has;
export const checkApiRequest = ApiPermission.checkRequest;
