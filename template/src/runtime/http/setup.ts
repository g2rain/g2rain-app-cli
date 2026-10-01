/**
 * Runtime 层 HTTP 初始化入口
 *
 * - 负责为 HttpClient 注入认证会话上下文（HttpAuthSession）
 * - 负责注入统一的认证异常处理逻辑（未登录 / 刷新失败时跳转 SSO）
 * - 注入 getLocale / DPoP applicationCode
 */

import { loadingManager } from '@/components/loading';
import { sso } from '@runtime/auth';
import {
  updateHttpClientOptions,
  type HttpAuthSession,
  type HttpClientOptions,
  type Client,
} from './registry';
import { useAccessTokenStore } from '@platform/stores';
import { useLocaleStore } from '@platform/stores/locale.store';
import { env } from '@shared/env';

/**
 * 将 platform 层的 token.store 适配为 HttpAuthSession
 */
function createHttpAuthSession(): HttpAuthSession {
  const store = useAccessTokenStore();

  return {
    client: store.client as Client | null,
    isLogin: store.isLogin,
    isAccessTokenValid: store.isAccessTokenValid,
    tokenExpired: store.tokenExpired,
    tokenString: store.tokenString,
    setTokenExpired: store.setTokenExpired,
  };
}

/**
 * 默认的认证异常处理：
 * - 统一处理 NO_LOGIN / TOKEN_REFRESH_FAILED 等认证相关错误
 * - 当前实现：关闭 loading、标记 client 未认证并跳转到 SSO
 */
async function defaultAuthErrorHandler(
  reason: 'NO_LOGIN' | 'TOKEN_REFRESH_FAILED',
  error: unknown,
): Promise<void> {
  console.warn('[Runtime HTTP] Auth error:', reason, error);

  loadingManager.hide();

  const store = useAccessTokenStore();
  if (store.client) {
    store.client.isAuthenticated = false;
  }

  try {
    await sso.redirectToSSO();
  } catch (redirectError) {
    console.error('[Runtime HTTP] redirectToSSO failed:', redirectError);
  }
}

/**
 * 初始化 HTTP 运行时：
 * - 为 default HttpClient 注入 HttpAuthSession / ensureAccessToken / getLocale / dpop
 *
 * 建议在应用启动时尽早调用（如平台 boot 中）
 */
export function initHttp(): void {
  const authSessionProvider = (): HttpAuthSession => createHttpAuthSession();

  const defaultOptions: Partial<HttpClientOptions> = {
    authSessionProvider,
    authErrorHandler: defaultAuthErrorHandler,
    ensureAccessToken: (opts) => sso.ensureAccessToken(opts),
    getLocale: () => useLocaleStore().locale || undefined,
    dpop: { applicationCode: env.VITE_APPLICATION_CODE },
  };

  updateHttpClientOptions('default', defaultOptions);
}
