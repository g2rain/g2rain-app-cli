# create-g2rain-app

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

CLI 脚手架，用于基于官方模板 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template) 生成微前端子应用工程。

**说明**：模板的技术栈、目录结构、环境变量、qiankun 集成与运行方式等，**一律以 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template) 仓库文档为准**，本文只描述 CLI 自身的行为，避免两处文档不一致。

## 📋 目录

- [安装](#安装)
- [使用方法](#使用方法)
- [Context Path 配置](#context-path-配置)
- [CLI 开发](#cli-开发)
- [发布说明](#发布说明)
- [常见问题](#常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)
- [联系我们](#-联系我们)
- [致谢](#-致谢)

## 📦 安装

### 环境要求

- **Node.js** [22+](https://nodejs.org/)（与 `package.json` 中 `engines.node` 一致，与 [g2rain-manager-app](https://github.com/g2rain/g2rain-manager-app) 对齐）

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

**注意**：默认会查找与 CLI 同级的 `g2rain-app-template` 目录；也可克隆官方模板：<https://github.com/g2rain/g2rain-app-template>。详见下方 [自定义模板路径](#自定义模板路径)。

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

# 指定 context path（详见下方 [Context Path 配置](#context-path-配置)）
npm create g2rain-app@latest g2rain-cms-app -- --context-path cms
```

生成完成后，**进入新项目目录并按 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template) 文档**完成依赖安装、配置与启动。

### 自定义模板路径

默认情况下，CLI 会尝试在自身目录旁寻找 `g2rain-app-template`。若模板在其他位置，可先克隆官方仓库：

```bash
git clone git@github.com:g2rain/g2rain-app-template.git
```

然后在创建项目时通过环境变量 `G2RAIN_TEMPLATE_PATH` 指定模板根目录：

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
- 若在同一行用分号执行多条命令，注意路径中的斜杠写法

## Context Path 配置

**Context Path** 是子应用在浏览器中的 URL 前缀（如 `/cms`、`/manager`），与 **项目名称**（npm 包名、目录名）相互独立。

在 G2rain 微前端体系中，主应用 main-shell 按 context path 挂载子应用；子应用的 `vite.config.ts` 会读取 `VITE_CONTEXT_PATH` 作为 `base`。因此通常使用短路径（`cms`）而非完整项目名（`g2rain-cms-app`）。

### 指定方式

| 方式 | 示例 | 说明 |
|------|------|------|
| 长选项 | `npm create g2rain-app@latest g2rain-cms-app -- --context-path cms` | 推荐；`npm create` 后需加 `--` 再传 CLI 参数 |
| 下划线别名 | `npm create g2rain-app@latest g2rain-cms-app -- --context_path cms` | 与 `--context-path` 等价 |
| positional 简写 | `npm create g2rain-app@latest g2rain-cms-app cms` | 第二个非选项参数视为 context path |
| 交互式 | `npm create g2rain-app@latest` | 未传参时依次提示项目名与 context path |
| 本地开发 | `npm run dev -- g2rain-cms-app cms` | 在 `g2rain-app-cli` 仓库内调试时同理 |

### 默认值推导

交互式创建或未指定 `--context-path` 时，CLI 会从项目名推导默认值：

1. 去掉前缀 `g2rain-`
2. 去掉后缀 `-app`
3. 若结果为空则回退为完整项目名

| 项目名 | 默认 context path |
|--------|-------------------|
| `g2rain-cms-app` | `cms` |
| `g2rain-manager-app` | `manager` |
| `my-portal` | `my-portal` |

### 格式要求

- 填写 **不含首尾斜杠** 的路径段，例如 `cms`（不要写 `/cms/`）
- CLI 会自动 `trim` 并去掉首尾 `/`
- 不能为空字符串

### 生成时写入的配置

CLI 会将 `{{PROJECT_NAME}}` 与 `{{CONTEXT_PATH}}` 替换到模板中的以下文件（若存在）：

| 文件 | 典型用途 |
|------|----------|
| `.env` / `.env.production` | `VITE_APPLICATION_CODE`、`VITE_CONTEXT_PATH` |
| `vite.config.ts` | 通过 `VITE_CONTEXT_PATH` 设置 `base` |
| `src/runtime/env/index.ts` | 导出 `PROJECT_NAME` 常量 |
| `lua/config.lua` | OpenResty 网关路由 |
| `build.sh` | 构建脚本中的路径变量 |
| `README.md` | 项目文档中的占位符 |

**生成结果示例**（`g2rain-cms-app` + context path `cms`）：

```env
VITE_APPLICATION_CODE=g2rain-cms-app
VITE_CONTEXT_PATH=/cms
```

创建成功时 CLI 会输出 `context path: /cms` 供确认。

### 生成后修改

Context path 在脚手架阶段确定后，也可在生成项目的 `.env` / `.env.production` 中修改 `VITE_CONTEXT_PATH`（需带前导 `/`，如 `/cms`）。修改后需与 main-shell 注册名、网关路由保持一致。

运行时行为、独立开发与 main-shell 联调等，请参阅 **[g2rain-app-template](https://github.com/g2rain/g2rain-app-template)** 文档。

## CLI 开发

本仓库仅包含 CLI 源码（例如 `src/index.ts`）。日常开发：

```bash
npm run build    # 编译到 dist/
npm run dev      # 使用 tsx 直接运行源码，便于调试，例如：npm run dev -- my-test-app
```

生成应用的开发与构建步骤不在本文说明，请参阅 **[g2rain-app-template](https://github.com/g2rain/g2rain-app-template)**。

## 📤 发布说明

### 发布 CLI 到 npm

1. 确保可正常执行 `npm run build`
2. 按团队流程更新版本号并执行 `npm publish --access public`（需有 npm 权限）

模板本身的发布与版本策略见 **g2rain-app-template** 仓库说明。

## ❓ 常见问题

### Q: 创建项目时提示模板未找到？

A: 确认本机存在 `g2rain-app-template` 目录（默认在 CLI 同级），或使用 `G2RAIN_TEMPLATE_PATH` 指向已克隆的模板路径；模板内需包含 `package.json`、`src/` 等基本结构。详见 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template)。

### Q: 如何修改占位符？

A: CLI 会替换模板中的占位符：

- `{{PROJECT_NAME}}` → 项目名称（npm 包名、目录名）
- `{{CONTEXT_PATH}}` → context path（不含首尾斜杠，写入 `.env` 时会由模板加上前导 `/`）

若需新增占位符，请修改本仓库 `src/index.ts` 中的 `replaceTemplatePlaceholders` 等逻辑。

### Q: context path 与项目名有什么区别？

A: **项目名**用于目录、`package.json` 的 `name` 等标识；**context path** 用于浏览器 URL 前缀与微前端挂载（如 `http://localhost:3001/cms/`）。两者可以不同，例如项目名 `g2rain-cms-app`、context path `cms`。创建时通过 `--context-path` 指定，详见 [Context Path 配置](#context-path-配置)。

### Q: 如何使用自定义模板？

A: 复制或 fork [g2rain-app-template](https://github.com/g2rain/g2rain-app-template) 后自行修改，并通过 `G2RAIN_TEMPLATE_PATH` 指向该目录。

### Q: 开发 CLI 时如何调试？

A:

```bash
cd g2rain-app-cli
npm run dev my-test-app
```

使用 `tsx` 直接运行 TypeScript 源码。

### Q: 生成后的项目如何配置与运行？

A: **请以 [g2rain-app-template](https://github.com/g2rain/g2rain-app-template) 的 README 为准**（环境变量、微前端、Token 等）。

## 🤝 贡献指南

我们欢迎所有形式的贡献！

**Issue 与讨论**请统一到主仓库 [g2rain/g2rain](https://github.com/g2rain/g2rain/issues) 提交，便于集中跟踪；请在标题或正文中注明与 **create-g2rain-app / g2rain-app-cli** 相关。

### 贡献流程

1. **Fork** 本仓库
2. **创建特性分支**：`git checkout -b feature/your-feature-name`
3. 本地修改后执行 `npm run build`，确保可正常编译
4. **提交更改**：`git commit -m "Add some feature"`
5. **推送分支**：`git push origin feature/your-feature-name`
6. **提交 Pull Request**

维护者信息与 `package.json` 中 `contributors` 字段一致（与 [g2rain-spring-boot-starter](https://github.com/g2rain/g2rain-spring-boot-starter) 开发者信息对齐）。

安全相关问题请见 [SECURITY.md](SECURITY.md)。

## 📄 许可证

本项目基于 [Apache 2.0许可证](LICENSE) 开源。

## 📞 联系我们

- **Issues**: [GitHub Issues](https://github.com/g2rain/g2rain/issues)
- **讨论**: [GitHub Discussions](https://github.com/g2rain/g2rain/discussions)
- **邮箱**: g2rain_developer@163.com

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！
