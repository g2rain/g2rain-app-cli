/**
 * 微前端事件组件
 * 提供类型安全的事件系统，用于主应用与子应用之间的通信
 */

import { MicroAppEventType } from './types';

// 导出事件类型枚举
export { MicroAppEventType } from './types';

// 导出所有类型定义
export type {
  MicroAppMessage,
  MicroAppMessageUnion,
  TokenRequestMessage,
  TokenResponseMessage,
  TokenErrorMessage,
  TokenInvalidMessage,
  RouteChangeMessage,
  TokenRequestData,
  TokenResponseData,
  TokenErrorData,
  TokenInvalidData,
  RouteChangeData,
  EventAdapter,
} from './types';

// 导出类型守卫函数
export {
  isTokenRequestMessage,
  isTokenResponseMessage,
  isTokenErrorMessage,
  isTokenInvalidMessage,
  isRouteChangeMessage,
} from './types';

// 导出消息创建工厂
export { MicroAppMessageFactory } from './types';

// 导出消息处理器接口
export type {
  MicroAppMessageHandler,
  MicroAppMessageProcessor,
} from './types';

/**
 * @deprecated 使用 MicroAppEventType 替代
 * 保留此常量以保持与主应用的事件名称兼容
 */
export const MICRO_APP_EVENT = {
  REQUEST_TOKEN: MicroAppEventType.REQUEST_TOKEN,
  TOKEN_RESPONSE: MicroAppEventType.TOKEN_RESPONSE,
  TOKEN_ERROR: MicroAppEventType.TOKEN_ERROR,
  TOKEN_INVALID: MicroAppEventType.TOKEN_INVALID,
  ROUTE_CHANGE: MicroAppEventType.ROUTE_CHANGE,
} as const;
