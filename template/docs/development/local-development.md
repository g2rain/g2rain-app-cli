# 本地开发

## 准备环境

- Node.js `>=22`
- npm
- 可访问的 main-shell、IAM、Gateway/Basis（联调时）

使用锁文件安装：

```bash
npm ci
```

不要在没有依赖升级需求时用 `npm install` 重写锁文件。模板包名仍是 `{{PROJECT_NAME}}` 属于正常占位符。

`create-g2rain-app` 以 `file:../g2rain-app-cli` 声明。本地 `npm install` / `npm run build:generate` / `npm run build:config` 需要同级检出 [`g2rain-app-cli`](https://github.com/g2rain/g2rain-app-cli)（目录布局为 `.../g2rain-app-cli` 与 `.../g2rain-app-template` 或生成后的业务 App 并列）。Docker 构建使用最小 stub，不依赖真实 CLI。

## 独立运行

PowerShell：

```powershell
$env:VITE_RUN_MODE = 'alone'
$env:VITE_SERVER_PORT = '3001'
$env:VITE_BACKEND_ORIGIN = 'http://localhost:8080'
npm run dev
```

Bash：

```bash
VITE_RUN_MODE=alone VITE_SERVER_PORT=3001 VITE_BACKEND_ORIGIN=http://localhost:8080 npm run dev
```

也可以通过 URL 查询参数 `?mode=alone` 覆盖运行模式。独立模式会自行处理 SSO、Token 和资源加载。

## 集成运行

默认空模式是集成意图。子应用应由 main-shell 通过 qiankun 加载；直接访问子应用地址会跳转到 main-shell 的 `/main/redirect` 网关路径。

跨端口开发时设置：

```powershell
$env:VITE_MAIN_SHELL_ORIGIN = 'http://localhost:3000'
$env:VITE_MAIN_SHELL_REDIRECT_PREFIX = '/main/redirect'
npm run dev
```

qiankun mount 至少需要 `container`、`applicationCode`、`viewId`、`instanceId`，且 `appKey === instanceId`。认证经 Auth Bridge 定向消息完成，不经公开 props；公开 Context 不含 Token。

## 构建与预览

```bash
npm run build
npm run preview
```

`npm run build` 是当前唯一仓库级验证命令，包含 `vue-tsc` 和 Vite 构建。仓库目前没有独立 unit/e2e/lint 脚本，不能把“build 通过”描述为完整测试覆盖。

## 开发检查

- 访问后立即跳 main-shell：确认是否忘记设置 `mode=alone`，这是默认行为而非死循环。
- 端口不是 `.env` 中的 `3000`：Vite 配置读取 `process.env.VITE_SERVER_PORT`，未设置时实际回退 `3001`。
- 页面不出现：检查后端页面资源的 `linkPath` 和 `views/route-map.ts` 是否一致。
- 权限不生效：检查资源接口、静态 `v-permission` 和生成后的资源 JSON。
- SSO 回调失败：检查 Context Path、Redirect URI、IAM 地址和 main-shell 路由是否成对配置。

更多问题见[故障排查](../operations/troubleshooting.md)。
