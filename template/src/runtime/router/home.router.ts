/**
 * 首页相关路由配置
 * 包含首页路由配置
 */

import type { RouteRecordRaw } from 'vue-router';

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Root',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页', requiresAuth: true, showInHome: false },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页', requiresAuth: true, showInHome: false },
  },
];

