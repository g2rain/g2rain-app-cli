# g2rain-app-cli Agent Instructions

本文件是 AI Coding 在本项目中的执行入口。事实来源位于 `docs`、`package.json` 和当前源码。

## 项目定位

- 类型：Node.js 前端项目创建 CLI
- npm 包：`create-g2rain-app`
- bin：`create-g2rain-app`、`g2rain-app`
- 项目事实：`docs/project.yaml`
- 中央关联规范：`g2rain/docs/architecture/profiles/frontend-app/scaffolding-policy.md`
- 生成项目采用：`frontend-app 1.0.0-draft`

CLI 自身不是浏览器 App，不直接采用 frontend-app 的 layers/runtime 规则；但它必须保证生成结果和模板契约符合中央 Frontend App Profile。

## 开始前

按顺序读取：

1. `docs/project.yaml`
2. 中央 Frontend App 的 `scaffolding-policy.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/runtime-flow.md`
5. `docs/architecture/boundaries.md`
6. `docs/architecture/deviations.md`
7. `docs/development/command-interface.md`
8. `docs/development/template-contract.md`
9. `docs/development/testing.md`
10. 当前需求对应的 Requirements、Design 或 ADR

## 实现约束

- 不覆盖已存在目标目录，不在失败后把半成品误报为成功。
- 项目名、Context Path、模板路径和参数必须显式校验，不能允许目录逃逸或 shell 注入。
- 外部命令使用参数数组的进程 API，不拼接可执行 shell 字符串。
- 模板来源必须可追踪；正式发布应支持固定 Ref/版本和校验，而不是静默跟随默认分支。
- 新增/删除模板占位符时同步替换清单、模板文档和契约验证。
- 明确复制排除项；不能把模板 `.git`、node_modules、dist、密钥或本地配置带入新项目。
- 交互模式和非交互模式保持同一校验与输出语义；未知参数不能静默改变结果。
- CLI 不自动假设安装依赖、初始化 Git 或注册平台资源，除非需求和失败恢复明确设计。
- 修改命令、环境变量、模板选择、复制、替换、发布或输出提示时同步 README/docs。
- 不向仓库添加仅供 Agent 使用的验证脚本；真正的测试/契约检查应服务开发者和 CI。

## 完成前

- 执行 `npm run build`。
- 在临时目录使用本地 `G2RAIN_TEMPLATE_PATH` 验证非交互生成，不能污染仓库工作目录。
- 涉及 prompts 时验证交互取消、默认值、非法输入和非 TTY 自动化行为。
- 检查生成目录、排除项、package name、Context Path、残留占位符和生成项目构建。
- 发布变化执行 `npm pack --dry-run`，确认只包含预期 dist/bin/元数据。
- 检查 Git Diff、Markdown 链接、YAML、package/bin/engines 和安全边界。
- 按 `docs/development/definition-of-done.md` 报告未验证项与剩余偏差。
