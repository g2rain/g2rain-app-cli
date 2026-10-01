/**
 * 向 Main Shell 请求共享认证载荷，并在写入 Token Store 前等待定向响应。
 * 仅用于 qiankun 集成模式；不经公开 props。
 */

import { createSubDirectedMessage } from '@g2rain/platform/sub';
import type { RuntimeContext } from '@g2rain/platform';
import {
  MicroAppEventType,
  type TokenErrorData,
  type TokenResponseData,
} from '@/components/micro-app';
import { Generator } from '@shared/utils/random.util';
import { initTokenFromProps } from './init';

const AUTH_TIMEOUT_MS = 5000;

export interface SharedAuthRequestOptions {
  reason?: 'mount' | 'retry';
  timeoutMs?: number;
}

function matchesTarget(
  detail: {
    requestId?: string;
    applicationCode?: string;
    viewId?: string;
    instanceId?: string;
    appKey?: string;
  },
  expected: {
    requestId: string;
    applicationCode: string;
    viewId: string;
    instanceId: string;
  },
): boolean {
  if (detail.requestId !== expected.requestId) return false;
  if (detail.instanceId && detail.instanceId !== expected.instanceId) return false;
  if (detail.appKey && detail.appKey !== expected.instanceId) return false;
  if (detail.applicationCode && detail.applicationCode !== expected.applicationCode) return false;
  if (detail.viewId && detail.viewId !== expected.viewId) return false;
  return true;
}

/**
 * 先注册等待器，再发 REQUEST_TOKEN；成功则写入内存 Token Store。
 */
export async function requestSharedAuth(
  context: Pick<RuntimeContext, 'applicationCode' | 'viewId' | 'instanceId'>,
  options: SharedAuthRequestOptions = {},
): Promise<void> {
  const requestId = Generator.random();
  const timeoutMs = options.timeoutMs ?? AUTH_TIMEOUT_MS;
  const reason = options.reason ?? 'mount';

  const expected = {
    requestId,
    applicationCode: context.applicationCode,
    viewId: context.viewId,
    instanceId: context.instanceId,
  };

  const auth = await new Promise<TokenResponseData>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener(MicroAppEventType.TOKEN_RESPONSE, onResponse as EventListener);
      window.removeEventListener(MicroAppEventType.TOKEN_ERROR, onError as EventListener);
      window.clearTimeout(timer);
    };

    const settleOk = (data: TokenResponseData) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    };

    const settleErr = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onResponse = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        type?: string;
        requestId?: string;
        applicationCode?: string;
        viewId?: string;
        instanceId?: string;
        appKey?: string;
        data?: TokenResponseData;
      };
      if (!detail || typeof detail !== 'object') return;
      if (!matchesTarget(detail, expected)) return;
      const data = detail.data;
      if (!data?.token || !data?.tokenKid) {
        settleErr(new Error('MAIN_AUTH_BRIDGE_UNAVAILABLE'));
        return;
      }
      settleOk(data);
    };

    const onError = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        requestId?: string;
        applicationCode?: string;
        viewId?: string;
        instanceId?: string;
        appKey?: string;
        data?: TokenErrorData;
      };
      if (!detail || typeof detail !== 'object') return;
      if (!matchesTarget(detail, expected)) return;
      const code = detail.data?.code ?? 'AUTH_UNAVAILABLE';
      settleErr(new Error(code));
    };

    const timer = window.setTimeout(() => {
      settleErr(new Error('AUTH_TIMEOUT'));
    }, timeoutMs);

    window.addEventListener(MicroAppEventType.TOKEN_RESPONSE, onResponse as EventListener);
    window.addEventListener(MicroAppEventType.TOKEN_ERROR, onError as EventListener);

    const message = {
      ...createSubDirectedMessage(
        {
          applicationCode: context.applicationCode,
          viewId: context.viewId,
          instanceId: context.instanceId,
        },
        MicroAppEventType.REQUEST_TOKEN,
        { reason },
      ),
      requestId,
    };
    window.dispatchEvent(new CustomEvent(MicroAppEventType.REQUEST_TOKEN, { detail: message }));
  });

  await initTokenFromProps({
    token: auth.token,
    tokenKid: auth.tokenKid,
    client: auth.client,
  });
}
