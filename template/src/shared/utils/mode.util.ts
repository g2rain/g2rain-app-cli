/**
 * 微前端运行模式
 * - alone：独立运行（自有 SSO、WebHistory、token 持久化）
 * - 空 / 其他：集成意图（同域应经 main-shell 网关或 qiankun 挂载）
 */

import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { getEnvVar } from '@shared/env';

export type RunMode = '' | 'alone';

/**
 * 运行模式：仅 mode=alone 为独立；URL 优先于环境变量
 */
export function getRunMode(): RunMode {
  const fromQuery = new URLSearchParams(window.location.search).get('mode');
  if (fromQuery === 'alone') {
    return 'alone';
  }

  const fromEnv = getEnvVar('VITE_RUN_MODE', '');
  if (fromEnv === 'alone') {
    return 'alone';
  }

  return '';
}

/** 独立运行模式 */
export function isAloneMode(): boolean {
  return getRunMode() === 'alone';
}

/**
 * 集成意图（非 alone），含 mode 为空
 * 注意：未挂载 qiankun 时仍需跳 main-shell 网关，不能据此初始化 memory 路由
 */
export function isIntegrateMode(): boolean {
  return !isAloneMode();
}

/** 是否已由 qiankun 挂载运行 */
export function isQiankunRuntime(): boolean {
  return !!(qiankunWindow.__POWERED_BY_QIANKUN__);
}

/** @deprecated 使用 isQiankunRuntime */
export function isQianKunMode(): boolean {
  return isQiankunRuntime();
}

/**
 * 集成意图但未在 qiankun 内：直链子应用 URL，应跳转 main-shell 网关
 */
export function shouldRedirectToMainShellGateway(): boolean {
  return isIntegrateMode() && !isQiankunRuntime();
}
