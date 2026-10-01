/**
 * 应用初始化入口
 * 负责初始化应用资源、路由和权限控制
 */

import { watch, type WatchStopHandle } from 'vue';
import type { Router } from 'vue-router';
import { resourceManager } from './resource';
import { initRoutesFromResources } from './router';
import { useAccessTokenStore } from '@platform/stores';
import { env } from '@shared/env';
import { isQiankunRuntime } from '@shared/utils/mode.util';
import { sso } from '@runtime/auth';
import { initHttp } from '@runtime/http/setup';
import { updateRouter } from '@runtime/router';

export * from './types';
export * from './resource';
export * from './router';

/** 同一份子应用 JS 内 HTTP 引导只做一次 */
let httpBootstrapDone = false;
/** tokenExpired 监听全局只挂一条；多 Tab 用引用计数配对 mount/unmount */
let tokenExpiredWatchStop: WatchStopHandle | null = null;
let tokenExpiredWatcherRefCount = 0;

/**
 * 监听 tokenExpired 状态变化
 * - 集成模式：通知主应用刷新由 {@link sso.ensureAccessToken} 统一 emit，此处不重复发事件
 * - 独立运行模式：tokenExpired 变为 true 时调用 requestRefreshToken
 *
 * qiankun 多实例：每次 render/mount 调用一次；watch 与 initHttp 仅首次生效，避免重复监听。
 * 与 {@link teardownTokenExpiredWatcher} 成对（在 qiankun unmount 中调用）。
 */
export function setupTokenExpiredWatcher(): void {
  if (!httpBootstrapDone) {
    initHttp();
    httpBootstrapDone = true;
  }

  tokenExpiredWatcherRefCount++;

  if (tokenExpiredWatchStop != null) {
    return;
  }

  const accessTokenStore = useAccessTokenStore();

  // 启动时如果已经是 tokenExpired = true，则立即按当前模式处理一次
  if (accessTokenStore.tokenExpired) {
    if (isQiankunRuntime()) {
      if ((import.meta.env as any).DEV) {
        console.log('[boot] 启动时检测到 tokenExpired=true，集成模式走 ensureAccessToken');
      }
      void sso.ensureAccessToken({ force: true }).catch((error) => {
        console.error('[boot] 启动时 ensureAccessToken 失败:', error);
      });
    } else {
      if ((import.meta.env as any).DEV) {
        console.log('[boot] 启动时检测到 tokenExpired=true，独立模式调用 requestRefreshToken 刷新 token');
      }
      void sso.requestRefreshToken().catch((error) => {
        console.error('[boot] 启动时刷新 token 失败:', error);
      });
    }
  }

  tokenExpiredWatchStop = watch(
    () => accessTokenStore.tokenExpired,
    async (tokenExpired, prevTokenExpired) => {
      if (tokenExpired === prevTokenExpired) return;
      // 集成模式由 ensureAccessToken 统一发事件，watch 不介入
      if (isQiankunRuntime()) return;
      // 仅处理 false -> true（标记为过期）
      if (prevTokenExpired || !tokenExpired) return;

      if ((import.meta.env as any).DEV) {
        console.log('[boot] tokenExpired 变为 true，独立模式调用 requestRefreshToken 刷新 token');
      }

      try {
        await sso.requestRefreshToken();
      } catch (error) {
        console.error('[boot] 刷新 token 失败:', error);
      }
    },
    { immediate: false },
  );
}

/**
 * 与 setupTokenExpiredWatcher 成对：最后一个 qiankun 实例卸载时停止 watch。
 * 独立运行模式无需调用（页面级生命周期）。
 */
export function teardownTokenExpiredWatcher(): void {
  tokenExpiredWatcherRefCount = Math.max(0, tokenExpiredWatcherRefCount - 1);
  if (tokenExpiredWatcherRefCount > 0) {
    return;
  }

  console.log('[boot] 最后一个实例卸载，停止 tokenExpired 监听');

  tokenExpiredWatchStop?.();
  tokenExpiredWatchStop = null;
}

export function isSsoCallbackPath(): boolean {
  const currentPath = window.location.pathname;
  const contextPath = env.VITE_CONTEXT_PATH || '';
  return (
    currentPath === '/sso_callback' ||
    currentPath === `${contextPath}/sso_callback` ||
    (!!contextPath && currentPath === `${contextPath}sso_callback`) ||
    currentPath.endsWith('/sso_callback')
  );
}

/**
 * 初始化应用资源。
 * SSO 回调路径会等登录完成后，用本次 mount 传入的 Router 更新资源路由。
 */
export async function initApplicationResources(router?: Router): Promise<void> {
  if (isSsoCallbackPath()) {
    if (import.meta.env.DEV) {
      console.log('[initApplicationResources] 检测到 SSO 回调路径，启动登录状态监听');
    }

    return new Promise<void>((resolve, reject) => {
      const accessTokenStore = useAccessTokenStore();
      let resolved = false;
      let unwatch: WatchStopHandle | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const doInitResources = async () => {
        if (resolved) return;

        try {
          if (import.meta.env.DEV) {
            console.log('[initApplicationResources] 检测到登录状态，开始初始化资源');
          }

          await resourceManager.init();

          if (router) {
            const resourceRoutes = await initRoutesFromResources();
            updateRouter(router, resourceRoutes);

            if (import.meta.env.DEV) {
              console.log('[initApplicationResources] 资源初始化完成，路由已更新');
            }
          }

          resolved = true;
          unwatch?.();
          unwatch = null;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve();
        } catch (error) {
          console.error('[initApplicationResources] 资源初始化失败:', error);
          resolved = true;
          unwatch?.();
          unwatch = null;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          reject(error);
        }
      };

      if (accessTokenStore.isLogin) {
        void doInitResources();
        return;
      }

      timeoutId = setTimeout(() => {
        if (!resolved && !accessTokenStore.isLogin) {
          console.warn('[initApplicationResources] SSO 回调超时，未检测到登录状态');
          resolved = true;
          unwatch?.();
          unwatch = null;
          reject(new Error('SSO 回调超时，未检测到登录状态'));
        }
      }, 10000);

      unwatch = watch(
        () => accessTokenStore.isLogin,
        (isLogin) => {
          if (isLogin && !resolved) {
            void doInitResources();
          }
        },
        { immediate: false },
      );
    });
  }

  // 正常流程：验证 token 是否登录，然后初始化资源
  const accessTokenStore = useAccessTokenStore();
  if (!accessTokenStore.isLogin) {
    const error = new Error('用户未登录，无法初始化应用资源');
    console.error('[initApplicationResources]', error.message);
    throw error;
  }

  if (import.meta.env.DEV) {
    console.log('[initApplicationResources] 正常流程：用户已登录，开始初始化资源');
  }

  await resourceManager.init();
}

/**
 * 获取资源管理器实例
 */
export { resourceManager };

/**
 * 初始化路由（从资源页面）
 */
export { initRoutesFromResources };

