/**
 * 集成模式下直链子应用 URL 时，跳转到宿主壳网关：/{g2shell}/redirect{当前 path}，
 * 地址里没有 g2shell 时跳默认宿主（VITE_MAIN_SHELL_REDIRECT_PREFIX）。
 * g2shell 原样保留在网关地址里，由壳去掉后再交给子应用。
 */

import { env } from '@shared/env';
import {
  getCurrentBrowserFullPath,
  matchesPathPrefix,
  normalizePathname,
  splitPathAndSuffix,
} from '@shared/url.util';
import { shouldRedirectToMainShellGateway } from '@shared/utils/mode.util';

/** 宿主壳保留参数：壳写地址栏时带上自己的 Context Path（如 admin） */
const SHELL_PARAM = 'g2shell';
/** 只接受单段 Context Path，防止被构造成跳到任意路径 */
const SHELL_NAME = /^[a-z0-9][a-z0-9_-]*$/;

/** 当前地址里 g2shell 指定的壳网关；没有或不合法时返回 null */
function shellGatewayFromQuery(): string | null {
  const shell = new URLSearchParams(window.location.search).get(SHELL_PARAM);
  return shell && SHELL_NAME.test(shell) ? `/${shell}/redirect` : null;
}

/** 网关前缀：优先 g2shell 指定的壳，否则默认宿主（VITE_MAIN_SHELL_REDIRECT_PREFIX，与 VITE_MAIN_SHELL_ORIGIN 成对兜底） */
export function getMainShellGatewayPrefix(): string {
  return normalizePathname(shellGatewayFromQuery() ?? env.VITE_MAIN_SHELL_REDIRECT_PREFIX);
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

  // 有 g2shell：链接由当前域名下的壳生成，回当前域名；没有时才用默认宿主的 origin + 前缀兜底
  const origin = shellGatewayFromQuery()
    ? window.location.origin
    : env.VITE_MAIN_SHELL_ORIGIN.trim().replace(/\/$/, '');
  const target = `${origin}${gatewayPath}`;

  if ((import.meta.env as any).DEV) {
    console.log('[shell-gateway] 集成模式直链，跳转 main-shell 网关:', target);
  }

  window.location.replace(target);
  return true;
}
