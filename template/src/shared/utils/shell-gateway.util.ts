/**
 * 集成模式下直链子应用 URL 时，跳转到 main-shell 网关：/main/redirect{当前 path}
 */

import { env } from '@shared/env';
import {
  getCurrentBrowserFullPath,
  matchesPathPrefix,
  normalizePathname,
  splitPathAndSuffix,
} from '@shared/url.util';
import { shouldRedirectToMainShellGateway } from '@shared/utils/mode.util';

export function getMainShellGatewayPrefix(): string {
  return normalizePathname(env.VITE_MAIN_SHELL_REDIRECT_PREFIX);
}

/**
 * 将当前浏览器路径包装为 main-shell 网关 URL（pathname + search + hash）
 */
export function buildMainShellGatewayUrl(fullPath = getCurrentBrowserFullPath()): string | null {
  const { pathname, suffix } = splitPathAndSuffix(fullPath);
  if (matchesPathPrefix(pathname, getMainShellGatewayPrefix())) {
    return null;
  }

  const prefix = getMainShellGatewayPrefix();
  return `${prefix}${pathname}${suffix}`;
}

/**
 * 集成意图且非 qiankun：跳转到 main-shell 网关（同域 replace）
 * @returns true 表示已发起跳转，调用方应停止后续 bootstrap
 */
export function redirectToMainShellGatewayIfNeeded(): boolean {
  if (!shouldRedirectToMainShellGateway()) {
    return false;
  }

  const gatewayPath = buildMainShellGatewayUrl();
  if (!gatewayPath) {
    return false;
  }

  const mainOrigin = env.VITE_MAIN_SHELL_ORIGIN.trim();
  const target = mainOrigin
    ? `${mainOrigin.replace(/\/$/, '')}${gatewayPath}`
    : gatewayPath;

  if ((import.meta.env as any).DEV) {
    console.log('[shell-gateway] 集成模式直链，跳转 main-shell 网关:', target);
  }

  window.location.replace(target);
  return true;
}
