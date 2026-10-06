# npm 发布

## 包结构

- npm 包：`create-g2rain-app`
- 当前版本：`1.0.1`（本地维护版本，尚未发布）
- 发布文件：`dist`、`template`、`template-shell`、`template-shell-legacy`、`LICENSE`、`README.md`
- bin：`create-g2rain-app`、`g2rain-app` → `dist/index.js`
- Node engines：`>=22`

内嵌模板快照可追溯到源仓 Git tag（见 [template-snapshots.md](../template-snapshots.md)）。`docs/` 不进入 npm 包。

`generate` 使用的 EJS 在 `dist/tools/generate/templates`，与应用模板分离。

## 发布前（仓库侧）

1. Appkit（如需）已发布确定版本。
2. App / Shell 模板已打受保护 tag 并完成 Release。
3. 手动触发 `.github/workflows/sync-templates.yml`，输入至少一个模板 tag。
4. 人工从 `chore/sync-templates` 创建（或刷新）同步 PR 并合并（meta v2、contentSha256、无 legacy 泄漏、tarball 冒烟）。
5. 确认 `npm run verify:template-snapshots` 与 `npm test` 通过。

**不要**在发布 workflow 中修改模板或 bump 版本；也**不要**依赖本地 `npm run sync:templates` 作为正式路径。

本地只允许打包验证，**禁止** `npm publish`：

```bash
npm run verify:template-snapshots
npm pack --dry-run
```

`prepublishOnly` 在非 GitHub Actions 环境会失败。正式发布只走 GitHub Actions 的 npm Trusted Publishing：`npm-production` Environment 负责人工审批，OIDC 负责认证与 provenance，不使用长期 npm Token。

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
2. `npm ci`、包内 snapshot verify、`npm test`、`prepublishOnly`、`npm pack --dry-run`。
3. 从 tarball 冒烟生成并构建 App、默认 Shell、`--with-legacy` Shell。
4. 使用 `npm-production` Environment（人工审批）与 npm Trusted Publishing（OIDC + `--provenance`）发布。工作流在 `npm ci` 前安装 `npm@^11.5.1`，不读取 npm Token。
5. 创建 GitHub Release（CLI 版本、模板 tag/SHA、legacy 说明、AppKit 依赖、破坏性变更）。

Trusted Publisher 绑定（目标态）：

- Organization：`g2rain`
- Repository：`g2rain-app-cli`
- Workflow：`publish-npm.yml`
- Environment：`npm-production`

不保存 `NPM_PUBLISH_TOKEN`、`NODE_AUTH_TOKEN` 或其他长期 npm 写入 Token。本地 `npm publish` 被拒绝。

## 发布后

本机日常用法（推荐）：

```bash
npm install -g create-g2rain-app@<version>
g2rain-app --version
g2rain-app app smoke-app --context-path smoke
g2rain-app shell smoke-shell --context-path admin
```

CI / 干净临时目录、不污染全局时用固定版本 `npx`：

```bash
npx create-g2rain-app@<version> app smoke-app --context-path smoke
npx create-g2rain-app@<version> shell smoke-shell --context-path admin
```

确认生成项目 `docs/project.yaml` 含 `generation.template.tag` 与 `commit`，且无 `.g2rain-template-*` 文件。用户侧安装说明见 [usage.md](../development/usage.md)。

## 回滚

npm 不能覆盖已发布版本。严重问题可 deprecate、发布修复版本，并在 Issues 提示。模板问题在源仓修复并打新 tag 后重新 sync + 发布新的 CLI 版本。
