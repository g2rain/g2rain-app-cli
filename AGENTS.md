# g2rain-app-cli Agent Instructions

本文件是 AI Coding 在本项目中的执行入口。事实来源位于 `docs`、`package.json` 和当前源码。

## 项目定位

- 类型：Node.js 前端脚手架 + 开发期生成 CLI
- npm 包：`create-g2rain-app`（当前 1.0.0）
- bin：`create-g2rain-app`、`g2rain-app`
- 子命令：`app` / `shell` / `create`（默认）、`generate`、`build-config`
- 项目族：
  - `frontend-app`：包内 `template/`（正式：GitHub Actions sync-templates ← `g2rain-app-template` tag）
  - `frontend-shell`：包内 `template-shell/` + 可选 `template-shell-legacy/`（← `g2rain-shell-template` tag）
- 快照治理：`docs/template-snapshots.md`
- 项目事实：`docs/project.yaml`
- 中央关联：`frontend-app/scaffolding-policy.md`、`frontend-shell/shell-generation-policy.md`
- Family registry：`src/families/`

CLI 自身不是浏览器 App；生成结果须分别符合对应 Profile，且不得用 app 模板冒充 Shell。

## 开始前

按顺序读取：

1. `docs/project.yaml`
2. 中央 Frontend App `scaffolding-policy.md` 与 Frontend Shell `shell-generation-policy.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/runtime-flow.md`
5. `docs/architecture/boundaries.md`
6. `docs/architecture/deviations.md`
7. `docs/development/command-interface.md`
8. `docs/development/template-contract.md`
9. `docs/template-snapshots.md`
10. `docs/development/testing.md`
11. 当前需求对应的 Requirements、Design 或 ADR

## 实现约束

- 不覆盖已存在目标目录，不在失败后把半成品误报为成功。
- 项目名、Context Path、模板路径和参数必须显式校验，不能允许目录逃逸或 shell 注入。
- 外部命令使用参数数组的进程 API，不拼接可执行 shell 字符串。
- 正式发布使用包内模板快照；更新模板通过 sync-templates workflow 开 PR，禁止手改 `template*`。
- 本地 `npm run sync:*` 仅排障：需要 `G2RAIN_ALLOW_LOCAL_SYNC=1` 与 `G2RAIN_*_TEMPLATE_REF`。
- App 可用 `G2RAIN_TEMPLATE_PATH`、Shell 可用 `G2RAIN_SHELL_TEMPLATE_PATH` 覆盖，不得默默跟随 GitHub 默认分支。
- 新增项目族时只注册 family definition（参数、模板、identity、verify、help），避免巨型 if/else。
- 明确复制排除项；不能把模板 `.git`、node_modules、dist、密钥、本地配置或 `.g2rain-template-*` marker 带入新项目。
- 交互模式和非交互模式保持同一校验与输出语义；未知参数必须报错。
- `generate` / `build-config` 仅服务 frontend-app 工程。
- 修改命令、环境变量、模板选择、复制、替换、发布或输出提示时同步 README/docs。
- 不向仓库添加仅供 Agent 使用的验证脚本；真正的测试/契约检查应服务开发者和 CI。

## 完成前

- 执行 `npm run build` 与 `npm run verify:template-snapshots`。
- 在临时目录验证非交互 `app` / `shell` / `shell --with-legacy` create；需要时再用族专用 env，不能污染仓库工作目录。
- 检查生成目录、排除项、package name、Context Path、残留占位符和生成项目构建。
- 发布变化执行 `npm pack --dry-run`，确认包含 dist + 三份模板快照、不含 node_modules。
- 检查 Git Diff、Markdown 链接、YAML、package/bin/engines 和安全边界。
- 按 `docs/development/definition-of-done.md` 报告未验证项与剩余偏差。
