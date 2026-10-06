# GitHub secrets and environments for template governance

## Secrets

| Name | Scope | Purpose |
| --- | --- | --- |
| `TEMPLATE_SYNC_TOKEN` | repository or org | Optional. PAT / GitHub App with **`contents: read` only** on `g2rain-app-template` and `g2rain-shell-template`. Needed when those repos are private (`GITHUB_TOKEN` cannot read sibling private repos). **Omit** (or leave unset) when the template repos are public; workflows fall back to `github.token`. |

Do not grant this token write, workflow, or admin scopes.

## Environments

| Name | Used by | Settings |
| --- | --- | --- |
| `npm-production` | `publish-npm.yml` publish job | Required reviewers (Release Maintainers only). Restrict to protected tags from protected branches. |

`npm-production` 不保存 npm 写入 Token。发布使用 GitHub Actions OIDC（`id-token: write`）和 npm Trusted Publishing；若历史上存在 `NPM_PUBLISH_TOKEN`，应删除，不得转存为 Repository Secret。

## npm Trusted Publishing

On npmjs.org for `create-g2rain-app`:

- GitHub Organization: `g2rain`
- Repository: `g2rain-app-cli`
- Workflow filename: `publish-npm.yml`
- Environment: `npm-production`

当前状态：不使用长期 npm 写入 Token。Publish workflow upgrades to `npm@^11.5.1` before `npm ci`，并以 OIDC `--provenance` 发布。

Local `npm publish` is blocked by `scripts/assert-ci-publish.mjs` (`prepublishOnly`). Local verification is `npm run verify:template-snapshots && npm pack --dry-run`.

## Tag protection (template repos + CLI)

On `g2rain-app-template`, `g2rain-shell-template`, and `g2rain-app-cli`, add a Ruleset for tags matching `v*`:

- Allow create: maintainers only
- Block force updates and deletions
- Optionally require signed commits / Releases

CLI sync resolves `refs/tags/<ref>` only; a branch with the same name is rejected.

## Workflows

| Workflow | Role |
| --- | --- |
| `ci.yml` | Every PR / push to `main`/`develop`: `npm ci`, `npm test`, `npm pack --dry-run`, local snapshot meta/hash (no cross-repo rebuild). **Required** branch-protection check. |
| `verify-template-snapshots.yml` | Path-filtered + push: 校验包内模板快照的元数据、内容 Hash 与协议边界；不拉取外部模板仓。 |
| `sync-templates.yml` | Manual: sync approved template tags to `chore/sync-templates`; open/merge PR by hand. |
| `publish-npm.yml` | Tag `v*`: 校验待发布包内快照、测试、打包与 smoke 后，以 OIDC Trusted Publishing 发布。 |

- Third-party Actions are pinned to commit SHAs.
- `publish-npm.yml` default `contents: read`; `contents: write` is only on the post-publish Release job.
- 模板源码仅在 `sync-templates.yml` 按操作者输入的受保护 Tag checkout；日常校验与发布不依赖历史源码提交仍可被远端访问。

## CODEOWNERS teams

Create org teams referenced in `.github/CODEOWNERS`:

- `@g2rain/template-maintainers`
- `@g2rain/release-maintainers`

Enable branch protection:

- Required status check: **CI / test**
- Require CODEOWNERS review for `template/**`, `template-shell/**`, `template-shell-legacy/**`

## First release checklist

1. Merge tooling PR (scripts, workflows, docs); confirm **CI / test** is a required check.
2. Create protected tags + Releases on both template repos.
3. Configure `TEMPLATE_SYNC_TOKEN`（仅私有模板需要）、`npm-production` Environment、CODEOWNERS 和 Trusted Publisher；不要配置 npm 写入 Token。
4. Run `sync-templates` workflow → manually open PR from `chore/sync-templates` → review/merge.
5. Bump `package.json` version if needed, tag CLI `vX.Y.Z`, approve publish.
6. Smoke（推荐本机）：`npm install -g create-g2rain-app@X.Y.Z` 后 `g2rain-app app ...` / `g2rain-app shell ...`；CI 用不污染全局的 `npx create-g2rain-app@X.Y.Z ...`。
