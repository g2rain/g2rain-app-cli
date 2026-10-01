# 安全边界

## Shell 负责

- 浏览器侧会话协调与 Token Store（`platform/stores/token.store.ts`；不得写入公开 props）。
- SSO 编排（`runtime/auth/sso.ts`）与 `@g2rain/http` 鉴权注入；签名走同域 `{contextPath}/lua/sign_code`（OpenResty，main-shell 同款）。
- OpenResty Application-DPoP（`lua/` + `nginx/default.conf.template`）；私钥仅运行时挂载。
- 可信应用目录与 `entry` 白名单；禁止把 URL query 当作微应用 entry。
- Auth Bridge：`REQUEST_TOKEN` / `TOKEN_INVALID` 校验 RuntimeInstance 后定向下发共享 `token` / `tokenKid` / client 浅拷贝。
- 公开运行时配置（Context Path、后端 origin）与静态 / OpenResty 托管。
- 日志中避免输出 Token、Cookie、DPoP、API Key、密码与 Secret；不得 `console.log` 消息整包 detail。

## Shell 不负责

- IAM 的身份签发、会话存储与后端授权决策。
- Gateway 与领域服务的最终 API / 数据级鉴权。
- 子应用内部业务校验与租户规则。

## 硬性禁止

1. Token、Token Kid、私钥、生产 Secret 进入源码、Mock、模板默认值、Git 或镜像层。
2. 将 Token / client 放入 `@g2rain/platform/main` 公开 props 或路由 query。
3. 在文档或测试中新增真实凭据。
4. 信任浏览器任意来源的 `postMessage`；定向消息须校验 instance / requestId（见 Auth Bridge Handler）。
5. 把 `/lua/sign_code` 误配到 Gateway；签名必须由 OpenResty（或等价）提供。

## 模板基线

- 已登录时 Header 展示 `/basis/authority/user` 非敏感摘要；未登录跳转 SSO。
- Token 可持久化于 `localStorage`（`g2rain-shell-token:${applicationCode}`），按 applicationCode 命名空间，避免同 origin 多独立 Shell 互相覆盖；见偏差 TPL-007。
- Application-DPoP 密钥目录 `lua/keys/` 已 gitignore；用 `scripts/generate-sign-keys.*` 本地生成。
- `REQUEST_TOKEN` 与 `TOKEN_INVALID` 已接；同页消息可含 client 浅拷贝，见偏差 TPL-009。
