# npm 发布

## 包结构

- npm 包：`create-g2rain-app`
- 当前版本：`1.0.0`
- 发布文件：`dist`、`template`、`template-shell`、`template-shell-legacy`、`LICENSE`、`README.md`
- bin：`create-g2rain-app`、`g2rain-app` → `dist/index.js`
- Node engines：`>=22`

内嵌模板快照可追溯到源仓 Git tag（见 [template-snapshots.md](../template-snapshots.md)）。`docs/` 不进入 npm 包。

`generate` 使用的 EJS 在 `dist/tools/generate/templates`，与应用模板分离。

## 发布前（仓库侧）

1. Appkit（如需）已发布确定版本。
2. App / Shell 模板已打受保护 tag 并完成 Release。
3. 手动触发 `.github/workflows/sync-templates.yml`，输入至少一个模板 tag。
4. 审查并合并同步 PR（meta v2、contentSha256、无 legacy 泄漏、tarball 冒烟）。
5. 确认 `npm run verify:template-snapshots` 与 `npm test` 通过。

**不要**在发布 workflow 中修改模板或 bump 版本；也**不要**依赖本地 `npm run sync:templates` 作为正式路径。

本地只允许打包验证，**禁止** `npm publish`：

```bash
npm run verify:template-snapshots
npm pack --dry-run
```

`prepublishOnly` 在非 GitHub Actions 环境会失败。正式发布走 GitHub Actions；首发可用 Environment Secret `NPM_PUBLISH_TOKEN`（挂在 `npm-production`，带人工审批），目标态切回 OIDC Trusted Publishing。

本地排障同步：

```bash
# PowerShell
$env:G2RAIN_ALLOW_LOCAL_SYNC='1'
$env:G2RAIN_APP_TEMPLATE_REF='vX.Y.Z'
$env:G2RAIN_SHELL_TEMPLATE_REF='vA.B.C'
npm run sync:templates
npm run verify:template-snapshots
```

## 发布执行

由 `.github/workflows/publish-npm.yml` 在推送 `v*` tag 时执行：

1. 校验 Git tag `vX.Y.Z` 与 `package.json.version` `X.Y.Z` 一致。
2. `npm ci`、完整 snapshot verify（含源仓重建）、`npm test`、`prepublishOnly`、`npm pack --dry-run`。
3. 从 tarball 冒烟生成并构建 App、默认 Shell、`--with-legacy` Shell。
4. 使用 `npm-production` Environment（人工审批）发布：首发引导用 Environment Secret `NPM_PUBLISH_TOKEN`；Trusted Publishing 就绪后改为 OIDC（无长期 Token）。工作流在 `npm ci` 前安装 `npm@^11.5.1`。
5. 创建 GitHub Release（CLI 版本、模板 tag/SHA、legacy 说明、AppKit 依赖、破坏性变更）。

Trusted Publisher 绑定（目标态）：

- Organization：`g2rain`
- Repository：`g2rain-app-cli`
- Workflow：`publish-npm.yml`
- Environment：`npm-production`

`NPM_PUBLISH_TOKEN` 只放在 Environment，不放仓库 Secret。本地 `npm publish` 被拒绝。

## 发布后

在干净临时目录验证：

```bash
npx create-g2rain-app@<version> app smoke-app --context-path smoke
npx create-g2rain-app@<version> shell smoke-shell --context-path admin
```

确认生成项目 `docs/project.yaml` 含 `generation.template.tag` 与 `commit`，且无 `.g2rain-template-*` 文件。

## 回滚

npm 不能覆盖已发布版本。严重问题可 deprecate、发布修复版本，并在 Issues 提示。模板问题在源仓修复并打新 tag 后重新 sync + 发布新的 CLI 版本。
