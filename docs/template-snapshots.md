# 模板快照治理

本文件描述 CLI 仓内嵌模板快照的同步、校验与发布契约。**本文件不进入 npm 包**（`package.json#files` 不含 `docs/`）。

## 目录

| CLI 目录 | 源仓 | 用途 |
| --- | --- | --- |
| `template/` | `g2rain-app-template` | `frontend-app` |
| `template-shell/` | `g2rain-shell-template`（排除 `legacy-overlay/`） | 默认 `frontend-shell` |
| `template-shell-legacy/` | `g2rain-shell-template/legacy-overlay/` | 仅 `shell --with-legacy` |

模板仓是事实来源。CLI 内目录是已批准 Git tag 的发布快照，不得手改。

## 快照标记

每个快照根目录包含：

- `.g2rain-template-meta.json`（schemaVersion 2，进 npm）
- `.g2rain-template-snapshot.md`（人类可读禁止编辑提示，进 npm）

脚手架复制时**必须排除**上述两个文件；生成项目不得出现它们。

### Meta v2 字段

| 字段 | 规则 |
| --- | --- |
| `schemaVersion` | `2` |
| `managed` | `true` |
| `family` | `frontend-app` \| `frontend-shell` |
| `kind` | `app-base` \| `shell-base` \| `shell-legacy-overlay` |
| `sourceRepository` | 模板源 HTTPS URL |
| `sourceRef` | 受保护 Git tag（`vX.Y.Z` 或预发布后缀） |
| `sourceCommit` | 完整 40 位 SHA，禁止 `unknown` |
| `contentSha256` | `sha256:<hex>` 确定性树哈希 |
| `syncedAt` | 审计时间，不参与内容比对 |
| `syncWorkflow` | `.github/workflows/sync-templates.yml` |

禁止：`main` / `master` / 分支名 / 缩短 SHA / 本地路径。

## 树哈希

`scripts/template-tree-hash.mjs`：

1. 递归文件，POSIX 相对路径字典序。
2. 排除 meta、snapshot.md、`.git`、`node_modules`、`dist`。
3. 对每个文件写入：路径 + NUL + 内容 + NUL。
4. 遇 symlink 失败。
5. 与 sync 使用同一 [`scripts/lib/template-sync-filter.mjs`](../scripts/lib/template-sync-filter.mjs) 过滤规则重建比对。

## 同步

正式同步由 GitHub Actions `sync-templates` 创建 PR，**不**直推默认分支、不发 npm。

本地排障同步：

```bash
set G2RAIN_ALLOW_LOCAL_SYNC=1
set G2RAIN_APP_TEMPLATE_REF=vX.Y.Z
set G2RAIN_SHELL_TEMPLATE_REF=vA.B.C
npm run sync:templates
```

若上游尚无正式 tag，可用 `node scripts/bootstrap-local-template-tags.mjs` 创建本地 bootstrap tag 并同步（仅开发；正式发布前必须换成受保护上游 tag）。

未设置 `G2RAIN_ALLOW_LOCAL_SYNC=1` 时本地 sync 失败。GHA 中 `GITHUB_ACTIONS=true` 时无需该开关。

环境变量：

| 变量 | 含义 |
| --- | --- |
| `G2RAIN_TEMPLATE_SOURCE` | App 模板 checkout 目录 |
| `G2RAIN_SHELL_TEMPLATE_SOURCE` | Shell 模板 checkout 目录 |
| `G2RAIN_APP_TEMPLATE_REF` | App tag |
| `G2RAIN_SHELL_TEMPLATE_REF` | Shell tag |

Shell sync 缺少 `legacy-overlay/` 时失败；`template-shell/` 不得含 legacy 运行文件。

## 校验

```bash
npm run verify:template-snapshots
```

CI（`GITHUB_ACTIONS` 或 `G2RAIN_VERIFY_REQUIRE_REBUILD=1`）还必须能按 meta 的 tag/commit **从已经停在该 SHA 的干净 checkout** 重建并 diff。verify **不会**对源仓执行 `git checkout`；HEAD 不一致时失败或跳过重建。

通用 CLI 回归由 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) 在每个 PR 上跑 `npm test` 与 `npm pack --dry-run`；跨仓重建留给 `verify-template-snapshots.yml`。

## 发布顺序

1. 发布确定版本的 Appkit（如需要）
2. App / Shell 模板打 tag + Release
3. 手动触发 CLI `sync-templates`（至少一个 tag）
4. 审查并合并同步 PR
5. 为 CLI 打 `v*` tag → `publish-npm`（OIDC Trusted Publishing + `npm-production` 审批）

详见 [publishing.md](operations/publishing.md)。
