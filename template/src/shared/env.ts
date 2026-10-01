/**
 * 全局环境变量访问工具（shared 层）
 * - 封装对 window._env_ 和 import.meta.env 的访问
 * - 提供 env / getPathWithContextPath / isMockEnabled 等能力
 */

export function getEnvVar(key: string, defaultValue = ''): string {
  if (typeof window !== 'undefined' && (window as any)._env_) {
    const runtimeValue = (window as any)._env_[key];
    if (runtimeValue !== undefined && runtimeValue !== null && runtimeValue !== '') {
      if (
        typeof runtimeValue === 'string' &&
        !runtimeValue.startsWith('__') &&
        !runtimeValue.endsWith('__')
      ) {
        return runtimeValue;
      }
    }
  }

  if (import.meta.env && (import.meta.env as any)[key]) {
    const buildTimeValue = (import.meta.env as any)[key] as string;
    if (!buildTimeValue.startsWith('__') || !buildTimeValue.endsWith('__')) {
      return buildTimeValue;
    }
  }

  return defaultValue;
}

export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = getEnvVar(key, '');
  if (value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

export type SharedEnv = {
  VITE_APPLICATION_CODE: string;
  VITE_CONTEXT_PATH: string;
  VITE_TOKEN_END_POINT: string;
  VITE_IAM_BACKEND_ORIGIN: string;
  VITE_SSO_BASE_URL: string;
  VITE_AUTH_END_POINT: string;
  VITE_REDIRECT_URI: string;
  VITE_MOCK_ENABLED: boolean;
  VITE_USE_MOCK: string;
  VITE_BACKEND_ORIGIN: string;
  VITE_SERVER_PORT: string;
  /** 空=集成意图；alone=独立运行 */
  VITE_RUN_MODE: string;
  /** main-shell 子应用网关前缀，默认 /main/redirect */
  VITE_MAIN_SHELL_REDIRECT_PREFIX: string;
  /** 开发跨端口时 main-shell 的 origin，如 http://localhost:5173 */
  VITE_MAIN_SHELL_ORIGIN: string;
  /** 国际化文案包 tags（逗号分隔，与 i18n_message.tag 一致） */
  VITE_I18N_TAGS: string;
};

/**
 * env 使用“懒读取/动态读取”：
 * - 避免 env-config.js 通过动态 script 加载时序导致初始化时取不到值
 * - 每次访问 env.xxx 时，都从 window._env_ / import.meta.env 实时读取
 */
export const env: SharedEnv = new Proxy({} as SharedEnv, {
  get(_target, prop: string | symbol) {
    if (prop === 'VITE_APPLICATION_CODE') return getEnvVar('VITE_APPLICATION_CODE', 'g2rain-app');
    if (prop === 'VITE_CONTEXT_PATH') return getEnvVar('VITE_CONTEXT_PATH', '/');
    if (prop === 'VITE_TOKEN_END_POINT') return getEnvVar('VITE_TOKEN_END_POINT', '/auth/token');
    if (prop === 'VITE_IAM_BACKEND_ORIGIN') return getEnvVar('VITE_IAM_BACKEND_ORIGIN', '');
    if (prop === 'VITE_SSO_BASE_URL') return getEnvVar('VITE_SSO_BASE_URL', '');
    if (prop === 'VITE_AUTH_END_POINT') return getEnvVar('VITE_AUTH_END_POINT', '/auth/authorize');
    if (prop === 'VITE_REDIRECT_URI') return getEnvVar('VITE_REDIRECT_URI', '');
    if (prop === 'VITE_MOCK_ENABLED') return getEnvBoolean('VITE_MOCK_ENABLED', getEnvBoolean('VITE_USE_MOCK', false));
    if (prop === 'VITE_USE_MOCK') return getEnvVar('VITE_USE_MOCK', 'false');
    if (prop === 'VITE_BACKEND_ORIGIN') return getEnvVar('VITE_BACKEND_ORIGIN', 'http://localhost:8080');
    if (prop === 'VITE_SERVER_PORT') return getEnvVar('VITE_SERVER_PORT', '3000');
    if (prop === 'VITE_RUN_MODE') return getEnvVar('VITE_RUN_MODE', '');
    if (prop === 'VITE_MAIN_SHELL_REDIRECT_PREFIX')
      return getEnvVar('VITE_MAIN_SHELL_REDIRECT_PREFIX', '/main/redirect');
    if (prop === 'VITE_MAIN_SHELL_ORIGIN') return getEnvVar('VITE_MAIN_SHELL_ORIGIN', '');
    if (prop === 'VITE_I18N_TAGS') return getEnvVar('VITE_I18N_TAGS', 'G2RAIN_SHARED');

    if (prop === Symbol.toStringTag) return 'SharedEnv';
    return undefined;
  },
}) as SharedEnv;

export function getPathWithContextPath(subPath: string): string {
  const contextPath = getEnvVar('VITE_CONTEXT_PATH', '/');
  const base = `/${contextPath}/`.replace(/\/+/g, '/');

  if (!subPath) {
    return base;
  }

  // 若 subPath 以 / 开头, 直接拼接 subPath(此时 base 去掉尾斜杠)
  // 否则直接字符串相加, 完全避免了 subPath.slice(1) 产生的新字符串内存分配
  return (subPath.startsWith('/') ? base.slice(0, -1) : base) + subPath;
}

export function isMockEnabled(): boolean {
  return env.VITE_MOCK_ENABLED || env.VITE_USE_MOCK === 'true';
}

