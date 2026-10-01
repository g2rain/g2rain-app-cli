# 已知偏差与技术债

## DEV-001：项目名缺少路径和 npm 名称校验

当前 `projectName` 直接参与 `path.resolve(cwd, projectName)` 和 `package.json.name`。未限制绝对路径、`..`、路径分隔符、保留名、空白和 npm 包名字符，可能生成到预期父目录之外或产生不可发布包名。

应分别定义目录名和 npm package name 规则，解析后验证目标路径仍是预期父目录的直接子目录。

## DEV-002：Context Path 校验过弱

当前只去除首尾 `/` 并拒绝空值，仍可能接受空格、反斜杠、`.`、`..`、查询/片段字符或多段异常路径。应定义允许字符、分段和标准化规则，并让交互/参数模式复用同一校验。

## DEV-003：模板 clone 使用 shell 字符串

状态：已于 2026-09-13 关闭。

create 默认使用包内 `template/` 快照，不再 Git clone；此前 `execFileSync` 参数数组实现也已移除。

## DEV-004：模板来源未固定版本

状态：已于 2026-10-01 进一步关闭。

正式 npm 包内嵌 `template/`、`template-shell/`、`template-shell-legacy/` 快照，meta schema v2 记录 `sourceRef`（Git tag）、完整 `sourceCommit` 与 `contentSha256`。正式同步由 GitHub Actions `sync-templates` 创建 PR；本地 sync 需 `G2RAIN_ALLOW_LOCAL_SYNC=1`。详见 [template-snapshots.md](../template-snapshots.md)。

## DEV-005：模板完整性和失败恢复不足

状态：部分缓解（2026-10-01）。

`npm run verify:template-snapshots` 校验 meta、树哈希、Shell 无 legacy、legacy overlay 必需文件，并在 CI 中从源仓 tag 重建比对。复制失败半成品清理与原子重命名仍待补齐。

## DEV-006：参数接口曾静默忽略未知选项

状态：已于 2026-09-27 进一步缓解。

未知 `-` 选项会抛错并非零退出；已提供 `--help` / `--version` 与 `app`/`shell` 分族帮助。非 TTY 缺参统一失败策略仍待补齐。

## DEV-007：测试与发布保护缺失

状态：进一步缓解（2026-10-01）。

已有脚手架身份集成测试、dispatch / generate / build-config fixture 测试，以及模板解析测试。新增 snapshot hash/verify 与 sync/publish GitHub Actions（OIDC Trusted Publishing + `npm-production` 审批）。参数路径逃逸与失败恢复仍不完整。

## DEV-008：生成项目仍保留模板文档身份

状态：已于 2026-09-03 修复。

CLI 现在按明确清单将 `package.json`、`README.md`、`AGENTS.md`、`docs/project.yaml`、文档入口、架构概览和决策说明转换为业务 App 身份。生成项目记录真实项目名、推导的 g2rain 仓库地址、CLI 版本、模板仓库、模板 tag/commit（embedded meta 优先；否则 Git commit；再否则 `local`）和 Context Path；集成测试验证模板身份不会继续充当业务项目身份。指向官方模板的来源链接会保留，这是可追溯信息，不是项目身份。
