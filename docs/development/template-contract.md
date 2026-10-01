# 模板契约

## 模板来源

- App 源仓：`https://github.com/g2rain/g2rain-app-template`
- Shell 源仓：`https://github.com/g2rain/g2rain-shell-template`
- 发布默认：npm 包内 `template/`、`template-shell/`、`template-shell-legacy/` 快照
- 本地覆盖：`G2RAIN_TEMPLATE_PATH` / `G2RAIN_SHELL_TEMPLATE_PATH`（开发排障，不参与正式发布）
- 快照治理：[template-snapshots.md](../template-snapshots.md)

正式发布路径不再 Git clone 默认分支；同一 `create-g2rain-app` 版本对应固定、可追溯到 Git tag 的模板快照。

## 必需文件

CLI 至少依赖模板存在 `package.json`；当前缺失时 create 直接失败。占位替换文件按[project.yaml](../project.yaml)清单维护。

快照根目录由同步流程写入：

- `.g2rain-template-meta.json`（schemaVersion 2）
- `.g2rain-template-snapshot.md`

二者进入 npm 包，但**不得**复制进用户项目。

## 复制排除

当前排除 `.git`、`.idea`、`.vscode`、`node_modules`、`dist`、`.DS_Store`、`package-lock.json`、本地 env（`.env.local` / `.env.*.local`）、密钥扩展名（`.pem` / `.der` / `.p12` / `.jks`），`lua/keys` 下除 `README.md` 外的文件，以及：

- `.g2rain-template-meta.json`
- `.g2rain-template-snapshot.md`

Shell 同步额外排除源仓 `legacy-overlay/`（写入独立 `template-shell-legacy/`）和本地 `.tgz` 包制品；AppKit 依赖应使用已发布的 npm 版本。

不复制 lockfile 意味着生成项目首次运行 `npm install` 并重新解析依赖版本。

## 占位符

- `{{PROJECT_NAME}}`：npm package name、应用编码和镜像/文档示例等模板位置。
- `{{CONTEXT_PATH}}`：不带首尾 `/` 的 URL 路径段。
- Shell：`{{DEV_SERVER_PORT}}`。

## 生成项目文档身份

生成结果至少应包含：

- 新项目的名称与仓库标识；
- 采用的中央 Profile 及版本；
- CLI 版本、模板仓库、**tag** 与 **commit**（`generation.template`）；
- 适用于业务项目的 Agent 审核入口。

当前实现通过明确的身份文件清单转换 `package.json`、`README.md`、`AGENTS.md`、`docs/project.yaml` 等。

## Shell 模板与可选 legacy 覆盖层

- 发布默认：包内 `template-shell/`（无 legacy）
- 可选：`--with-legacy` 合并 `template-shell-legacy/`
- identity：`docs/project.yaml` 的 `generation.legacyCompatibility: true|false`
- 验证：默认不得含 `src/platform/legacy/`；启用后必须含 registry、adapter、README、边界测试与 `shell-extensions`

详见 shell-template [`docs/architecture/legacy-compatibility-upgrade.md`](https://github.com/g2rain/g2rain-shell-template/blob/main/docs/architecture/legacy-compatibility-upgrade.md)。

## 契约变更流程

```text
中央 Profile / Appkit 规则变化
→ 更新 app-template / shell-template 源仓并打 tag + Release
→ GitHub Actions sync-templates（输入 tag）创建同步 PR
→ 审查 meta / hash / tarball 冒烟 → 合并
→ 为 CLI 打 tag → publish-npm（OIDC）
```

本地 `npm run sync:templates` 仅排障，且需要 `G2RAIN_ALLOW_LOCAL_SYNC=1` 与显式 `*_TEMPLATE_REF`。
