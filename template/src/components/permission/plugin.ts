/**
 * Vue 权限控制插件
 * 注册全局权限指令和组合式函数
 */

import type { App } from 'vue';
import { PageElementPermission } from './permission';

/**
 * 权限控制插件
 */
export const permissionPlugin = {
  install(app: App) {
    // 注册全局指令 v-permission
    app.directive('permission', PageElementPermission.directive);

    // 注册全局属性（可选）
    app.config.globalProperties.$hasPermission = PageElementPermission.has;
  },
};
