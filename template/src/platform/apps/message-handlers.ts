/**
 * 子应用侧的微前端消息处理器实现
 * 用于处理主应用下发的 Token 刷新结果通知
 */

import type { MicroAppMessage, MicroAppMessageHandler, MicroAppMessageUnion, TokenResponseMessage } from '@/components/micro-app';
import { MicroAppEventType, isTokenResponseMessage } from '@/components/micro-app';
import type { MicroAppMessageProcessorImpl } from '@/components/micro-app/message-processor';
import { useAccessTokenStore } from '@platform/stores';
import { getHttpClient, fetchIamKeyId, fetchIamPublicKey, refreshBarrier, type Client } from '@runtime/http';

/**
 * 处理主应用下发的 Token 响应消息
 * 当前协议中只存在成功响应，收到后直接更新子应用的 token 和 client
 */
export class TokenResponseDataHandler implements MicroAppMessageHandler {
  async process(message: MicroAppMessage<MicroAppEventType, unknown>): Promise<void> {
    const messageUnion = message as MicroAppMessageUnion;
    if (!isTokenResponseMessage(messageUnion)) {
      return;
    }

    const typedMessage = messageUnion as TokenResponseMessage;
    const { token, tokenKid, client } = typedMessage.data;

    if (!token || !tokenKid) {
      console.warn(
        '[micro-app][TokenResponseDataHandler] 收到主应用 Token 响应，但 token 或 tokenKid 为空，忽略处理',
      );
      return;
    }

    const tokenStore = useAccessTokenStore();

    // 如果主应用返回了 client，先设置 client
    if (client) {
      tokenStore.client = client as Client;
    }

    try {
      // 使用 auth 类型 HttpClient 获取 IAM key 信息
      const authClient = getHttpClient('auth');

      // 获取 iamKeyId 和 publicKey 后设置 token
      const [iamKeyId, publicKey] = await Promise.all([
        fetchIamKeyId(authClient),
        fetchIamPublicKey(authClient),
      ]);
      await tokenStore.setTokens(token, tokenKid, iamKeyId, publicKey);
      refreshBarrier.resolveRefresh();
    } catch (err) {
      console.error(
        '[micro-app][TokenResponseDataHandler] 设置从主应用获取的 token 失败',
      );
      refreshBarrier.rejectRefresh(
        err instanceof Error ? err : new Error('TOKEN_RESPONSE_APPLY_FAILED'),
      );
      throw err;
    }
  }
}

/**
 * 初始化子应用侧的微前端消息处理器
 * 为 TOKEN_RESPONSE 事件注册 TokenResponseDataHandler 处理器
 */
export function initMicroAppMessageHandlers(processor: MicroAppMessageProcessorImpl): void {
  processor.registerHandler(MicroAppEventType.TOKEN_RESPONSE, new TokenResponseDataHandler());
  console.log('[MicroAppMessageHandlers] 子应用 TOKEN_RESPONSE 事件处理已初始化');
}
