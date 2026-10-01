/**
 * 微前端子应用初始化
 * 从主应用传递的 props 中获取 token 和 client 并设置到 store
 */

import { useAccessTokenStore } from '@platform/stores';
import { getHttpClient, fetchIamKeyId, fetchIamPublicKey, type Client } from '@runtime/http';
export interface HostAuthPayload {
  token?: string;
  tokenKid?: string;
  client?: unknown;
}

/**
 * 把宿主认证载荷写入已有 Token Store。
 * 只接受 token / tokenKid / client，调用方不得把它们放进公开 Context 或 window。
 */
export async function initTokenFromProps(auth: HostAuthPayload): Promise<void> {
  if (!auth.token || !auth.tokenKid) {
    console.warn('主应用未传递 token 或 tokenKid，跳过 token 初始化');
    return;
  }

  try {
    const tokenStore = useAccessTokenStore();

    if (auth.client && typeof auth.client === 'object') {
      tokenStore.client = auth.client as Client;
    }
    
    // 使用 auth 类型 HttpClient 获取 IAM key 信息
    const authClient = getHttpClient('auth');

    // 设置 token（需要获取 iamKeyId 和 publicKey）
    const iamKeyId = await fetchIamKeyId(authClient);
    const publicKey = await fetchIamPublicKey(authClient);
    await tokenStore.setTokens(auth.token, auth.tokenKid, iamKeyId, publicKey);
  } catch (error) {
    console.error('[micro-app] 子应用 token 初始化失败');
    throw error;
  }
}

