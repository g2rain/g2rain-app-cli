/**
 * SSO 认证服务
 * 处理单点登录相关的认证流程
 */

import { env, getPathWithContextPath, isMockEnabled } from '@shared/env';
import { useAccessTokenStore } from '@platform/stores';
import { createDpopProof, type DpopClient } from '@g2rain/http';
import { fetchIamKeyId, fetchIamPublicKey, getHttpClient, refreshBarrier, type Result, type EnsureAccessTokenOptions, type HttpClient } from '@runtime/http';
import { emitTokenInvalid } from '@platform/apps';
import { isQiankunRuntime } from '@shared/utils/mode.util';
import type { AxiosRequestConfig } from 'axios';
import { watch } from 'vue';
import { Generator } from '@shared/utils/random.util';
import { generateClient } from '@shared/utils/jwt.util';

class SSOService {
  private isAuthenticationPending = false;
  private isRefreshPending = false;
  private pendingSubscribers: ((token: string) => void)[] = [];
  private refreshPromise: Promise<{ token: string; tokenKid: string }> | null = null;
  /** HTTP 层「保证 access 可用」单飞 Promise，与 requestRefreshToken 内单飞配合 */
  private ensureAccessTokenPromise: Promise<void> | null = null;

  private getAccessTokenStore() {
    return useAccessTokenStore();
  }

  private createTokenProof(url: string, data: unknown, client: DpopClient | null, jti: string): Promise<string> {
    if (!client) {
      throw new Error('client is required');
    }
    return createDpopProof({
      url,
      method: 'post',
      params: '',
      data,
      applicationCode: env.VITE_APPLICATION_CODE,
      client,
      jti,
    });
  }

  public async redirectToSSO(): Promise<void> {
    const accessTokenStore = this.getAccessTokenStore();

    // 如果 client 不存在，则初始化
    if (!accessTokenStore.client) {
      const client = await generateClient();
      accessTokenStore.client = client;
    }

    if (!accessTokenStore.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const ssoBaseUrl = env.VITE_SSO_BASE_URL;
    const authEndpoint = env.VITE_AUTH_END_POINT;
    const redirectUriPath = env.VITE_REDIRECT_URI;

    // 构建完整的回调地址：当前应用的 base URL + context path + redirect URI
    const currentOrigin = window.location.origin;
    // 使用 getPathWithContextPath 函数处理路径拼接，避免双斜杠
    const fullRedirectPath = getPathWithContextPath(redirectUriPath);
    // 直接拼接 origin 和路径，确保路径以 / 开头
    const redirectUri = currentOrigin + fullRedirectPath;
    // 构建SSO认证URL
    const ssoUrl = new URL(ssoBaseUrl + authEndpoint);
    const params = new URLSearchParams({
      clientId: accessTokenStore.client.clientId,
      redirectUri: redirectUri,
      responseType: 'code',
      publicKey: JSON.stringify(accessTokenStore.client.publicKey),
    });

    ssoUrl.search = params.toString();
    // 插件 $subscribe 不会在跳转前同步落盘；独立模式按 Token Store 的 pick 直接写入。
    if (!isQiankunRuntime()) {
      localStorage.setItem(
        'g2rain_token',
        JSON.stringify({
          client: accessTokenStore.client,
          token: accessTokenStore.token,
          tokenString: accessTokenStore.tokenString,
          logged: accessTokenStore.logged,
          tokenExpired: accessTokenStore.tokenExpired,
        }),
      );
    }
    window.location.href = ssoUrl.toString();
    return new Promise<void>(() => undefined);
  }

  public async generateToken(code: string): Promise<void> {
    if (this.isAuthenticationPending) {
      return new Promise((resolve) => {
        this.pendingSubscribers.push(() => {
          resolve();
        });
      });
    }

    this.isAuthenticationPending = true;
    // 使用认证专用的 axios 实例（支持 mock）
    const generateTokenInstant = getHttpClient('auth');

    const accessTokenStore = this.getAccessTokenStore();
    const data = { code, grantType: 'authorization_code' };
    const headers: {
      DPoP: string;
      'Application-DPoP': string;
      'Content-Type': string;
    } = {
      DPoP: '',
      'Application-DPoP': '',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const jti = Generator.random();
    const request: AxiosRequestConfig = {
      headers,
      params: '',
      data,
    };
    headers.DPoP = await this.createTokenProof(env.VITE_TOKEN_END_POINT, data, accessTokenStore.client, jti);
    headers['Application-DPoP'] = await this.callSignApi(generateTokenInstant, data, headers.DPoP, jti);

    await generateTokenInstant
      .post<{ token: string; keyId: string }>(env.VITE_TOKEN_END_POINT, data, request)
      .then(async (response) => {
        // auth 客户端 isDirectResponse=true；若网关仍返回 Result 外壳则兼容解析
        const result = response as unknown as Result<{ token: string; keyId: string }>;
        if (result.status !== 200 && result.status !== 0) {
          throw new Error('GENERATE_TOKEN_FAILURE');
        }
        const { token, keyId } = result.data;
        const iamKeyId = await fetchIamKeyId(generateTokenInstant);
        const publicKey = await fetchIamPublicKey(generateTokenInstant);
        await this.getAccessTokenStore().setTokens(token, keyId, iamKeyId, publicKey);
      })
      .catch((error) => {
        this.pendingSubscribers = [];
        throw error;
      })
      .finally(() => {
        this.isAuthenticationPending = false;
      });
  }

  /**
   * 在发业务请求或重试之前调用，保证当前 Pinia 里的 access token 仍然可用；若已过期则发起一次刷新。
   *
   * 并发时大家会撞上同一段刷新逻辑，因此用 `ensureAccessTokenPromise` 做单飞：后来的调用不再新开刷新，
   * 而是附在同一条 Promise 上，等前一次跑完即可——效果上等价于「多人共用一个闸机」。
   *
   * 「屏障」指的是：刷新链路在 `requestRefreshToken` 里是分几步走的异步过程，单靠「函数返回」
   * 并不能可靠地告诉外层的 `await`「整段流程已经收尾」。于是在真正刷新前先向 `pendingRequestManager`
   * 登记一条待完成的 Promise，刷新成功或失败时由同一套代码路径去 resolve / reject 它。
   * 这样 `await barrier` 等到的就是「token 已落库、可以安心继续」或「刷新已失败、应走错误处理」，
   * 而不是某一步中间态；若编排有疏漏，还有超时兜底，避免永远挂死在这条等待上。
   *
   * `force: true`：网关已明确判过期（如业务码 `gateway.40002`、HTTP 401）时使用，
   * 跳过「本地 JWT 仍显示未过期」的早退，避免重试仍带旧 access。
   */
  public async ensureAccessToken(opts?: EnsureAccessTokenOptions): Promise<void> {
    const store = this.getAccessTokenStore();
    if (!opts?.force && store.isAccessTokenValid) {
      return;
    }

    if (!store.isLogin) {
      throw new Error('NO_LOGIN');
    }

    if (this.ensureAccessTokenPromise) {
      return this.ensureAccessTokenPromise;
    }

    const run = (async () => {
      const barrier = refreshBarrier.waitForRefresh();
      if (isQiankunRuntime()) {
        // 必须先同步通知主应用，再 await 屏障；仅依赖 watch 异步触发 emit 会导致死等
        emitTokenInvalid(env.VITE_APPLICATION_CODE);
        if (!store.tokenExpired) {
          store.setTokenExpired(true);
        }
      } else {
        await this.requestRefreshToken();
      }
      await barrier;
    })();

    this.ensureAccessTokenPromise = run.finally(() => {
      this.ensureAccessTokenPromise = null;
    });

    return this.ensureAccessTokenPromise;
  }

  /**
   * 刷新 token（实际 HTTP；与 {@link refreshBarrier} 配对；支持并发合并为同一次刷新）
   */
  public async requestRefreshToken(): Promise<{ token: string; tokenKid: string }> {
    // 如果正在刷新，返回现有的 Promise
    if (this.isRefreshPending && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshPending = true;
    const tokenStore = this.getAccessTokenStore();

    // 创建刷新 Promise
    this.refreshPromise = (async () => {
      try {
        if (!tokenStore.isLogin) {
          throw new Error('NO_LOGIN');
        }

        const refreshInstant = getHttpClient('auth');

        const data = { grantType: 'refresh_token' as const };

        const headers: {
          Authorization: string;
          DPoP: string;
          'Content-Type': string;
        } = {
          Authorization: `Bearer ${tokenStore.tokenString}`,
          DPoP: '',
          'Content-Type': 'application/x-www-form-urlencoded',
        };

        const jti = Generator.random();
        const request: AxiosRequestConfig = {
          headers,
          params: '',
          data,
        };

        headers.DPoP = await this.createTokenProof(env.VITE_TOKEN_END_POINT, data, tokenStore.client, jti);

        const response = await refreshInstant.post<{ token: string; keyId: string }>(
          env.VITE_TOKEN_END_POINT,
          data,
          request,
        );
        const result = response as unknown as Result<{ token: string; keyId: string }>;

        if (result.status !== 200 && result.status !== 0) {
          throw new Error('REFRESH_TOKEN_FAILURE');
        }

        const { token, keyId } = result.data;
        const iamKeyId = await fetchIamKeyId(refreshInstant);
        const publicKey = await fetchIamPublicKey(refreshInstant);

        await tokenStore.setTokens(token, keyId, iamKeyId, publicKey);
        tokenStore.setTokenExpired(false);

        const tokenResult = { token, tokenKid: keyId };
        refreshBarrier.resolveRefresh();
        return tokenResult;
      } catch (error) {
        console.error('刷新 token 失败:', error);
        const refreshError = error instanceof Error ? error : new Error('TOKEN_REFRESH_FAILED');
        refreshBarrier.rejectRefresh(refreshError);
        throw refreshError;
      } finally {
        this.isRefreshPending = false;
        this.refreshPromise = null;
        this.getAccessTokenStore().setTokenExpired(false);
      }
    })();

    return this.refreshPromise;
  }

  public async callSignApi(http: HttpClient<true>, data: any, headerDPoP: string, jti: string): Promise<string> {
    const response = await http.post('/lua/sign_code?jti=' + jti, data, {
      headers: {
        'Content-Type': 'application/json',
        DPoP: headerDPoP,
        // 如果启用了 mock，添加 mock header
        'x-g2rain-mock': isMockEnabled() ? 'true' : 'false',
      },
    });

    const responseData = response as any as { token: string };
    return responseData.token;
  }

  public async listenTokenChanges(): Promise<void> {
    const tokenStore = this.getAccessTokenStore();
    const currentPath = window.location.pathname;

    if (currentPath.endsWith('/sso_callback')) {
      return;
    }
    if (!tokenStore.logged && (!tokenStore.status || tokenStore.status === 'NORMAL')) {
      await this.redirectToSSO();
    }

    watch(
      () => tokenStore.logged,
      async (newLogged) => {
        if (tokenStore.status === 'SSO' || tokenStore.status === 'LOGOUT') {
          return;
        }
        if (!newLogged && tokenStore.status === 'NORMAL') {
          await this.redirectToSSO();
        }
      },
      { immediate: true },
    );
  }
}

export const sso = new SSOService();

