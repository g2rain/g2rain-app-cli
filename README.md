# G2rain App CLI

[![npm](https://img.shields.io/npm/v/create-g2rain-app.svg)](https://www.npmjs.com/package/create-g2rain-app)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

G2rain 前端工程与权限资源脚手架。创建业务子应用和主壳，从 SQL 生成 CRUD 页面，并从页面声明生成权限资源配置。

[快速开始](#快速开始) · [命令](#命令) · [工作原理](#工作原理) · [FAQ](#faq) · [开发与贡献](#开发与贡献)

## 快速开始

需要 **Node.js >=22** 和 npm。推荐全局安装后，直接使用 `g2rain-app`：

```bash
npm install -g create-g2rain-app@latest
g2rain-app --version
```

进入新项目的父目录，创建业务子应用：

```bash
g2rain-app app g2rain-order-app --context-path order
cd g2rain-order-app
npm install
npm run dev
```

创建主壳：

```bash
g2rain-app shell g2rain-admin-shell --context-path admin --port 3000
cd g2rain-admin-shell
npm install
npm run dev
```

子应用独立运行、SSO、网关与主壳接入，按生成项目的 README 配置。生成工程不等于完成平台接入。

### 备选：无需全局安装

临时创建项目时，可以通过 npx 执行：

```bash
npx create-g2rain-app@latest app g2rain-order-app --context-path order
```

以下命令统一使用 `g2rain-app`。团队和 CI 应锁定已验证的具体版本，避免每次执行都重新选择 latest。

## 命令

| 命令 | 用途 | 执行位置 |
| --- | --- | --- |
| `g2rain-app app <name>` | 创建业务子应用 | 新项目的父目录 |
| `g2rain-app shell <name>` | 创建 Main Shell | 新项目的父目录 |
| `g2rain-app generate --tables=<table>` | 从 SQL 生成 CRUD 骨架 | 业务子应用根目录 |
| `g2rain-app build-config` | 生成页面和页面元素权限资源 | 业务子应用根目录 |
| `g2rain-app --help` | 查看帮助 | 任意目录 |
| `g2rain-app --version` | 查看版本 | 任意目录 |

### 创建项目

```bash
g2rain-app app g2rain-order-app --context-path order
g2rain-app shell g2rain-admin-shell --context-path admin --port 3000
```

| 参数 | 适用命令 | 说明 |
| --- | --- | --- |
| `<name>` | app、shell | 项目目录与包名；小写字母、数字、连字符，首字符为字母或数字 |
| `--context-path <path>` | app、shell | URL 前缀；支持多段路径，各段使用小写字母、数字、下划线或连字符，首字符为字母或数字 |
| `--port <number>` | shell | 开发端口，默认 3000 |
| `--help` | app、shell | 查看对应项目类型的帮助 |

App 的默认 Context Path 由项目名去掉 `g2rain-` 前缀和 `-app` 后缀得到，例如 `g2rain-order-app` 对应 `order`；Shell 默认 `admin`。终端交互会提示补充信息；自动化执行时建议显式传入项目名和 Context Path。

目标目录在当前工作目录下，已存在时拒绝覆盖。生成后由开发者安装依赖、配置环境并初始化 Git。

### 生成 CRUD 页面

将表的 DDL 放入 `scripts/database.sql`，在业务子应用根目录执行：

```bash
g2rain-app generate --tables=orders
g2rain-app generate --tables=orders,order_items
g2rain-app generate --tables=orders --no-mock --no-route
```

每张表默认生成：

```text
src/views/<table>/
├── index.vue
├── api.ts
├── type.ts
└── mock.ts
```

同时更新 `src/views/route-map.ts`。**同名生成文件会覆盖，执行前先保存改动，执行后检查 diff。** 表名须为字母或下划线开头的 SQL 标识符；任一指定表在 SQL 中不存在时，写文件前报错。

| 参数 | 说明 |
| --- | --- |
| `--tables <a,b>` | 目标表，逗号分隔；未传时读取 G2RAIN_TABLES |
| `--cwd <dir>` | 项目根目录，默认当前目录 |
| `--sql <path>` | 默认 scripts/database.sql |
| `--views <path>` | 默认 src/views |
| `--route-map <path>` | 默认 src/views/route-map.ts |
| `--no-view` | 不生成 index.vue |
| `--no-api` | 不生成 api.ts 和 type.ts |
| `--no-mock` | 不生成 mock.ts |
| `--no-route` | 不更新 route-map.ts |

生成器解析本地 SQL，不连接数据库。生成代码是业务开发起点，接口、字段和交互仍需开发者审查。

### 生成权限资源

在路由映射中注册页面，并在 Vue 模板里声明静态权限码：

```vue
<template>
  <el-button v-permission="'orders:add'">新增订单</el-button>
  <StatusSwitch v-model="status" permission="orders:status_update" />
</template>
```

上例展示权限声明；组件导入、提交回调和权限 Provider 由应用装配。执行：

```bash
g2rain-app build-config
```

默认读取 `src/views/route-map.ts`，扫描已注册页面目录下的 Vue 模板，输出：

```text
src/shared/config-util/config/
├── resources.json
├── pages.json
└── page-elements.json
```

支持 `v-permission` 中的静态权限码和组件的静态 `permission` 属性。编码须包含冒号，例如 `orders:add`。动态绑定不能作为静态资源声明。

| 参数 | 默认值 |
| --- | --- |
| `--cwd <dir>` | 当前目录 |
| `--route-map <path>` | src/views/route-map.ts |
| `--views <path>` | src/views |
| `--out <path>` | src/shared/config-util/config |

本命令只生成文件，不自动提交权限平台或授予用户权限。当前不生成 `api-endpoints.json`，聚合资源中的 API 端点列表为空。

### 在项目中锁定 CLI

在已有业务子应用中安装开发依赖：

```bash
npm install --save-dev --save-exact create-g2rain-app@latest
```

在 package.json 添加脚本，使用项目本地安装的 CLI：

```json
{
  "scripts": {
    "generate": "g2rain-app generate",
    "build:config": "g2rain-app build-config"
  }
}
```

```bash
npm run generate -- --tables=orders
npm run build:config
```

提交 package.json 与锁文件后，团队和 CI 使用同一份 CLI 依赖。

## 工作原理

```text
app / shell
  参数校验 → 选择内置模板 → 过滤复制 → 替换项目身份与配置 → 验证生成结果

generate
  本地 SQL DDL → 表结构解析 → EJS 模板渲染 → Vue / API / 类型 / Mock / 路由映射

build-config
  路由映射 → 已注册页面 → 静态权限声明 → 页面与页面元素资源 JSON
```

**工程创建**使用包内固定模板快照：App 来自 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template)，Shell 来自 [g2rain-shell-template](https://github.com/g2rain/g2rain-shell-template)。生成项目记录 CLI 版本、模板来源和 Context Path。复制时排除 Git、依赖目录、构建产物及指定本地文件，并还原模板中的 `.gitignore`、`.npmrc`。

**权限资源提取**通过路由映射确定页面范围，再扫描页面目录下的 Vue 模板；权限码去重后生成配置。未注册到路由映射的页面不会进入这条扫描链路。

**运行时授权**由应用和平台完成。CLI 生成工程、代码和权限资源声明；服务端仍须执行接口鉴权，按钮隐藏或禁用不能代替授权。

## FAQ

### npm 包名为什么和命令名不同？

安装包是 `create-g2rain-app`，本文使用它提供的 `g2rain-app` 命令。一次性执行用 `npx create-g2rain-app@latest`，全局安装后用 `g2rain-app`。

### App 和 Shell 应该选哪个？

业务页面、领域 API、CRUD 开发选择 app；菜单、工作区和微应用编排的主入口选择 shell。generate 和 build-config 仅用于业务子应用。

### 为什么新项目第一次要 npm install？

生成器不复制模板 lockfile。首次 npm install 建立当前项目的锁文件，提交后再在 CI 使用 npm ci。

### 为什么权限码没有出现在生成文件里？

检查页面是否注册到 route-map、映射路径是否指向正确页面目录、编码是否为 Vue 模板中带冒号的静态字面量。组件应使用 `permission="orders:edit"`，不要用 `:permission="permissionCode"` 作为扫描输入。修改后重新执行 build-config 并检查生成 diff。

### 生成权限配置后，按钮为什么还是不可用？

资源生成与运行时权限是两步。还需按平台流程导入资源、授权，并让应用加载权限数据。StatusSwitch 还需在 UI 装配处提供 permission.isEnabled，详见生成项目与 Appkit 文档。

### 可以重复执行 generate 吗？

可以，但同名生成文件会覆盖，不会合并手写业务逻辑。先提交或保存改动，生成后逐项审查差异。

### 升级 CLI 会自动修改已有项目吗？

不会。新建项目使用该 CLI 包内模板；已有项目只有在显式运行 generate 或 build-config 时才写入对应产物。

### 如何验证本地模板？

设置 `G2RAIN_TEMPLATE_PATH` 或 `G2RAIN_SHELL_TEMPLATE_PATH` 指向完整的本地模板目录，再执行 app 或 shell。正式快照通过固定 Tag 同步，见 [模板快照治理](docs/template-snapshots.md)。

### 找不到命令或报 Unknown option 怎么办？

使用 `g2rain-app --version` 和 `g2rain-app --help` 确认实际命令，检查 Node.js 版本与参数拼写。项目脚本使用本地开发依赖，全局命令使用全局安装；未全局安装时使用 npx 入口。

## 开发与贡献

```bash
npm ci
npm run build
npm test
npm run verify:template-snapshots
npm pack --dry-run
```

本仓库使用 TypeScript，生成模板由 EJS 渲染。命令、参数或模板行为变化须同步契约、测试和文档。生成器验证使用临时项目，避免覆盖真实业务文件。

模板仓库是内容来源，CLI 内置快照通过同步流程维护。发布由 GitHub Actions 对版本 Tag 执行检查、打包、生成项目冒烟与 npm Trusted Publishing，见 [发布流程](docs/operations/publishing.md)。

## 更多资料

| 主题 | 文档 |
| --- | --- |
| 完整文档 | [文档索引](docs/index.md) |
| 项目使用 | [使用手册](docs/development/usage.md) |
| 命令接口 | [参数与默认值](docs/development/command-interface.md) |
| 架构 | [概览](docs/architecture/overview.md) · [运行流程](docs/architecture/runtime-flow.md) |
| 模板维护 | [模板契约](docs/development/template-contract.md) · [快照治理](docs/template-snapshots.md) |
| 开发验证 | [本地开发](docs/development/local-development.md) · [测试](docs/development/testing.md) |
| 安全 | [安全边界](docs/security/security-boundaries.md) · [漏洞报告](SECURITY.md) |

## 社区与许可证

[官网](https://www.g2rain.com) · [报告问题](https://github.com/g2rain/g2rain/issues) · [参与讨论](https://github.com/g2rain/g2rain/discussions)

基于 [Apache License 2.0](LICENSE) 开源。
