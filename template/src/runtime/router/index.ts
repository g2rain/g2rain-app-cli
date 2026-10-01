import { createRouter, createMemoryHistory, createWebHistory, type RouteRecordRaw } from 'vue-router';
import type { Router } from 'vue-router';
import type { App } from 'vue';
import { env } from '@shared/env';
import { isAloneMode, isQiankunRuntime } from '@shared/utils/mode.util';
import { authRoutes } from './auth.router';
import { homeRoutes } from './home.router';

/**
 * 创建路由
 * @param resourceRoutes 从资源接口加载的路由（必需）
 */
export function createAppRouter(resourceRoutes: RouteRecordRaw[]) {
  // 合并系统路由和资源路由
  // 独立模式：首页路由 + 认证路由 + 资源路由
  // 集成模式：首页路由 + 资源路由（认证路由由主应用处理）
  const allRoutes: RouteRecordRaw[] = isQiankunRuntime()
    ? [...homeRoutes, ...resourceRoutes] // qiankun：首页路由 + 资源路由
    : [...homeRoutes, ...authRoutes, ...resourceRoutes]; // 独立：含认证路由

  if ((import.meta.env as any).DEV) {
    console.log('[router] 创建路由，使用资源路由');
    console.log(
      '[router] 运行模式:',
      isQiankunRuntime() ? 'qiankun 集成' : isAloneMode() ? '独立 (alone)' : '独立',
    );
    console.log(
      '[router] 加载的路由:',
      allRoutes.map((r) => ({ path: r.path, name: r.name })),
    );
  }

  // 始终使用 env.VITE_CONTEXT_PATH 作为路由 base
  const base = env.VITE_CONTEXT_PATH;
  if ((import.meta.env as any).DEV) {
    console.log('[router] 路由 base:', base);
  }

  // 创建新路由（每次 mount 都创建新实例，避免路由冲突）
  const router = createRouter({
    history: isQiankunRuntime() ? createMemoryHistory(base) : createWebHistory(base),
    routes: allRoutes,
    // 添加 catch-all 路由，避免路由未匹配时出错
    strict: false,
  });

  // 调试：验证路由注册情况
  if ((import.meta.env as any).DEV) {
    console.log(
      '[router] 路由注册完成，所有路由:',
      router.getRoutes().map((r) => ({
        path: r.path,
        name: r.name,
        matched: r.path === '/' ? '根路径' : '其他路径',
      })),
    );
  }

  return router;
}

/**
 * 初始化路由
 * 所有路由都从资源接口加载
 * @param resourceRoutes 从资源接口加载的路由（必需）
 */
export function initRouter(resourceRoutes: RouteRecordRaw[]) {
  return createAppRouter(resourceRoutes);
}

/**
 * 更新路由（用于 qiankun update 生命周期）
 * 根据新的资源路由更新路由配置（只更新资源路由，系统路由保持不变）
 * @param resourceRoutes 从资源接口加载的路由（必需）
 */
export function updateRouter(router: Router | null | undefined, resourceRoutes: RouteRecordRaw[]) {
  if (!router) {
    if ((import.meta.env as any).DEV) {
      console.warn('[router] 路由实例不存在，无法更新路由');
    }
    return;
  }

  // 获取系统路由名称（这些路由不应该被移除）
  const systemRouteNames = new Set([
    ...homeRoutes.map((r) => r.name).filter(Boolean),
    ...(isQiankunRuntime() ? [] : authRoutes.map((r) => r.name).filter(Boolean)),
  ]);

  // 获取当前所有路由名称（排除系统路由）
  const currentRouteNames = router
    .getRoutes()
    .map((route: RouteRecordRaw) => route.name)
    .filter((name): name is string => Boolean(name) && !systemRouteNames.has(name as string));

  // 获取新资源路由的名称
  const newResourceRouteNames = new Set(
    resourceRoutes.map((r) => r.name).filter(Boolean) as string[],
  );

  // 移除不在新资源路由列表中的旧资源路由
  currentRouteNames.forEach((name: string) => {
    if (!newResourceRouteNames.has(name)) {
      router.removeRoute(name);
    }
  });

  // 添加或更新新的资源路由
  resourceRoutes.forEach((route: RouteRecordRaw) => {
    if (route.name) {
      // 检查路由是否已存在
      const existingRoute = router.getRoutes().find((r: RouteRecordRaw) => r.name === route.name);
      if (existingRoute) {
        // 如果路由已存在，先移除再添加（更新路由）
        router.removeRoute(route.name as string);
      }
      router.addRoute(route);
    } else {
      // 没有 name 的路由直接添加
      router.addRoute(route);
    }
  });

  if ((import.meta.env as any).DEV) {
    console.log('[router] 路由已更新，当前路由数量:', router.getRoutes().length);
    console.log(
      '[router] 更新的资源路由:',
      resourceRoutes.map((r) => ({ path: r.path, name: r.name })),
    );
  }
}

/**
 * 设置路由到 Vue 应用
 * @param app Vue 应用实例
 * @param resourceRoutes 从资源接口加载的路由（必需）
 */
export const setupRouter = (app: App<Element>, resourceRoutes: RouteRecordRaw[]) => {
  const router = initRouter(resourceRoutes);
  app.use(router);
  return router;
};

