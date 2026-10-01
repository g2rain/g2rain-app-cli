/**
 * 认证相关应用 Mock 数据
 * 包含菜单、权限、IAM key 与 token 签发等认证相关的 mock 数据
 *
 * Mock IAM 密钥在会话内动态生成并缓存，访问令牌按请求签发，
 * expireAt / refreshExpireAt 相对当前时间，避免硬编码 JWT 过期后联调失败。
 */

import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  exportSPKI,
  generateKeyPair,
  type JWK,
} from 'jose';
import type { MenuItem } from '@platform/types/menu.type';
import type { MockDataFunction } from '../index';
import type { Result } from '../../types';

/**
 * Mock 菜单列表数据
 */
export const mockMenuList: MenuItem[] = [
  {
    key: 'home',
    title: '首页',
    type: 'main',
    routePath: '/main/home',
  },
  {
    key: 'system',
    title: '系统设置',
    type: 'group',
    children: [
      {
        key: 'system-passport',
        title: '账号管理',
        type: 'main',
        routePath: '/main/system/passport',
      },
    ],
  },
  {
    key: 'group-test',
    title: '测试1',
    type: 'group',
    children: [
      {
        key: 'test-dict',
        title: '字典管理',
        type: 'sub', // 子应用菜单项必须是 'sub' 类型
        routePath: '/dict',
        name: 'g2rain-test-app',
        activeRule: '/test',
        entry: 'http://localhost:3001', // 子应用入口地址（开发环境，使用完整 URL）
      },
      {
        key: 'test-',
        title: '测试应用首页',
        type: 'sub', // 子应用菜单项必须是 'sub' 类型
        routePath: '/',
        name: 'g2rain-test-app',
        activeRule: '/test',
        entry: 'http://localhost:3001', // 子应用入口地址（开发环境，使用完整 URL）
      },
    ],
  },
];

type MockIamMaterial = {
  privateKey: CryptoKey;
  publicKeyPem: string;
  kid: string;
  publicJwk: JWK;
};

/** 会话内单例：保证 /auth/token 与 /keys/* 使用同一对密钥 */
let mockIamMaterialPromise: Promise<MockIamMaterial> | null = null;

async function getMockIamMaterial(): Promise<MockIamMaterial> {
  if (!mockIamMaterialPromise) {
    mockIamMaterialPromise = (async () => {
      const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
      const publicKeyPem = await exportSPKI(publicKey);
      const publicJwk = await exportJWK(publicKey);
      const kid = await calculateJwkThumbprint(publicJwk);
      return { privateKey, publicKeyPem, kid, publicJwk };
    })();
  }
  return mockIamMaterialPromise;
}

/** 兼容旧导入：解析为当前会话 mock IAM 公钥（异步） */
export async function getMockIamPublicKey(): Promise<string> {
  return (await getMockIamMaterial()).publicKeyPem.trim();
}

/** 兼容旧导入：解析为当前会话 mock IAM key id（异步） */
export async function getMockIamKeyId(): Promise<string> {
  return (await getMockIamMaterial()).kid;
}

async function createMockAccessToken(): Promise<{ token: string; keyId: string }> {
  const iam = await getMockIamMaterial();
  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + 365 * 24 * 3600;
  const refreshExpireAt = now + 2 * 365 * 24 * 3600;

  const token = await new SignJWT({
    clientPublicKey: JSON.stringify({
      kty: 'EC',
      crv: 'P-256',
      x: 'qC0rhNTkiRJ52RbHOgMwt7vPTyN7z_nbiMfjdwo0YxE',
      y: 'WVfZMP_if_UYOxhQkRxNVcXW2wHvo-khroNSHevl2Z4',
    }),
    adminCompany: false,
    admin_company: false,
    applicationCodes: ['g2rain-default'],
    applicationScopes: [],
    refreshExpireAt,
    issuedAt: now,
    expireAt,
    admin_user: false,
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: iam.kid })
    .sign(iam.privateKey);

  return { token, keyId: iam.kid };
}

async function createMockDpopToken(): Promise<{ token: string }> {
  const iam = await getMockIamMaterial();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    htm: 'POST',
    acd: 'g2rain-default',
    pha: 'zHfc4OGioRJ4DXvpZZUMHgm359y-itH95J0g_-2KTBU',
    htu: '/auth/token',
    jti: '019b4ddf16300000bb6ad3f91a6826cd6ec157c683fcf3a3',
  })
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dpop+jwt',
      kid: iam.kid,
      jwk: iam.publicJwk,
    })
    .setIssuedAt(now)
    .setExpirationTime(now + 365 * 24 * 3600)
    .sign(iam.privateKey);

  return { token };
}

async function createTokenResult(): Promise<Result> {
  const { token, keyId } = await createMockAccessToken();
  return {
    requestId: null,
    requestTime: null,
    status: 200,
    errorCode: '',
    errorMessage: '',
    data: { token, keyId },
  } as unknown as Result;
}

/**
 * 认证相关 Mock 接口配置
 * 包含 token 获取、签名、IAM key 等认证相关的 mock 接口
 */
export const authMockDataMap = {
  // GET /keys/iam-public-key - 纯文本 PEM
  '/keys/iam-public-key': (async () => getMockIamPublicKey()) as MockDataFunction,
  '/*/keys/iam-public-key': (async () => getMockIamPublicKey()) as MockDataFunction,

  // GET /keys/iam-key-id - 纯文本 key id
  '/keys/iam-key-id': (async () => getMockIamKeyId()) as MockDataFunction,
  '/*/keys/iam-key-id': (async () => getMockIamKeyId()) as MockDataFunction,

  // POST /auth/token - 获取访问令牌
  // 请求体：{ code: string, grantType: string }
  // 返回：Result<{ token: string, keyId: string }>
  '/auth/token': (async () => createTokenResult()) as MockDataFunction,
  '/*/auth/token': (async () => createTokenResult()) as MockDataFunction,

  // POST /lua/sign_code - Lua 签名接口
  // 返回：{ token: string } (JWT Token 字符串)
  '/lua/sign_code': (async () => createMockDpopToken()) as MockDataFunction,
  '/*/lua/sign_code': (async () => createMockDpopToken()) as MockDataFunction,
};
