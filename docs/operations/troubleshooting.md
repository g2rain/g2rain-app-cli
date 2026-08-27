# 故障排查

## 命令不存在

- npx：确认包名是 `create-g2rain-app`。
- 全局/本地安装：确认 `npm bin`、PATH 和 package bin 链接。
- 仓库开发：先执行 `npm run build`，或直接 `node dist/index.js`。

## 找不到模板

- 设置 `G2RAIN_TEMPLATE_PATH` 为完整本地模板绝对路径。
- 自动 clone 需要 Git 和 GitHub 网络访问。
- 路径存在但内容不完整时，当前 CLI 不会自动重新 clone；检查 package.json 和模板目录。
- clone 失败后可能留下半成品目录，确认路径后再手工处理。

## Target directory already exists

CLI 有意拒绝覆盖。选择新项目名，或人工确认旧目录内容后移动/删除。不要让自动化对不明确目录执行递归删除。

## Context Path 不符合预期

- 参数接受 `--context-path`、`--context_path` 或第二个位置值。
- 写入值会去掉首尾 `/`。
- 未提供时从项目名移除 `g2rain-` 和 `-app`。
- 当前字符校验有限，生成前使用简单的小写字母、数字和连字符，并检查 `.env`/`.env.production`。

## 生成项目残留占位符

检查模板是否新增占位文件但 CLI 固定替换清单未更新。搜索 `{{PROJECT_NAME}}` 和 `{{CONTEXT_PATH}}`，区分文档中刻意展示的示例。更新模板契约和 CLI 后重新生成，不直接盲目全仓替换二进制或用户内容。

## 生成项目不能 npm ci

CLI 当前排除模板 package-lock，因此新项目先执行 `npm install` 生成自己的 lockfile；此后才能使用 `npm ci`。

## npm 发布后仍执行旧代码

检查 package version、npm 缓存和 tarball 内 dist。当前没有 prepublish 自动构建，可能发布陈旧 dist；发布修复版本，不能覆盖原版本。
