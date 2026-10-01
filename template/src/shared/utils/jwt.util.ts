import { exportJWK, generateKeyPair, JWK, importSPKI } from 'jose';
import { Generator } from '@shared/utils/random.util';
import type { DpopClient as Client } from '@g2rain/http';

// 生成密钥对 - 支持降级方案
export async function generateKey() {
  try {
    const { privateKey, publicKey } = await generateKeyPair('ES256', {
      extractable: true,
    });

    // 导出公钥为字符串
    const publicKeyJwk = await cryptoKeyToJwk(publicKey);

    // 导出私钥为字符串
    const privateKeyJwk = await cryptoKeyToJwk(privateKey);

    return {
      publicKey: publicKeyJwk,
      privateKey: privateKeyJwk,
    };
  } catch (error) {
    console.error('Web Crypto API 密钥生成失败，使用降级方案:', error);
    // 降级到预生成密钥
    throw error;
  }
}

async function cryptoKeyToJwk(key: CryptoKey): Promise<JWK> {
  return await exportJWK(key);
}

export async function publicKeyStringToJwk(publicKey: string): Promise<JWK> {
  const key = await importSPKI(publicKey, 'ES256');
  return await exportJWK(key);
}

// 生成密钥对并导出为多种格式
export async function generateClient(): Promise<Client> {
  try {
    // 1. 生成密钥对
    const { publicKey, privateKey } = await generateKey();

    return {
      clientId: Generator.random(),
      privateKey,
      publicKey,
      isAuthenticated: false,
    };
  } catch (error) {
    console.error('密钥对生成和导出失败:', error);
    throw error;
  }
}

