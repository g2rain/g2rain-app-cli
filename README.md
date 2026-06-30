# g2rain-app-cli

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 1. 徽标与状态标识
- 当前项目面向 `Node.js 22+`
- 当前构建方式以 `TypeScript + tsc` 为准
- 当前分发形态为 `npm CLI`
- 当前开源许可证为 `Apache 2.0`

## 2. 项目简介
`g2rain-app-cli` 是 G2rain 平台面向微前端子应用的初始化 CLI，用于基于官方模板仓库 `g2rain-app-template` 快速创建子应用工程。它自身负责参数交互、模板定位、目录复制、占位符替换与项目初始化提示，而模板运行时的技术栈、目录约定和联调方式以模板仓库文档为准。

## 3. 平台定位

`g2rain-app-cli` 位于 G2rain 平台工程化能力层，是平台前端子应用创建入口。  
它主要服务于需要快速初始化微前端子应用的前端研发团队。  
它负责把模板仓库按项目名与 context path 定制化复制出来，但不负责模板运行时能力本身。

## 4. 核心能力

- npm create 入口：支持 `npm create g2rain-app@latest`
- CLI 双命令：暴露 `g2rain-app` 与 `create-g2rain-app`
- 参数与交互：支持 positional 项目名、`--context-path`、交互输入
- 模板定位：支持本地模板路径、同级模板目录与远程 GitHub 克隆回退
- 占位符替换：自动注入项目名与 context path
- 微前端 context path 推导：从项目名自动推导短路径默认值

## 5. 技术栈

- 语言：`TypeScript`
- 运行时：`Node.js >=22`
- 核心依赖：`fs-extra`、`prompts`、`kleur`
- 构建工具：`tsc`
- CLI 入口：`dist/index.js`

## 6. 快速开始
### 环境要求

- `Node.js 22+`
- `npm 10+` 或可兼容的现代 npm 版本

### 直接创建项目

```bash
npm create g2rain-app@latest
```

指定项目名：

```bash
npm create g2rain-app@latest my-app-name
```

指定 context path：

```bash
npm create g2rain-app@latest g2rain-cms-app -- --context-path cms
```

### 使用 npx

```bash
npx create-g2rain-app my-project
```

### 本地开发

```bash
npm install
npm run build
npm run dev -- my-test-app cms
```

### 使用本地模板目录

```powershell
$env:G2RAIN_TEMPLATE_PATH="D:/path/to/g2rain-app-template"
npm create g2rain-app@latest my-app
```

### 构建说明

```bash
npm run build
```

构建产物输出到 `dist/`，CLI 实际执行入口为 `dist/index.js`。

## 7. 项目结构

```text
g2rain-app-cli/
├── src/
│   └── index.ts
├── dist/
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── SECURITY.md
```

### 核心能力结构说明

#### 1. `src/index.ts`：CLI 单入口实现
- 解决问题：把前端子应用初始化需要的参数、模板和文件处理逻辑集中在一个轻量入口中
- 核心逻辑：
  - 解析项目名与 `--context-path`
  - 在缺少参数时用 `prompts` 交互补全
  - 解析模板目录并在缺失时克隆官方模板
  - 复制模板并替换 `{{PROJECT_NAME}}`、`{{CONTEXT_PATH}}`
- 典型用法：直接通过 `npm create`、`npx` 或本地 `node dist/index.js` 调用

典型写法：
```bash
npm create g2rain-app@latest g2rain-cms-app -- --context-path cms
```

#### 2. `package.json`：npm 分发与命令定义
- 解决问题：让 CLI 能以标准 npm create 方式被使用
- 核心逻辑：
  - 包名采用 `create-g2rain-app`
  - `bin` 同时暴露 `g2rain-app` 和 `create-g2rain-app`
  - `engines.node` 限定 `>=22`
- 典型用法：发布后通过 `npm create g2rain-app@latest` 直接调用

#### 3. 模板路径与远程回退机制
- 解决问题：兼容本地开发、同级模板仓库协作和模板缺失场景
- 核心逻辑：
  - 优先读取 `G2RAIN_TEMPLATE_PATH`
  - 其次使用同级 `g2rain-app-template`
  - 找不到模板时自动 `git clone` 官方仓库
- 典型使用场景：CLI 本地联调或发布后用户首次初始化项目

#### 4. context path 推导与占位替换
- 解决问题：让微前端子应用默认获得合理的 URL 前缀和模板内配置值
- 核心逻辑：
  - 从项目名推导默认 context path
  - 去除首尾斜杠并校验非空
  - 在固定文件中写入项目名和 context path
- 典型使用场景：生成 `g2rain-cms-app` 时自动推导 `cms`

### 接入建议与边界
- 如需了解模板目录结构、环境变量与运行方式，应以 `g2rain-app-template` 文档为准
- `g2rain-app-cli` 更适合描述“如何创建项目”，而不是“创建后如何运行全部模板逻辑”
- 若后续要新增 CLI 参数，应优先保持单入口逻辑清晰，避免过早拆散为多个复杂模块

## 8. 常用命令

```bash
npm install
npm run build
npm run dev -- my-test-app cms
node dist/index.js my-project cms
npm create g2rain-app@latest g2rain-cms-app -- --context-path cms
```

## 9. 质量与测试
- 当前扫描到主源码文件 `1` 个，测试文件 `0` 个
- 当前质量保障主要依赖 TypeScript 编译通过与手工场景验证
- 当前尚未识别到自动化测试文件，后续可按参数解析、路径解析和占位替换补充测试

## 10. 相关仓库

- `g2rain-app-template`
- `g2rain-main-shell`
- `g2rain-manager-app`
- `g2rain-cms-app`
- `g2rain-department-app`

## 11. 使用建议

- 适合作为平台前端子应用初始化统一入口
- 使用前建议先确认模板目录来源是本地还是 GitHub 克隆
- 生成后应继续参考模板仓库文档完成依赖安装、运行和联调
- 不建议把模板运行时说明全部堆在本仓库 README 中

## 12. 贡献指南

欢迎通过文档改进、Issue 反馈、测试补充、CLI 参数增强等形式参与贡献。  
建议流程：
1. Fork 本仓库
2. 创建特性分支
3. 提交修改
4. 推送分支
5. 提交 Pull Request

提交前请尽量确保：
- 遵循现有技术栈与代码规范
- 更新相关文档
- 补充必要验证

## 13. 许可证

本项目基于 [Apache 2.0许可证](LICENSE) 开源。

## 14. 联系我们

- **站点**: https://www.g2rain.com/
- **Issues**: [GitHub Issues](https://github.com/g2rain/g2rain/issues)
- **讨论**: [GitHub Discussions](https://github.com/g2rain/g2rain/discussions)
- **邮箱**: g2rain_developer@163.com

## 15. 致谢

感谢所有为这个项目做出贡献的开发者们。  
如果这个项目对您有帮助，欢迎 Star 支持。
