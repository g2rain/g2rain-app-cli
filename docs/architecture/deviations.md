# 已知偏差与技术债

## DEV-001：项目名缺少路径和 npm 名称校验

状态：已于 2026-10-27 关闭。

交互与非交互 create 共用 `src/cli/validate.ts`：项目名须匹配 `^[a-z0-9][a-z0-9-]*$`（同时满足目录名、npm 包名与占位符替换安全），否则退出 1；绝对路径、`..`、路径分隔符、空白和 shell 元字符均被拒绝。

## DEV-002：Context Path 校验过弱

状态：已于 2026-10-27 关闭。

Context Path 去掉首尾 `/` 后按 `/` 分段，每段须匹配 `^[a-z0-9][a-z0-9_-]*$`，否则退出 1；交互/参数模式复用同一校验。

## DEV-003：模板 clone 使用 shell 字符串

状态：已于 2026-09-13 关闭。

create 默认使用包内 `template/` 快照，不再 Git clone；此前 `execFileSync` 参数数组实现也已移除。

## DEV-004：模板来源未固定版本

状态：已于 2026-10-01 进一步关闭。

正式 npm 包内嵌 `template/`、`template-shell/`、`template-shell-legacy/` 快照，meta schema v2 记录 `sourceRef`（Git tag）、完整 `sourceCommit` 与 `contentSha256`。正式同步由 GitHub Actions `sync-templates` 推 `chore/sync-templates`，再由人工开 PR 合并；本地 sync 需 `G2RAIN_ALLOW_LOCAL_SYNC=1`。详见 [template-snapshots.md](../template-snapshots.md)。

## DEV-005：模板完整性和失败恢复不足

状态：部分缓解（2026-10-01）。

`npm run verify:template-snapshots` 校验 meta、树哈希、Shell 无 legacy、legacy overlay 必需文件，并在 CI 中从源仓 tag 重建比对。复制失败半成品清理与原子重命名仍待补齐。

## DEV-006：参数接口曾静默忽略未知选项

状态：已于 2026-09-27 进一步缓解。

未知 `-` 选项会抛错并非零退出；已提供 `--help` / `--version` 与 `app`/`shell` 分族帮助。非 TTY 缺参统一失败策略仍待补齐。

## DEV-007：测试与发布保护缺失

状态：进一步缓解（2026-10-01）。

已有脚手架身份集成测试、dispatch / generate / build-config fixture 测试，以及模板解析测试。新增 snapshot hash/verify 与 sync/publish GitHub Actions（OIDC Trusted Publishing + `npm-production` 审批）。项目名、Context Path 与 generate 表名校验已有测试（2026-10-27）；失败恢复仍不完整。

## DEV-008：生成项目仍保留模板文档身份

状态：已于 2026-09-03 修复。

CLI 现在按明确清单将 `package.json`、`README.md`、`AGENTS.md`、`docs/project.yaml`、文档入口、架构概览和决策说明转换为业务 App 身份。生成项目记录真实项目名、推导的 g2rain 仓库地址、CLI 版本、模板仓库、模板 tag/commit（embedded meta 优先；否则 Git commit；再否则 `local`）和 Context Path；集成测试验证模板身份不会继续充当业务项目身份。指向官方模板的来源链接会保留，这是可追溯信息，不是项目身份。

## DEV-009：模板快照仍将 `create-g2rain-app` 钉为 `file:../g2rain-app-cli`

状态：已于 2026-10-27 关闭。

模板仓为本地联调保留 `file:../g2rain-app-cli`，CLI 快照照原样同步（不手改 `template*`）。生成 frontend-app 时 `rewriteFrontendAppPackageJson` 把 devDependency `create-g2rain-app` 改写为 `^<当前 CLI 版本>`，生成项目可直接在 monorepo 外 `npm install`。Shell 模板不依赖 `create-g2rain-app`，无需改写。
