/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTEXT_PATH: string
  readonly VITE_SERVER_PORT: string
  readonly VITE_BACKEND_ORIGIN: string
  readonly VITE_APPLICATION_CODE: string
  readonly VITE_SSO_BASE_URL: string
  readonly VITE_AUTH_END_POINT: string
  readonly VITE_TOKEN_END_POINT: string
  readonly VITE_REDIRECT_URI: string
  readonly VITE_DINGTALK_BIND_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
