import { defineStore } from 'pinia';
import type { Token, ApplicationScope } from '@platform/types/http.types';
import type { DpopClient as Client } from '@g2rain/http';
import { jwtVerify } from 'jose';
import { publicKeyStringToJwk } from '@shared/utils/jwt.util';
import { isQiankunRuntime } from '@shared/utils/mode.util';
import { isMockEnabled } from '@shared/env';

/** 独立模式自有键；集成模式禁止落盘。勿读写壳键 g2rain-shell-token:*（壳会话由 Main Shell 拥有）。 */
const STORAGE_KEY = 'g2rain_token';

export const useAccessTokenStore = defineStore('token', {
  state: () => ({
    client: null as Client | null,
    token: null as Token | null, // token反序列化后的json对象
    tokenString: null as string | null, // token的string格式。网关返回后直接保存
    logged: false, // 登录状态，默认为未登录
    status: 'NORMAL', // 状态 NORMAL正常；SSO 正在sso初始化token；LOGOUT 登出
    tokenExpired: false, // token 是否过期
  }),
  getters: {
    isLogin(): boolean {
      // 1. 检查 client 和 token 是否存在
      if (!this.client || !this.token) {
        return (this.logged = false);
      }
      // mock 模式下 token 永不过期，避免硬编码/历史 JWT 的 expireAt 干扰本地联调
      if (isMockEnabled()) {
        return (this.logged = true);
      }

      // 2. 检查 token 的过期时间
      try {
        const now = new Date();
        const refreshExpireAt = new Date(this.token.refreshExpireAt * 1000);
        return (this.logged = refreshExpireAt > now);
      } catch (error) {
        // 如果日期解析失败，也认为未登录
        console.error('日期解析错误:', error);
        return false;
      }
    },
    isAdminCompany(): boolean {
      return this.token?.adminCompany === true;
    },
    organId(): number | undefined {
      return this.token?.organId;
    },
    isAccessTokenValid(): boolean {
      if (!this.token) return false;
      // mock 模式下 token 永不过期
      if (isMockEnabled()) {
        return true;
      }
      if (!this.token.expireAt) return false;

      try {
        const expireAt = new Date(this.token.expireAt * 1000);
        const now = new Date();
        return expireAt > now;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
  },
  actions: {
    async setTokens(tokenString: string, tokenKid: string, iamKeyId: string, publicKey: string) {
      try {
        // 验证 tokenKid 是否匹配
        if (tokenKid !== iamKeyId) {
          throw new Error(`SSO公钥不存在，tokenKid: ${tokenKid}`);
        }

        // 使用公钥验证 token
        const publicKeyJwk = await publicKeyStringToJwk(publicKey);
        const { payload } = await jwtVerify(tokenString, publicKeyJwk);

        this.tokenString = tokenString;
        const rawOrganId = payload.organId;
        const organId = rawOrganId != null && rawOrganId !== '' ? Number(rawOrganId) : undefined;

        this.token = {
          clientId: (payload.clientId as string) || '',
          clientPublicKey: (payload.clientPublicKey as string) || '',
          applicationScopes: (payload.applicationScopes as ApplicationScope[]) || [],
          expireAt: (payload.expireAt as number) || 0,
          refreshExpireAt: (payload.refreshExpireAt as number) || 0,
          adminCompany: payload.adminCompany === true,
          organId: organId != null && !Number.isNaN(organId) ? organId : undefined,
        };

        this.logged = true;
        this.status = 'NORMAL';
        this.tokenExpired = false;
      } catch (error) {
        console.error('Token 验证失败:', error);
        throw new Error('无效的 token 格式');
      }
    },

    logout() {
      this.token = null;
      this.tokenString = null;
      this.client = null;
      this.tokenExpired = false;
    },

    // 标记 token 过期状态
    setTokenExpired(tokenExpired: boolean) {
      this.tokenExpired = tokenExpired;
    },
  },
  // 持久化：仅独立模式。qiankun 集成模式 Token 经 Auth Bridge 进内存 Store，不持久化壳会话。
  persist: isQiankunRuntime()
    ? false
    : {
      key: STORAGE_KEY,
      storage: localStorage,
      pick: ['client', 'token', 'tokenString', 'logged', 'tokenExpired'],
    },
});
