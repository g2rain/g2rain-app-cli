<p align="center">
  <img src="https://github.com/g2rain.png" alt="G2Rain" width="180" />
</p>

# g2rain-shell-template

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-42B883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

g2rain 官方 Vue 3 Main Shell 模板：Header / Sidebar / Tab / Workspace / Footer、Pinia Workspace 模型、`@g2rain/platform/main` + `@g2rain/http` + `@g2rain/theme` / `@g2rain/ui` 基线接入点，以及 qiankun RuntimeAdapter 扩展位。

本仓库是「被生成的主应用模板」源仓，不是 CLI 本身。[g2rain-app-cli](https://github.com/g2rain/g2rain-app-cli) 的 `create-g2rain-app shell` 将复制本仓并替换占位符后产出可运行主应用。权威生产参考壳是 [g2rain-main-shell](https://github.com/g2rain/g2rain-main-shell)；跨仓架构契约见中央 [Main Shell 契约](https://github.com/g2rain/g2rain/blob/main/docs/architecture/profiles/frontend-shell/main-shell-contract.md)，appkit 接线细节见其 [Main Shell 接入](https://github.com/g2rain/g2rain-appkit/blob/main/docs/integration/main.md)。

[官网](https://www.g2rain.com) · [完整文档](docs/index.md) · [中央 Frontend Shell Profile](https://github.com/g2rain/g2rain/tree/architecture-v1.2.0/docs/architecture/profiles/frontend-shell) · [Issues](https://github.com/g2rain/g2rain/issues)

## 核心能力

| 能力 | 当前实现 |
| --- | --- |
| Shell UI | Header、Sidebar、TabBar、Workspace、Footer；默认三个 Shell 本地页 |
| Workspace / Tab | Pinia `workspace.store`：打开 / 激活 / 关闭；概览 Tab 不可关闭 |
| Platform Main | `createMainPlatform` 在 `runtime/boot` 单例装配 |
| HTTP | `@g2rain/http` 工厂挂在 `runtime/http`；Token / SSO 钩子预留 |
| Theme / UI | `@g2rain/theme` + `@g2rain/platform/theme`；`G2rainUi` 插件 |
| 微前端 | qiankun RuntimeAdapter 与实例队列；默认不注册业务 entry |
| 部署 | Vite `base` = Context Path；`nginx/default.conf.example` 示例 |

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `src/shared` | 环境变量、项目名等无状态工具 |
| `src/components` | 不依赖 platform/runtime 的可复用 UI |
| `src/platform` | Workspace / Runtime / Session stores、Main/Theme、qiankun 适配 |
| `src/runtime` | boot、路由、HTTP 装配 |
| `src/shell` | 布局、菜单、Shell 本地页 |
| `src/views` | Shell 自有认证/租户页扩展位（模板基线为空） |
| `nginx` | 静态托管与 Context Path 示例 |

## 占位符

| 占位符 | 用途 | 示例 |
| --- | --- | --- |
| `{{PROJECT_NAME}}` | `package.json` name、`PROJECT_NAME` | `g2rain-admin-shell` |
| `{{CONTEXT_PATH}}` | Context Path（无前导 `/`） | `admin` |
| `{{DEV_SERVER_PORT}}` | Vite 开发端口 | `3000` |

`.env` 使用：

```env
VITE_CONTEXT_PATH=/{{CONTEXT_PATH}}
VITE_SERVER_PORT={{DEV_SERVER_PORT}}
```

模板仓本地验证前先替换为具体值（如 `/admin` 与 `3000`），再执行构建。

## 环境要求

- Node.js `>= 22`
- npm

## 快速开始

```bash
# 1) 将 .env 占位符替换为本地值（示例）
# VITE_CONTEXT_PATH=/admin
# VITE_SERVER_PORT=3000

npm install
npm run dev
npm run build
```

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | `vue-tsc --noEmit` + `vite build` |
| `npm run preview` | 预览构建产物 |

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源。
