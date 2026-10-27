import { createSubDirectedMessage } from '@g2rain/platform/sub';
import { getEventAdapter } from './adapter';
import { peekHostIdentity } from './host-identity';
import { MicroAppEventType, MicroAppMessageFactory, type RouteChangeData, type MicroAppMessageUnion } from '@/components/micro-app';

// 仅导出 MicroAppProps（事件相关类型全部在 components/micro-app 中）
export type { MicroAppProps } from './types';

// 导出适配器相关
export type { EventAdapter } from '@/components/micro-app';
export { QiankunSubAppEventAdapter, registerQiankunLifecycle, getQiankunSubAppEventAdapter } from './adapter.qiankun';
export { getEventAdapter, setEventAdapter, resetEventAdapter } from './adapter';
export { MicroAppMessageProcessorImpl } from '@/components/micro-app/message-processor';
export { TokenResponseDataHandler, initMicroAppMessageHandlers } from './message-handlers';
export { registerHostIdentity, unregisterHostIdentity, peekHostIdentity } from './host-identity';

/**
 * 发送 Token 失效事件到主应用（须带 instanceId，壳按实例定向刷新）
 * @param applicationCode 应用编码
 * @returns 是否已发送；没有在挂实例时不发送
 */
export function emitTokenInvalid(applicationCode: string): boolean {
  const identity = peekHostIdentity();
  if (!identity) {
    console.warn('[emitTokenInvalid] no mounted host identity, skip');
    return false;
  }

  const message = createSubDirectedMessage(
    {
      applicationCode: identity.applicationCode,
      viewId: identity.viewId,
      instanceId: identity.instanceId,
    },
    MicroAppEventType.TOKEN_INVALID,
    { applicationCode, source: 'sub-app' as const },
  );

  const adapter = getEventAdapter();
  adapter.emitEvent(message as MicroAppMessageUnion);
  return true;
}

/**
 * 发送路由变化事件到主应用
 * @param data 路由变化事件数据
 */
export function emitRouteChange(data: RouteChangeData): void {
  const message = MicroAppMessageFactory.createRouteChange(data);

  const adapter = getEventAdapter();
  adapter.emitEvent(message as MicroAppMessageUnion);
}

// 导出工具函数
export {
  isAloneMode,
  isIntegrateMode,
  isQiankunRuntime,
  isQianKunMode,
  shouldRedirectToMainShellGateway,
} from '@shared/utils/mode.util';

// 导出初始化函数
export { initTokenFromProps } from './init';
export { requestSharedAuth } from './shared-auth-bridge';

