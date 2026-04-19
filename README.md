# create-g2rain-app

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

CLI 脚手架工具，基于 `g2rain-app-template` 快速创建新的微前端子应用项目。

## 📋 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [使用方法](#使用方法)
- [项目初始化](#项目初始化)
- [配置说明](#配置说明)
- [开发指南](#开发指南)
- [发布说明](#发布说明)
- [常见问题](#常见问题)
- [许可证](#-许可证)
- [贡献](#-贡献)

## ✨ 功能特性

`g2rain-app-template` 是一个基于 Vue 3 + TypeScript + Vite + Element Plus + qiankun 的微前端子应用模板，包含以下特性：

- 🎯 **微前端支持**：基于 qiankun 框架，支持作为子应用被主应用加载
- 🔐 **Token 管理**：支持从主应用接收 token，自动初始化 token store
- 🚫 **子应用隔离**：子应用环境下自动禁用 token 持久化，避免与主应用冲突
- 🎨 **UI 框架**：集成 Element Plus 组件库
- 🔧 **类型安全**：完整的 TypeScript 类型定义
- 🐳 **Docker 支持**：包含 Dockerfile 和 OpenResty Lua 签名示例
- 📦 **开箱即用**：预配置路由、状态管理、HTTP 工具等

## 📦 安装

### 环境要求

- **Node.js** [18+](https://nodejs.org/)（与 `package.json` 中 `engines.node` 一致）

### 方式一：通过 npm（推荐）

发布到 npm 后，用户可以直接使用：

```bash
npm create g2rain-app@latest my-project
# 或
npx create-g2rain-app my-project
```

### 方式二：本地开发

```bash
# 克隆仓库
git clone git@github.com:g2rain/g2rain-app-cli.git
# 安装依赖
cd g2rain-app-cli
npm install

# 本仓库已纳入 package-lock.json，协作与 CI 建议使用：npm ci

# 构建
npm run build
```

构建完成后，可以通过以下方式在其他目录使用：

#### 方法一：使用 npm link（推荐，适合开发调试）

```bash
# 在 g2rain-app-cli 目录下创建全局链接
cd g2rain-app-cli
npm link

# 现在可以在任意目录使用命令
cd /path/to/other/directory
create-g2rain-app my-project
# 或
g2rain-app my-project
```

**注意**：项目模板为 `g2rain-app-template`，GitHub 地址为：https://github.com/g2rain/g2rain-app-template。CLI 工具会先将项目模板下载到创建新项目的同级目录，然后基于模板创建新项目。

#### 方法二：全局安装

```bash
# 在 g2rain-app-cli 目录下全局安装
cd g2rain-app-cli
npm install -g .

# 现在可以在任意目录使用命令
cd /path/to/other/directory
create-g2rain-app my-project
# 或
g2rain-app my-project
```

#### 方法三：使用 node 直接运行

```bash
# 在任意目录使用 node 直接运行构建产物
cd /path/to/other/directory
node /path/to/g2rain-app-cli/dist/index.js my-project
```

**注意**：
- 使用 `npm link` 后，如果修改了源码，需要重新运行 `npm run build` 才能生效
- 使用全局安装后，更新代码也需要重新构建和安装
- 如果使用 `npm link`，取消链接可以使用 `npm unlink -g create-g2rain-app`

## 🚀 使用方法

### 基本用法

```bash
# 创建新项目（交互式输入项目名称）
npm create g2rain-app@latest

# 创建新项目（直接指定项目名称）
npm create g2rain-app@latest my-app-name
```

### 自定义模板路径

默认情况下，CLI 会尝试在自身目录旁寻找 `g2rain-app-template`。  
如果你希望使用 **远程模板仓库** 或 **自定义路径**，可以先从 GitHub 拉取官方模板仓库：

```bash
# 从 GitHub 克隆官方模板
git clone git@github.com:g2rain/g2rain-app-template.git

# 假设你将模板克隆到了 /path/to/g2rain-app-template
cd g2rain-app-template
```

然后在创建项目时，通过环境变量指定模板路径：

#### 方法一：使用正斜杠（推荐）

```bash
# Linux/macOS
G2RAIN_TEMPLATE_PATH=/path/to/g2rain-app-template npm create g2rain-app@latest my-app

# Windows PowerShell（使用正斜杠）
$env:G2RAIN_TEMPLATE_PATH="D:/path/to/g2rain-app-template"; npm create g2rain-app@latest my-app

# Windows CMD
set G2RAIN_TEMPLATE_PATH=D:/path/to/g2rain-app-template && npm create g2rain-app@latest my-app
```

#### 方法二：使用反斜杠（需要转义）

```bash
# Windows PowerShell（反斜杠需要转义）
$env:G2RAIN_TEMPLATE_PATH="D:\\path\\to\\g2rain-app-template"; npm create g2rain-app@latest my-app

# Windows CMD（反斜杠不需要转义）
set G2RAIN_TEMPLATE_PATH=D:\path\to\g2rain-app-template && npm create g2rain-app@latest my-app
```

#### 方法三：分两步执行（最稳定）

```powershell
# Windows PowerShell
$env:G2RAIN_TEMPLATE_PATH="D:/path/to/g2rain-app-template"
npm create g2rain-app@latest my-app
```

```cmd
# Windows CMD
set G2RAIN_TEMPLATE_PATH=D:\path\to\g2rain-app-template
npm create g2rain-app@latest my-app
```

**注意**：
- 推荐使用正斜杠 `/` 而不是反斜杠 `\`，避免转义问题
- 环境变量只在当前终端会话中有效
- 如果使用分号 `;` 在同一行执行，确保路径使用正斜杠或正确转义的反斜杠

## 📝 项目初始化

创建项目后，按照以下步骤初始化：

### 1. 进入项目目录

```bash
cd my-app-name
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件（开发环境）或 `.env.production` 文件（生产环境）：

```env
# 应用编码
VITE_APPLICATION_CODE=my-app-name

# 前端基础路径
VITE_BASE_URL=/

# 后端网关地址
VITE_BACKEND_ORIGIN=http://localhost:8080

# 后端上下文路径
VITE_BACKEND_CONTEXT=/

# IAM/认证服务地址（默认等于 VITE_BACKEND_ORIGIN）
VITE_IAM_ORIGIN=http://localhost:8080

# Token 相关接口
VITE_REFRESH_TOKEN_URL=/auth/refresh-token
VITE_GENERATE_TOKEN_URL=/auth/token

# SSO 配置
VITE_SSO_BASE_URL=https://sso.example.com
VITE_AUTH_END_POINT=/auth/authorize
VITE_REDIRECT_URI=http://localhost:3000/sso_callback

# 开发服务器端口（可选）
VITE_SERVER_PORT=3000
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 6. 预览构建产物

```bash
npm run preview
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 示例 | 必填 |
|--------|------|------|------|
| `VITE_APPLICATION_CODE` | 应用编码 | `my-app-name` | ✅ |
| `VITE_BASE_URL` | 前端应用基础路径 | `/` 或 `/app` | ❌ |
| `VITE_BACKEND_ORIGIN` | 后端网关地址 | `http://localhost:8080` | ✅ |
| `VITE_APPLICATION_CONTEXT` | 前端应用上下文路径 | `/` 或 `/app` | ❌ |
| `VITE_IAM_ORIGIN` | IAM/认证服务地址 | `http://localhost:8080` | ❌ |
| `VITE_REFRESH_TOKEN_URL` | Token 刷新接口路径 | `/auth/refresh-token` | ✅ |
| `VITE_GENERATE_TOKEN_URL` | Token 生成接口路径 | `/auth/token` | ✅ |
| `VITE_SSO_BASE_URL` | SSO 服务基础地址 | `https://sso.example.com` | ✅ |
| `VITE_AUTH_END_POINT` | SSO 认证端点 | `/auth/authorize` | ✅ |
| `VITE_REDIRECT_URI` | SSO 回调地址 | `http://localhost:3000/sso_callback` | ✅ |
| `VITE_SERVER_PORT` | 开发服务器端口 | `3000` | ❌ |

> **路径提示**：模板示例使用 `/main/` 作为子应用路径，请根据主应用分配的实际路径调整：  
> - `VITE_BASE_URL`：设置为主应用给该子应用的挂载前缀（如 `/main/`、`/sub-app/`）。  
> - `VITE_REDIRECT_URI`：回调地址也需包含相同前缀（如 `https://your-domain.com/main/sso_callback`）。  
> - `VITE_APPLICATION_CONTEXT`：设置为应用在nginx的分配的路径（如 `/main`、`/sub-app`）。  
> 创建项目后请根据实际路径修改这两个变量，避免 SSO 回调或资源路径错误。

### qiankun 集成

作为子应用使用时，主应用需要传递以下 props：

```typescript
loadMicroApp({
  name: 'my-app-name',
  entry: '//localhost:3000',
  container: '#container',
  props: {
    token: 'your-token-string',    // 必填：token 字符串
    tokenKid: 'your-token-kid'     // 必填：token 的 kid (key id)
  }
})
```

子应用会在 `mount` 生命周期中自动接收并初始化 token。

## 🛠️ 开发指南

### 项目结构

```
my-app-name/
├── src/
│   ├── App.vue              # 根组件
│   ├── main.ts              # 入口文件（包含 qiankun 生命周期）
│   ├── qiankun.ts           # qiankun 配置和 token 初始化
│   ├── router/              # 路由配置
│   ├── store/               # Pinia 状态管理
│   │   ├── index.ts         # Store 初始化
│   │   └── modules/
│   │       └── token.ts     # Token store（子应用不持久化）
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   │   ├── env.ts           # 环境变量工具
│   │   ├── http.ts          # HTTP 请求工具
│   │   ├── sign.ts          # 签名工具
│   │   └── sso.ts           # SSO 工具
│   └── views/               # 页面组件
├── lua/                     # OpenResty Lua 签名示例
├── nginx/                   # Nginx 配置示例
├── Dockerfile               # Docker 构建文件
├── vite.config.ts           # Vite 配置
└── tsconfig.json            # TypeScript 配置
```

### 关键文件说明

- **`src/main.ts`**：应用入口，包含 qiankun 生命周期函数
- **`src/qiankun.ts`**：qiankun 配置，处理主应用传递的 token
- **`src/store/modules/token.ts`**：Token store，子应用环境下自动禁用持久化
- **`src/utils/http.ts`**：HTTP 请求工具，包含 DPoP 签名逻辑
- **`src/utils/sso.ts`**：SSO 登录和回调处理

### 独立运行 vs 子应用模式

项目支持两种运行模式：

1. **独立运行**：直接访问子应用，token 会持久化到 localStorage
2. **子应用模式**：被主应用加载，token 由主应用管理，不持久化

系统会自动检测 `window.__POWERED_BY_QIANKUN__` 来判断运行模式。

## 📤 发布说明

### 发布 CLI 工具到 npm

1. **准备模板**

   确保 `g2rain-app-template` 内容完整，可以选择：
   - 将模板放在 CLI 包旁边（默认路径）
   - 将模板打包上传到仓库，通过 `G2RAIN_TEMPLATE_PATH` 环境变量指向

2. **构建 CLI**

   ```bash
   cd g2rain-app-cli
   npm run build
   ```

3. **发布到 npm**

   ```bash
   npm publish --access public
   ```

### 发布模板

如果需要单独发布模板，可以：

1. 将 `g2rain-app-template` 打包
2. 上传到私有 npm 仓库或 GitHub Releases
3. 在 CLI 中使用时通过 `G2RAIN_TEMPLATE_PATH` 指向模板位置

## ❓ 常见问题

### Q: 创建项目时提示模板未找到？

A: 检查以下内容：
- 确认 `g2rain-app-template` 目录存在
- 如果模板不在默认位置，使用 `G2RAIN_TEMPLATE_PATH` 环境变量指定路径
- 确认模板目录包含必要的文件（如 `package.json`、`src/` 等）

### Q: 子应用的 token 如何管理？

A: 
- 子应用环境下，token 由主应用通过 props 传递
- 子应用会自动初始化 token store，但不会持久化到 localStorage
- 独立运行时，token 会正常持久化

### Q: 如何修改占位符？

A: CLI 工具会自动替换以下占位符：
- `{{PROJECT_NAME}}`：在 `package.json`、`README.md`、`lua/config.lua` 中

如果需要添加新的占位符，需要修改 `g2rain-app-cli/src/index.ts` 中的 `replaceTemplatePlaceholders` 函数。

### Q: 如何自定义模板？

A: 
1. 修改 `g2rain-app-template` 目录中的文件
2. 使用 `G2RAIN_TEMPLATE_PATH` 指向自定义模板路径
3. 或重新构建并发布 CLI 工具

### Q: 开发时如何调试？

A: 
```bash
# 在 g2rain-app-cli 目录下
npm run dev my-test-app
```

这会使用 `tsx` 直接运行 TypeScript 源码，方便调试。

## 📄 许可证

本项目基于 **[Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)** 开源，完整文本见仓库根目录 [`LICENSE`](LICENSE)。

## 🤝 贡献

**Issue 与讨论**请统一到主仓库 [g2rain/g2rain](https://github.com/g2rain/g2rain/issues) 提交，便于集中跟踪；请在标题或正文中注明与 **create-g2rain-app / g2rain-app-cli** 相关。

欢迎提交 Pull Request（本仓库）。建议流程：

1. Fork 本仓库并创建特性分支（如 `feature/your-feature-name`）
2. 本地修改后执行 `npm run build`，确保可正常编译
3. 提交 PR 并简要说明变更

维护者信息与 `package.json` 中 `contributors` 字段一致（与 [g2rain-spring-boot-starter](https://github.com/g2rain/g2rain-spring-boot-starter) 开发者信息对齐）。

安全相关问题请见 [SECURITY.md](SECURITY.md)。
