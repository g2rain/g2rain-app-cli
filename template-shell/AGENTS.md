# AGENTS.md

在本仓库执行评审或开发前，依次读取：

1. `docs/project.yaml`
2. `docs/architecture/deviations.md`
3. `docs/requirements/` 中唯一处于 `开发中` 的需求（若任务为需求开发）
4. 中央 `frontend-app 1.0.0` 与 `frontend-shell 1.0.0` Profile
5. 与任务有关的本地专题文档和 Git Diff
6. 涉及子应用编排、公开 props、跨应用消息、HTTP/Token 或 `@g2rain/platform/main` 时：中央 [Main Shell 契约](https://github.com/g2rain/g2rain/blob/main/docs/architecture/profiles/frontend-shell/main-shell-contract.md)、appkit [Main Shell 接入](https://github.com/g2rain/g2rain-appkit/blob/main/docs/integration/main.md)，以及本仓 [Platform Main 采纳说明](docs/development/platform-main-adoption.md)

## 项目角色

本仓库是 **Main Shell 官方模板**（`family: frontend-shell-template`），由 `create-g2rain-app shell` 复制并替换 `{{PROJECT_NAME}}`、`{{CONTEXT_PATH}}`、`{{DEV_SERVER_PORT}}` 等占位符后生成可运行主应用。权威参考实现仍是 `g2rain-main-shell`；跨仓不变式以中央 Main Shell 契约与 `frontend-shell` Profile 为准。

## 强制边界（frontend-shell）

- 本模板生成的是微前端主应用，负责全局布局、路由、菜单、Tab、子应用注册/生命周期和认证会话协调，不拥有子应用业务规则。
- `applicationCode`、`viewId`、`instanceId` 与迁移期 `appKey`（目标等于 `instanceId`）以及 `name`、`entry`、**子应用** `contextPath`、`activeRule` 是跨应用契约；公开 props 的 `contextPath` 不得使用 Shell 自身 `VITE_CONTEXT_PATH`；修改时必须同步文档并验证真实子应用。
- 不得将 Token、Token Kid、私钥、Secret 写入日志、URL、Mock、Header 展示或 `@g2rain/platform/main` 的公开 props；不得把生产 Secret/私钥放入前端配置、Bundle 或仓库。
- Platform Main 只做公开 props 与定向消息协调；`loadMicroApp`、RuntimeStore、qiankun handle 与操作队列仍由壳拥有。
- HTTP 基线使用 `@g2rain/http`；Token Store、SSO 与刷新编排留在 `runtime`，不得下沉公共包。
- Theme/UI：组合根导入 `@g2rain/theme/styles.css`、`@g2rain/ui/style.css`，用 `createThemeController`（`@g2rain/platform/theme`）写根节点 `data-g2-theme`（仅 `light`/`dark`），安装 `G2rainUi`；组件样式只用 `--g2-*`；theme 不得进入公开 props / URL / 日志。
- Tab/Workspace：主/子应用都经统一 Tab 打开；切 Tab 只标 inactive 不 unmount；关当前 Tab 优先右侧否则左侧，最后回退固定概览；关子应用顺序为 qiankun unmount → 删 handle → `releaseInstance` → 删 RuntimeInstance → 删 Tab。
- 新增代码遵守 `shared → components → platform → runtime → views/shell` 的目标方向；已登记反向依赖不能作为新代码范例。
- 模板默认菜单只暴露 Shell 本地页面，不注册业务微应用 entry。
- 不覆盖用户已有改动；脚手架占位符替换规则变更须同步 CLI 与本文档。

## 验证

至少执行 `npm run build`（模板仓验证前先将 `.env` 中 Context Path / 端口占位符替换为具体值，例如 `/admin` / `3000`）。协议、路由、认证或部署变更还要完成浏览器联调；无法执行的验证必须明确报告。新建或补齐文档时遵守中央 `frontend-shell` 必填树与生成契约第 3 节，不得只交源码。

需求选择只认 `docs/project.yaml` 的 `aiCoding.activeRequirement` 或唯一 `开发中` 文档；没有或不唯一时停止开发。
