/**
 * 权限控制组件
 * 提供页面元素权限控制和 API 调用权限控制
 */

export type {
  PageElementStatus,
  PageElementPermissionProvider,
  ApiPermissionProvider,
} from './types';

// 导出权限控制类
export {
  PageElementPermission,
  ApiPermission,
} from './permission';

// 导出便捷函数
export {
  hasPageElementPermission,
  getPageElementStatus,
  isPageElementEnabled,
  isPageElementVisible,
  hasApiPermission,
  checkApiRequest,
} from './permission';

// 导出 Vue 插件
export { permissionPlugin } from './plugin';
