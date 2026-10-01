/**
 * 基于资源页面的路由初始化
 * 根据 resource_page 表动态初始化路由
 */

import type { RouteRecordRaw } from 'vue-router';
import { resourceManager } from './resource';
import type { ResourcePage } from './types';
import { getRouteComponent } from '@/views/route-map';

/**
 * 根据资源页面生成路由配置
 * @param pages 页面资源列表
 * @returns 路由配置数组
 */
export function generateRoutesFromPages(pages: ResourcePage[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  for (const page of pages) {
    // 生成路由名称（从 pageCode 转换，如 'user' -> 'User'）
    const routeName = page.pageCode
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    // 优先使用 route-map.ts 中已定义的静态导入映射
    // 如果不存在，则使用动态导入（需要添加 vite-ignore 注释）
    const staticComponent = getRouteComponent(page.linkPath);
    const component = staticComponent || getDynamicComponent(page.linkPath);

    const route: RouteRecordRaw = {
      path: page.linkPath,
      name: routeName,
      component,
      meta: {
        title: page.pageName,
        requiresAuth: true,
        pageCode: page.pageCode,
        showInHome: true, // 可以根据需要调整
      },
    };

    routes.push(route);
  }

  return routes;
}

/**
 * 获取动态组件加载函数
 * 使用 vite-ignore 注释来避免 Vite 分析警告
 * @param linkPath 链接路径（如 '/user' 或 '/system/user'）
 * @returns 组件加载函数
 */
function getDynamicComponent(linkPath: string): () => Promise<any> {
  const componentPath = getComponentPathFromLinkPath(linkPath);

  // 注意：这会导致该组件不会被 Vite 预构建，但可以正常工作
  return () => import(/* @vite-ignore */ componentPath);
}

/**
 * 根据链接路径生成组件路径
 * @param linkPath 链接路径（如 '/user' 或 '/system/user'）
 * @returns 组件导入路径（如 '@/views/user/index.vue'）
 */
function getComponentPathFromLinkPath(linkPath: string): string {
  const pathParts = linkPath.replace(/^\//, '').split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return '@/views/Home.vue';
  }

  // 如果路径是单层（如 'user'），则组件路径为 '@/views/user/index.vue'
  // 如果路径是多层（如 'system/user'），则组件路径为 '@/views/system/user/index.vue'
  const viewPath = pathParts.join('/');
  return `@/views/${viewPath}/index.vue`;
}

/**
 * 初始化路由（从资源管理器加载）
 * @returns 路由配置数组
 */
export async function initRoutesFromResources(): Promise<RouteRecordRaw[]> {
  const pages = resourceManager.getPages();
  if (pages.length === 0) {
    console.warn('[initRoutesFromResources] 未找到页面资源，返回空路由数组');
    return [];
  }

  return generateRoutesFromPages(pages);
}

