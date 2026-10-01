/**
 * 微前端事件类型定义
 * 使用泛型和 Discriminated Union 实现类型安全的事件系统
 */

import type { DpopClient as Client } from '@g2rain/http';

/**
 * 事件类型枚举
 */
export enum MicroAppEventType {
  /** 子应用请求 token */
  REQUEST_TOKEN = 'g2rain:sub-app:request-token',
  /** 主应用返回 token */
  TOKEN_RESPONSE = 'g2rain:main-app:token-response',
  /** 主应用返回认证错误（协议扩展） */
  TOKEN_ERROR = 'g2rain:main-app:token-error',
  /** 子应用通知 token 失效 */
  TOKEN_INVALID = 'g2rain:sub-app:token-invalid',
  /** 子应用路由变化 */
  ROUTE_CHANGE = 'g2rain:sub-app:route-change',
}

/**
 * 基础消息信封结构
 * 所有微前端消息都遵循此结构
 */
export interface MicroAppMessage<T extends MicroAppEventType, D = unknown> {
  /** 事件类型（用于类型区分） */
  type: T;
  /** 消息数据（根据事件类型不同而不同） */
  data: D;
  /** 请求 ID（用于匹配请求和响应，可选） */
  requestId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 发送方应用标识（可选；迁移期等于 instanceId） */
  appKey?: string;
  applicationCode?: string;
  viewId?: string;
  instanceId?: string;
}

/**
 * Token 请求消息数据
 */
export interface TokenRequestData {
  reason?: 'mount' | 'retry';
}

/**
 * Token 响应消息数据
 */
export interface TokenResponseData {
  /** 访问令牌 */
  token: string;
  /** Token 的 kid（密钥 ID） */
  tokenKid: string;
  /** 客户端信息（可选；Shell 浅拷贝） */
  client?: Client;
}

/**
 * Token 错误消息数据（仅错误码，无认证载荷）
 */
export interface TokenErrorData {
  code:
    | 'UNAUTHORIZED_INSTANCE'
    | 'SESSION_EXPIRED'
    | 'AUTH_TIMEOUT'
    | 'AUTH_UNAVAILABLE';
}

/**
 * Token 失效消息数据（通常为空）
 */
export interface TokenInvalidData {
  /** 可选的错误信息 */
  reason?: string;
}

/**
 * 路由变化消息数据
 */
export interface RouteChangeData {
  /** 子应用的标识（menuItem的key，唯一） */
  appKey: string;
  /** 子应用的激活规则（如 '/sub-app-1'） */
  activeRule: string;
  /** 子应用内部路由路径（如 '/test/dict'） */
  routePath: string;
  /** 完整路径（activeRule + routePath，如 '/sub-app-1/test/dict'） */
  fullPath: string;
}

/**
 * 具体的事件消息类型定义
 */
export type TokenRequestMessage = MicroAppMessage<MicroAppEventType.REQUEST_TOKEN, TokenRequestData>;
export type TokenResponseMessage = MicroAppMessage<MicroAppEventType.TOKEN_RESPONSE, TokenResponseData>;
export type TokenErrorMessage = MicroAppMessage<MicroAppEventType.TOKEN_ERROR, TokenErrorData>;
export type TokenInvalidMessage = MicroAppMessage<MicroAppEventType.TOKEN_INVALID, TokenInvalidData>;
export type RouteChangeMessage = MicroAppMessage<MicroAppEventType.ROUTE_CHANGE, RouteChangeData>;

/**
 * 所有微前端消息的联合类型
 */
export type MicroAppMessageUnion =
  | TokenRequestMessage
  | TokenResponseMessage
  | TokenErrorMessage
  | TokenInvalidMessage
  | RouteChangeMessage;

/**
 * 类型守卫函数：判断是否为 Token 请求消息
 */
export function isTokenRequestMessage(message: MicroAppMessageUnion): message is TokenRequestMessage {
  return message.type === MicroAppEventType.REQUEST_TOKEN;
}

/**
 * 类型守卫函数：判断是否为 Token 响应消息
 */
export function isTokenResponseMessage(message: MicroAppMessageUnion): message is TokenResponseMessage {
  return message.type === MicroAppEventType.TOKEN_RESPONSE && 'token' in message.data;
}

/**
 * 类型守卫函数：判断是否为 Token 错误消息
 */
export function isTokenErrorMessage(message: MicroAppMessageUnion): message is TokenErrorMessage {
  return message.type === MicroAppEventType.TOKEN_ERROR && 'code' in message.data;
}

/**
 * 类型守卫函数：判断是否为 Token 失效消息
 */
export function isTokenInvalidMessage(message: MicroAppMessageUnion): message is TokenInvalidMessage {
  return message.type === MicroAppEventType.TOKEN_INVALID;
}

/**
 * 类型守卫函数：判断是否为路由变化消息
 */
export function isRouteChangeMessage(message: MicroAppMessageUnion): message is RouteChangeMessage {
  return message.type === MicroAppEventType.ROUTE_CHANGE;
}

/**
 * 消息创建辅助函数
 */
export const MicroAppMessageFactory = {
  /**
   * 创建 Token 请求消息
   */
  createTokenRequest(data: TokenRequestData, requestId?: string): TokenRequestMessage {
    return {
      type: MicroAppEventType.REQUEST_TOKEN,
      data,
      requestId,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建 Token 响应消息
   */
  createTokenResponse(data: TokenResponseData, requestId?: string): TokenResponseMessage {
    return {
      type: MicroAppEventType.TOKEN_RESPONSE,
      data,
      requestId,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建 Token 错误消息
   */
  createTokenError(data: TokenErrorData, requestId?: string): TokenErrorMessage {
    return {
      type: MicroAppEventType.TOKEN_ERROR,
      data,
      requestId,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建 Token 失效消息
   */
  createTokenInvalid(data: TokenInvalidData = {}): TokenInvalidMessage {
    return {
      type: MicroAppEventType.TOKEN_INVALID,
      data,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建路由变化消息
   */
  createRouteChange(data: RouteChangeData): RouteChangeMessage {
    return {
      type: MicroAppEventType.ROUTE_CHANGE,
      data,
      timestamp: Date.now(),
    };
  },
};

/**
 * 消息处理器接口
 * 统一处理所有类型的消息
 */
export interface MicroAppMessageHandler {
  /**
   * 处理消息
   * @param message 消息对象
   */
  process(message: MicroAppMessage<MicroAppEventType, unknown>): void | Promise<void>;
}

/**
 * 统一消息处理器接口
 * 根据消息的 type 自动分发到对应的处理器
 */
export interface MicroAppMessageProcessor {
  /**
   * 处理消息
   * 根据消息的 type 自动分发到对应的处理器
   * @param message 消息对象
   */
  process(message: MicroAppMessage<MicroAppEventType, unknown>): void | Promise<void>;

  /**
   * 移除所有处理器
   */
  clearHandlers(): void;
}

/**
 * 事件适配器接口
 * 提供统一的事件监听和发送接口（通常基于 window 或其他通信机制）
 */
export interface EventAdapter {
  /**
   * 初始化事件监听器
   * 监听其他应用发送的事件
   */
  initEventListeners(): void;

  /**
   * 清理事件监听器
   */
  cleanupEventListeners(): void;

  /**
   * 发送事件到其他应用
   * 直接发送一个规范化的微前端消息对象
   * @param message 微前端消息
   */
  emitEvent(message: MicroAppMessageUnion): void;
}
