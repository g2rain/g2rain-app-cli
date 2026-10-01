# 配置

## 构建期 Vite 变量

| 变量 | 用途 | 当前默认/示例 |
| --- | --- | --- |
| `VITE_APPLICATION_CODE` | 资源加载和 qiankun 应用编码 | `{{PROJECT_NAME}}` |
| `VITE_CONTEXT_PATH` | Vite base、前端请求和回调基础路径 | `/{{CONTEXT_PATH}}` |
| `VITE_BACKEND_ORIGIN` | 本地开发代理目标 | `http://localhost:8080` |
| `VITE_TOKEN_END_POINT` | Token 端点 | `/auth/token` |
| `VITE_AUTH_END_POINT` | 授权端点 | `/auth/authorize` |
| `VITE_SSO_BASE_URL` | SSO 地址；生产可由运行时覆盖 | 本地 `http://localhost:8080` |
| `VITE_REDIRECT_URI` | SSO 回调相对路径 | `/sso_callback` |
| `VITE_MOCK_ENABLED` | Mock 开关 | `false` |
| `VITE_RUN_MODE` | `alone` 为独立运行，空为集成意图 | 空 |
| `VITE_MAIN_SHELL_REDIRECT_PREFIX` | 集成直链跳转前缀 | `/main/redirect` |
| `VITE_MAIN_SHELL_ORIGIN` | 跨端口开发的 main-shell Origin | `http://localhost:3000` |
| `VITE_I18N_TAGS` | 国际化文案 Tag，逗号分隔 | `G2RAIN_SHARED` |

`VITE_SERVER_PORT` 在 shared env 中存在，但 Vite server 配置实际读取 `process.env.VITE_SERVER_PORT` 并回退到 `3001`。开发时显式设置，直到代码统一。

## 容器运行变量

| 变量 | 用途 | 入口默认值 |
| --- | --- | --- |
| `SERVER_PORT` | OpenResty 监听端口 | `80` |
| `CONTEXT_PATH` | Nginx location/rewrite 前缀 | `/` |
| `SSO_BASE_URL` | 启动时替换 `env-config.js` | 空 |
| `GATEWAY_HOST` / `GATEWAY_PORT` | `/api`、`/doc` 代理目标 | 必须按环境提供 |
| `IAM_HOST` / `IAM_PORT` | `/auth` 代理目标 | 必须按环境提供 |

Dockerfile 声明 `EXPOSE 8080`，建议部署显式设置 `SERVER_PORT=8080`。`EXPOSE` 不会自动改变 Nginx 监听端口。

## 配置配对

- `VITE_CONTEXT_PATH` 与 `CONTEXT_PATH` 必须表达同一部署路径，统一是否带尾斜杠。
- `VITE_APPLICATION_CODE` 与 Basis 中应用资源编码一致。
- Redirect URI 必须同时在前端、IAM 客户端和入口域名中正确注册。
- main-shell 的 activeRule/entry 与子应用 Context Path 对齐。
- `VITE_I18N_TAGS` 公共 Tag 在前，应用 Tag 在后。

## 运行时注入

Vite 构建插件生成 `dist/env-config.js`，容器入口只替换 `__SSO_BASE_URL__`。shared env 每次读取时优先使用 `window._env_`，再回退 `import.meta.env`。

新增运行时变量时必须同时修改：

1. `vite-plugin-env-config.ts` 的占位输出。
2. `nginx/docker-entrypoint.sh` 的替换逻辑。
3. `src/shared/env.ts` 的类型和读取规则。
4. `.env` / `.env.production` 示例和本文档。

不要把 Secret 放进任何 `VITE_*` 变量；前端构建产物和 `window._env_` 对浏览器用户可见。
