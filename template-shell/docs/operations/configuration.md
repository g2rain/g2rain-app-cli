# 配置

## 环境变量

| 变量 | 说明 | 开发 `.env` | 生产 `.env.production` |
| --- | --- | --- | --- |
| `VITE_BUILD_MODE` | 构建 mode（与 Dockerfile `VITE_BUILD_MODE` 对应） | 可不写（`vite dev`） | `production` |
| `VITE_CONTEXT_PATH` | 浏览器与 Vite `base` 前缀 | `/{{CONTEXT_PATH}}`（推荐默认 `admin` → `/admin`） | 同左（脚手架写入具体值） |
| `VITE_SERVER_PORT` | 开发服务器端口 | `{{DEV_SERVER_PORT}}`（推荐 `3000`） | **不写**（生产无 Vite server） |
| `VITE_BACKEND_ORIGIN` | 开发期 Vite 代理上游（`/api`、`/auth`、`/lua`、`/keys`） | 必填（示例 `http://localhost:8080`） | **不写**（同域，与 main-shell 一致） |
| `VITE_APPLICATION_CODE` | DPoP `acd` / 应用标识 | `{{PROJECT_NAME}}` | 同左 |
| `VITE_SSO_BASE_URL` | IAM / SSO 源（无尾斜杠） | 联调地址 | `${SSO_BASE_URL}` 占位；**运行时**由 `env-config.js` + 容器 `SSO_BASE_URL` 注入（main-shell 同款） |
| `VITE_AUTH_END_POINT` | 授权端点 | `/auth/authorize` | 同左 |
| `VITE_TOKEN_END_POINT` | 换票 / 刷新端点 | `/auth/token` | 同左 |
| `VITE_REDIRECT_URI` | SSO 回调 path（相对 Context Path） | `/sso_callback` | 同左 |

`.env` 用于本地开发；`.env.production` 与 main-shell 对齐（无 `VITE_SERVER_PORT` / `VITE_BACKEND_ORIGIN`）。模板仓保留 CLI 可替换占位符；本地验证前先写成具体值再 `npm run build`。

**生产 SSO：** 构建生成 `dist/env-config.js`（`__SSO_BASE_URL__`）；`docker-entrypoint.sh` 用环境变量 `SSO_BASE_URL` 替换；`getSsoBaseUrl()` 优先读 `window._env_`。deploy 需设置 `SSO_BASE_URL`（如 `${PLATFORM_BASE_URL}`）。

## 源码占位符

| 占位符 | 位置 |
| --- | --- |
| `{{PROJECT_NAME}}` | `package.json#name`、`src/shared/project.ts`、`docs/project.yaml`、`.env*` 的 `VITE_APPLICATION_CODE`、`index.html` title |
| `{{CONTEXT_PATH}}` | `.env*`、`docs/project.yaml`、`nginx/default.conf.example` |
| `{{DEV_SERVER_PORT}}` | `.env`、`docs/project.yaml` |

## 运行时事实

- Shell Context Path 读取：`src/shared/env.ts` → `getContextPath()`（仅主应用路由 / Vite base；优先 `window._env_`）
- 子应用公开 props 的 `contextPath`：来自可信目录 `MicroAppDefinition.contextPath`，见 `runtime.store.ts`
- Router history base：`${shellContextPath}/`
- Vite `server.port`：`VITE_SERVER_PORT`
- Token 持久化键：`g2rain-shell-token:${VITE_APPLICATION_CODE}`（按壳隔离，兼容同 origin 多独立 Shell；仅壳侧；不得写入公开 props / URL / 日志）
- 浏览器 HTTP：同域 `{contextPath}/api`、`{contextPath}/auth`、`{contextPath}/lua/sign_code`（main-shell 同款）；开发期由 Vite 代理到 `VITE_BACKEND_ORIGIN`
- 生产 SSO：`env-config.js` + 容器 `SSO_BASE_URL`（见上）

不得把生产 Token、私钥或真实 Secret 写入任何环境文件并提交。
私钥仅运行时挂载到 OpenResty `lua/keys/`，不得提交 Git 或烘焙进镜像层。
