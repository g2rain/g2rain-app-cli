# Platform Main 采纳说明

本文件记录模板对 `@g2rain/platform/main` 与 `@g2rain/http` 的采纳状态。跨仓不变式以 appkit [Main Shell 生成契约](https://github.com/g2rain/g2rain-appkit/blob/main/docs/packages/main-shell-contract.md) 为准。

## 当前状态

| 项 | 状态 |
| --- | --- |
| 依赖 `@g2rain/platform` | 已通过 npm `@g2rain/platform@1.0.0` 接入；组合根调用 `createMainPlatform` |
| 依赖 `@g2rain/http` | 已通过 npm `@g2rain/http@1.0.0` 接入；`runtime/http` 装配工厂（`withAuth: true` + 独立 auth client） |
| `createMainPlatform` / `runtimePort` | 已在 `runtime/boot.ts` 接线；`emit` 经 `emitDirectedMessage` 投递 window CustomEvent |
| 公开 props | `mountInstance` 使用定义上的**子应用** `contextPath`（非 Shell `VITE_CONTEXT_PATH`）；**禁止**下发 Token |
| Token Store / SSO | 已实现于 `platform/stores/token.store.ts`、`runtime/auth/sso.ts`；回调 `/sso_callback`、登出 `/logout` |
| Application-DPoP | OpenResty `lua/` + 同域 `/lua/sign_code`；`Dockerfile` / `docker-compose.sign.yml` |
| Auth Bridge | `REQUEST_TOKEN` → `getSharedAuth` → `TOKEN_RESPONSE`（含 client 浅拷贝）；`TOKEN_INVALID` → `refreshToken` → `TOKEN_RESPONSE`；失败 `TOKEN_ERROR`；见 TPL-009 |
| 菜单 / 子应用 | 已接 `GET /basis/authority/menus` → `menu.store` → `registerDefinition` → `openMicroAppView` → Workspace `mountInstance` |
| 联合验收 | 配置 DEV entry 后与已接 `/sub` 的子应用（推荐 member-app）联调挂载；深链 / Gateway / F5 见 TPL-001 |

## 改造锚点

| 职责 | 位置 |
| --- | --- |
| 组合根 | `src/runtime/boot.ts` |
| Main 协调器 | `src/platform/main-platform.ts` |
| HTTP 装配 | `src/runtime/http/index.ts` |
| Token Store | `src/platform/stores/token.store.ts` |
| SSO | `src/runtime/auth/sso.ts` |
| Session 回填 | `src/platform/stores/session.store.ts` → `/basis/authority/user` |
| 菜单 API / boot | `src/runtime/api/menu.api.ts`、`src/runtime/boot/menu.boot.ts` |
| 菜单 Store | `src/platform/stores/menu.store.ts` |
| 实例队列 / qiankun | `src/platform/apps/*`、`runtime.store.ts` |
| 定向消息投递 | `src/components/micro-app/emit-directed-message.ts` |
| TOKEN_INVALID | `src/components/micro-app/token-invalid-handler.ts` |
| REQUEST_TOKEN | `src/components/micro-app/request-token-handler.ts`、`src/runtime/auth/shared-auth.ts` |
| Workspace | `src/platform/stores/workspace.store.ts`、`src/shell/layout/*` |

## 安全约束

- Token / Kid / 私钥不得进入公开 props、URL、Header 展示或持久日志。
- Token 落盘键 `g2rain-shell-token:${applicationCode}` 有 XSS 风险（见偏差 TPL-007），兼作同 origin 多独立 Shell 隔离；不得 `console.log` 消息整包 detail。
- Auth Bridge 可经定向消息下发 client 浅拷贝（见 TPL-009）；Shell 不自监听本窗 `TOKEN_RESPONSE`。

## 联调对象

优先已接 `@g2rain/platform/sub` 与 `@g2rain/http` 的 `g2rain-member-app`。生产行为对照 `g2rain-main-shell`。

## 与偏差表

临时兼容（例如仍向旧子应用下发 Token）必须写入 `docs/architecture/deviations.md`，不得写成模板默认范例。
