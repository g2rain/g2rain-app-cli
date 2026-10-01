# 使用手册

- 日期：2026-09-27
- 命令：`create-g2rain-app`、`g2rain-app`（两者相同）
- 项目族：
  - `frontend-app`：包内 `template/`（源仓 `g2rain-app-template`）
  - `frontend-shell`：包内 `template-shell/`（源仓 `g2rain-shell-template`）
- 未指定 family 时默认生成 `frontend-app`，并打印明确提示

`create-g2rain-app` 还没有 Registry 版本，下面的安装是当前本地用法。发到 Registry 之后的安装命令待补充。

Node.js 需要 `>=22`。

## 1. 装上命令

在 `g2rain-app-cli` 目录：

```bash
npm ci
npm run build
npm link
```

之后在任意目录可以使用 `create-g2rain-app` 和 `g2rain-app`。

已有业务 App 不需要全局 link，把 CLI 装成开发依赖即可：

```json
{
  "devDependencies": {
    "create-g2rain-app": "file:../g2rain-app-cli"
  }
}
```

然后在该 App 根目录用 `npx g2rain-app`。

模板快照维护（正式路径：GitHub Actions `sync-templates`）：

```powershell
$env:G2RAIN_ALLOW_LOCAL_SYNC = '1'
$env:G2RAIN_APP_TEMPLATE_REF = 'vX.Y.Z'
$env:G2RAIN_SHELL_TEMPLATE_REF = 'vA.B.C'
npm run sync:templates
npm run verify:template-snapshots
```

创建时不要再手动克隆模板仓；本地调试可用 `G2RAIN_TEMPLATE_PATH` / `G2RAIN_SHELL_TEMPLATE_PATH`。详见 [template-snapshots.md](../template-snapshots.md)。

## 2. 创建项目

先进入要放置项目的父目录。目标目录已存在会失败，不会覆盖。

### 2.1 业务子应用（frontend-app）

```bash
create-g2rain-app app g2rain-order-app --context-path order
```

兼容旧写法（默认 frontend-app，会提示）：

```bash
g2rain-app create g2rain-order-app --context-path order
g2rain-app g2rain-order-app --context-path order
create-g2rain-app --family frontend-app --name g2rain-order-app --context-path order
```

### 2.2 Main Shell（frontend-shell）

```bash
create-g2rain-app shell g2rain-admin-shell --context-path admin --port 3000
create-g2rain-app --family frontend-shell --name g2rain-admin-shell --context-path admin --port 3000
```

Shell 默认 Context Path 为 `admin`，端口 `3000`。生成后直接执行 `npm install`；AppKit 依赖使用模板声明的已发布 `@g2rain/*` 版本。

不带参数时会提问。项目名默认 `g2rain-new-app`。Context Path 不要带前导斜杠；省略时由项目名去掉 `g2rain-` 前缀和 `-app` 后缀得到，例如 `g2rain-order-app` 得到 `order`。

CLI 不执行 `npm install`，也不初始化 Git。生成后：

```bash
cd g2rain-order-app
npm install
```

模板不复制 lockfile，第一次不要用 `npm ci`。

当前模板依赖仍指向 `file:../g2rain-appkit/`，并且包含已经不存在的 `@g2rain/runtime`。安装前改成业务 App 自己的 `@g2rain/theme`、`@g2rain/ui`、`@g2rain/http`、`@g2rain/platform` 制品，再执行 `npm install`。制品安装见 [业务 App 接入](https://github.com/g2rain/g2rain-appkit/blob/main/docs/integration/app.md)。

## 3. 生成页面

在 App 根目录执行。SQL 默认读 `scripts/database.sql`，表必须已经写在这个文件里。

```bash
g2rain-app generate --tables=dict
g2rain-app generate --tables=dict,medicine_users
g2rain-app generate --tables=dict --no-mock --no-route
```

`--tables` 也可以写成 `--tables dict,medicine_users`。没有该参数时读取环境变量 `G2RAIN_TABLES`。

每个表默认写出：

```text
src/views/<表名>/
├── index.vue
├── api.ts
├── type.ts
└── mock.ts
```

并更新 `src/views/route-map.ts`。同名文件会被覆盖。执行前先看 Git 状态，执行后检查 diff。

| 开关 | 不生成 |
| --- | --- |
| `--no-view` 或 `--skip-view` | `index.vue` |
| `--no-api` 或 `--skip-api` | `api.ts`、`type.ts` |
| `--no-mock` 或 `--skip-mock` | `mock.ts` |
| `--no-route` 或 `--skip-route` | `route-map.ts` 更新 |

可选路径：`--cwd`、`--sql`、`--views`、`--route-map`。不传则使用上面的默认位置。

## 4. 生成资源配置

改完路由或页面里的静态 `v-permission` 之后，在 App 根目录执行：

```bash
g2rain-app build-config
```

默认读取 `src/views/route-map.ts` 和 `src/views`，写到 `src/shared/config-util/config`：

- `resources.json`
- `pages.json`
- `page-elements.json`

不生成 `api-endpoints.json`。`resources.json` 里的 API 端点为空。

可用 `--cwd`、`--route-map`、`--views`、`--out` 改路径。

`v-permission` 只认静态且带冒号的编码，例如 `v-permission="'member:add'"`。变量和插值不会写进 JSON。

## 5. 运行生成出的 App

独立运行。PowerShell：

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

也可以打开 `http://localhost:3001/?mode=alone`。未设置 `mode=alone` 时，直接访问开发地址会跳到 `VITE_MAIN_SHELL_ORIGIN` 加上 `VITE_MAIN_SHELL_REDIRECT_PREFIX`。

和主应用联调时只启动开发服务器，由主应用加载：

```powershell
$env:VITE_MAIN_SHELL_ORIGIN = 'http://localhost:3000'
$env:VITE_MAIN_SHELL_REDIRECT_PREFIX = '/main/redirect'
npm run dev
```

`VITE_APPLICATION_CODE` 填平台里的应用编码。`VITE_CONTEXT_PATH` 与部署时的 `CONTEXT_PATH` 使用同一个路径，例如 `/order`。

常用命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite |
| `npm run build` | `vue-tsc` 后构建 `dist` |
| `npm run preview` | 预览构建结果 |
| `g2rain-app generate --tables=<表名>` | 生成页面骨架 |
| `g2rain-app build-config` | 生成资源配置 JSON |
