/**
 * Mock 数据管理模块统一导出
 * 
 * 职责：
 * - 提供 Mock 服务管理功能
 * - 供 HTTP interceptors 调用
 * - 外部通过注册接口注册 mock 数据
 */

import { mockDataMap } from './data';
import { mockManager, MockManager } from './manager';

// 应用运行时统一注册基础 mock 数据（菜单、认证、资源等）
mockManager.registerAll(mockDataMap);

export { mockManager, MockManager };
export type { MockData, MockDataFunction, MockDataMap } from './types';
