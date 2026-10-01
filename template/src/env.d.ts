interface ImportMetaEnv {
    readonly DEV: boolean; // 是否为开发模式
    readonly VITE_APPLICATION_CODE: string; // 应用编码（用于从资源接口加载路由）
    readonly VITE_CONTEXT_PATH: string; // 上下文路径（替代 VITE_BASE_URL 和 VITE_APPLICATION_CONTEXT）
    readonly VITE_BACKEND_ORIGIN: string;
    readonly VITE_TOKEN_END_POINT: string; // token路径（用于刷新和创建token）
    readonly VITE_IAM_BACKEND_ORIGIN: string; // IAM后端地址
    readonly VITE_SSO_BASE_URL: string; // SSO跳转基础地址（不包含路径）
    readonly VITE_AUTH_END_POINT: string;
    readonly VITE_REDIRECT_URI: string;
    readonly VITE_MOCK_ENABLED?: string; // 是否启用 mock（'true' 或 'false'）
    readonly VITE_SERVER_PORT?: string; // 开发服务器端口号
    readonly VITE_I18N_TAGS?: string; // 国际化文案包 tags（逗号分隔）
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

