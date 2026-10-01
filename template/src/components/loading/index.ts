/**
 * Loading 组件导出入口
 *
 * - 对外提供 `loadingManager` 单例和 `LoadingOptions` 类型
 * - 供组件层（例如 HTTP 拦截器、业务组件）统一使用全局 Loading 能力
 */

import type { InternalAxiosRequestConfig } from 'axios';

export { loadingManager } from './loading';
export type { LoadingOptions } from './loading';

/**
 * 检查是否应该显示 loading（纯 UI 逻辑判断）
 * @param config 请求配置
 * @returns 如果应该显示 loading，返回 true；否则返回 false
 *
 * 说明：
 * - 只关注 UI 维度（如 showLoading 标志），不掺杂 mock 等业务判断
 * - 业务层如果需要“mock 请求不出 loading”，应在各自拦截器中自行处理
 */
export function shouldShowLoading(config: InternalAxiosRequestConfig): boolean {
  // 可以通过 config.showLoading === false 来禁用单个请求的 loading
  if ((config as any).showLoading === false) {
    return false;
  }

  return true;
}
