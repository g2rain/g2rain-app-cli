/**
 * IAM 公钥 / keyId 拉取（应用运行时缓存，不进 @g2rain/http）
 */
import type { HttpClient } from './types';

let cachedIamKeyId: string | null = null;
let cachedIamPublicKey: string | null = null;

/**
 * 从服务器获取 IAM keyId
 * - 通过传入的 HttpClient（通常为 getHttpClient('auth')）请求
 */
export async function fetchIamKeyId(httpClient: HttpClient<true>): Promise<string> {
  if (cachedIamKeyId) {
    return cachedIamKeyId;
  }

  try {
    const keyId = await httpClient.get<string>('/keys/iam-key-id');
    const text = (keyId as unknown as { data?: unknown }).data ?? keyId;
    cachedIamKeyId = typeof text === 'string' ? text.trim() : null;
    if (cachedIamKeyId == null) {
      throw new Error('Failed to fetch IAM key ID: empty response');
    }
    return cachedIamKeyId;
  } catch (error) {
    console.error('Failed to fetch IAM key ID:', error);
    throw error;
  }
}

/**
 * 从服务器获取 IAM 公钥
 * - 通过传入的 HttpClient（通常为 getHttpClient('auth')）请求
 */
export async function fetchIamPublicKey(httpClient: HttpClient<true>): Promise<string> {
  if (cachedIamPublicKey) {
    return cachedIamPublicKey;
  }

  try {
    const publicKey = await httpClient.get<string>('/keys/iam-public-key');
    const text = (publicKey as unknown as { data?: unknown }).data ?? publicKey;
    cachedIamPublicKey = typeof text === 'string' ? text.trim() : null;
    if (cachedIamPublicKey == null) {
      throw new Error('Failed to fetch IAM public key: empty response');
    }
    return cachedIamPublicKey;
  } catch (error) {
    console.error('Failed to fetch IAM public key:', error);
    throw error;
  }
}
