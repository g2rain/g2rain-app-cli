# 架构概览

`{{PROJECT_NAME}}`（模板源仓名 `g2rain-shell-template`）是 G2rain 浏览器统一入口的脚手架基线。它启动 Vue 主应用，初始化主题、状态、路由与会话扩展点，再用 Header / Sidebar / TabBar / Workspace / Footer 承载 Shell 本地页，并为可信微应用目录预留 qiankun RuntimeAdapter。

## 核心责任

- Shell UI：Header、Sidebar、TabBar、Workspace、Footer。
- 平台状态：Workspace Tab、RuntimeInstance、Session 摘要、主题。
- 生命周期扩展点：注册、挂载、更新、卸载、销毁及 per-`instanceId` 操作队列。
- 协议扩展点：公开 props、定向消息、Token / Locale 协调（经 `@g2rain/platform/main`）。
- 边缘运行：Vite Context Path、Nginx 示例配置。

## 非职责

- 不实现 Manager / Member 等子应用业务规则。
- 不替代 IAM Token 签发与 Gateway / 领域服务最终鉴权。
- 模板默认不注册任何业务微应用 `entry`；业务入口必须来自可信目录。

生成后的主应用可参考 `g2rain-main-shell` 补齐 SSO、菜单服务与生产 Nginx/Lua。
