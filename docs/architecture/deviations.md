# 已知偏差与技术债

## DEV-001：项目名缺少路径和 npm 名称校验

当前 `projectName` 直接参与 `path.resolve(cwd, projectName)` 和 `package.json.name`。未限制绝对路径、`..`、路径分隔符、保留名、空白和 npm 包名字符，可能生成到预期父目录之外或产生不可发布包名。

应分别定义目录名和 npm package name 规则，解析后验证目标路径仍是预期父目录的直接子目录。

## DEV-002：Context Path 校验过弱

当前只去除首尾 `/` 并拒绝空值，仍可能接受空格、反斜杠、`.`、`..`、查询/片段字符或多段异常路径。应定义允许字符、分段和标准化规则，并让交互/参数模式复用同一校验。

## DEV-003：模板 clone 使用 shell 字符串

当前 `execSync('git clone ... "templateRoot"')` 拼接 shell 命令。模板路径可受环境变量影响，包含引号或 shell 元字符时存在注入/转义风险。应改用 `spawnSync`/`execFileSync` 参数数组，并验证最终路径。

## DEV-004：模板来源未固定版本

GitHub clone 默认跟随仓库默认分支，npm 同一 CLI 版本在不同时间可能生成不同代码。项目元数据也没有记录模板 Commit/Tag。

正式发布应确定兼容模板 Ref，支持显式 `--template-ref` 或版本映射，并把来源/Ref 写入生成项目元数据。

## DEV-005：模板完整性和失败恢复不足

只要模板路径存在就会复制，不校验 package.json、占位 manifest 或 Profile 版本。clone/复制/替换失败会留下半成品目标目录，后续运行因目录已存在而停止。

建议验证模板 manifest，在临时目录完成生成和校验后原子重命名；失败只清理本次创建的已验证临时目录。

## DEV-006：参数接口静默忽略未知选项

未知 `-` 选项直接跳过，拼写错误可能触发 Prompt 或生成意外结果。应提供 `--help`、`--version`、明确未知参数错误和非 TTY 下缺参失败。

## DEV-007：测试与发布保护缺失

当前只有 TypeScript build，没有参数/路径/复制/替换/失败集成测试，也没有 `prepublishOnly`。npm 发布可能包含陈旧 dist；模板契约回归只能人工发现。

优先增加纯函数单元测试、临时目录集成测试、模板 manifest 契约测试和发布前自动构建/tarball 检查。

## DEV-008：生成项目仍保留模板文档身份

当前 CLI 只替换固定业务文件和 `package.json.name`，会原样复制模板的 `AGENTS.md`、`docs/index.md`、`docs/project.yaml` 等治理文档。实测生成项目的 `docs/project.yaml` 仍包含 `g2rain-app-template`，可能使 Agent 把业务 App 误判为模板仓库。

后续应为生成项目定义独立的文档元数据契约：至少写入真实仓库名、项目名、Profile 版本、模板来源和模板 Ref，并让 `AGENTS.md` 使用生成项目身份。修复前，创建项目后必须人工校正文档元数据，不能直接把模板身份提交到新仓库。
