/**
 * 子应用微前端类型定义
 * 仅保留与运行时 props 相关的类型，其它事件类型全部改用 `components/micro-app`
 */

/**
 * 主应用传递给子应用的 props 接口
 * 支持所有微前端模式（Qiankun、single-spa、Module Federation 等）
 */
export interface MicroAppProps {
  container?: HTMLElement;
  /** 稳定应用编码，须等于本应用 VITE_APPLICATION_CODE */
  applicationCode?: string;
  /** 主壳工作区视图身份 */
  viewId?: string;
  /** 运行实例身份 */
  instanceId?: string;
  /** 迁移期实例别名，须等于 instanceId */
  appKey?: string;
  paths?: string[]; // 允许访问的路径列表（用于动态加载路由）
  initialRoute?: string; // 初始路由路径（如 '/test/dict'），用于子应用初始化时跳转
  activeRule?: string; // 子应用的激活规则（如 '/sub-app-1'）
  entryOrigin?: string; // 子应用的 entry origin（用于后端请求，如 'http://localhost:3001'）
  /** 主应用当前语言，如 zh-CN（集成模式由 main-shell 传入） */
  locale?: string;
  [key: string]: unknown; // 允许其他自定义参数
}
