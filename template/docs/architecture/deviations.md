# 已知架构偏差

本项目采用 g2rain `frontend-app 1.0.0-draft`。本页记录当前源码相对中央 Profile 的已知偏差；状态为“待迁移”不表示普通需求自动获得修改授权，新增代码不得扩大这些依赖。

## DEV-001：components 反向依赖 platform/runtime/views（已消除）

### 状态

已于 2026-09-18 完成 HTTP/UI 迁移并关闭。

### 证据

- `src/components/http` 已删除；HTTP 请求、DPoP、序列化、错误与刷新内核由 `@g2rain/http` 提供。
- Client 注册表、Mock、Loading 组合、IAM 拉钥与 `refreshBarrier` 属于应用装配，已迁至 `src/runtime/http`。
- 原 `components/RemoteSelect` 等本地 UI 及 `@/components` 转发层已删除；页面直接依赖 `@g2rain/ui`，organ/dict 由 `runtime/ui/setup-g2rain-ui.ts` 注入。

### 风险与方向

该反向依赖已经消除。后续不得在 `components` 中重新建立 HTTP、Store、runtime 或 views 依赖；应用 HTTP 装配继续保留在 runtime，公共能力通过 `@g2rain/http` 演进。

## DEV-002：platform 反向依赖 runtime

### 状态

待迁移。

### 证据

- `platform/i18n`、`platform/stores/locale.store.ts` 仍调用 runtime 的远程文案和语言列表 API。
- `platform/apps/message-handlers.ts` 与 `platform/apps/init.ts` 仍调用 runtime HTTP，把 `TOKEN_RESPONSE`（Auth Bridge）写入共享 Token Store。

qiankun 适配器不再直接调用 runtime boot、router 或实例 Map。`src/platform/apps/adapter.qiankun.ts` 只注册 `renderWithQiankun`，并把 `mount` / `update` / `unmount` 交给 `src/main.ts`。Vue、Router 和 `afterEach` 由 `@g2rain/platform/sub` 按 `instanceId` 持有。

### 风险与方向

语言远程加载和 Token 写入仍绑在 platform 实现上。i18n/locale 的远程接口应由 runtime 注册 provider；消息处理器可以继续留在应用，但不要再从 platform 直接依赖某个应用的 HTTP 装配细节。

## DEV-003：runtime 直接引用 views

### 状态

接受为当前组合方案，目标是依赖反转。

### 证据

- `runtime/boot/router.ts` 引用 `views/route-map.ts`。
- `runtime/router` 的系统路由直接导入 Home 和 SSO Callback 页面。

### 风险与方向

runtime 无法作为独立应用运行时复用。建议由 views 导出页面注册表，在 `main.ts` 创建 runtime 时传入；系统页面可以定义清晰的 application-shell 边界。

## DEV-004：TypeScript any 技术债

### 状态

渐进治理。

### 说明

`tsconfig` 已启用 `strict`，但 HTTP 泛型、qiankun/window 扩展、错误详情、Mock 和部分 UI 适配仍存在显式 `any`。旧规范中的“禁止任何 any”与当前实现不一致。

新代码默认使用 `unknown`、泛型、类型守卫和模块扩展；确需 `any` 时限定在第三方边界并说明原因。迁移不应为了消除文本而引入错误断言。

## DEV-005：开发端口与容器端口声明不一致

### 状态

待统一。

### 说明

- `.env` 和 shared env 默认值写 `3000`，Vite server 实际从 `process.env.VITE_SERVER_PORT` 读取并回退到 `3001`。
- Dockerfile `EXPOSE 8080`，容器入口的 `SERVER_PORT` 默认值为 `80`。

在代码统一前，开发命令显式设置 `VITE_SERVER_PORT`，部署显式设置 `SERVER_PORT=8080`。文档按当前执行代码说明，不把声明值混为同一个端口。

## DEV-006：资源配置 API 端点生成未启用

### 状态

功能未完成。

### 说明

`create-g2rain-app` 的 `build-config` 仍不产出 `api-endpoints.json`（解析逻辑可在 CLI 内但主流程关闭）。`resources.json.apiEndpoints` 为空。启用前需要测试解析准确性、去重、服务/路由前缀语义和后端导入契约。

## DEV-007：生产构建存在循环分块与体积警告

### 状态

构建通过，待专项优化。

### 当前警告

- `runtime/auth` 的 `sso` 重导出与 SSO Callback 形成 Rollup 循环分块风险，构建器提示可能破坏执行顺序。
- platform/apps、runtime/boot、runtime/router 和 main 的静态导入仍然交织。`micro-shells` 已删除，2026-09-19 的生产构建没有再打印原先指向 micro-shells 的循环分块警告。
- 主 JavaScript Chunk 当前约 `1.6 MB`（未压缩），超过 Vite 默认警告阈值。
- MockJS 的 `eval` 被生产构建扫描，说明 Mock 相关代码仍进入依赖图。
- `env-config.js` 作为在主模块前执行的经典脚本，会产生 Vite “无法打包”提示；这是当前运行时注入设计，但仍需验证 CSP、缓存和加载顺序。

### 演进方向

优先解除跨层循环依赖和 `sso` 重导出循环，再设计稳定的 manualChunks；让 Mock 注册仅在开发/显式 Mock 条件下进入构建图；为 `env-config.js` 明确缓存与 CSP 策略。不能只提高 chunk 警告阈值隐藏问题。
