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

### Environment secrets (npm-production only)

| Name | Purpose |
| --- | --- |
| `NPM_PUBLISH_TOKEN` | **Bootstrap only.** Classic npm automation/publish token for first releases before Trusted Publishing is fully wired. Store **only** as an Environment secret on `npm-production` (not a repository secret) so publish still requires Environment approval. |

After Trusted Publisher is configured for `create-g2rain-app`, delete `NPM_PUBLISH_TOKEN` and switch the publish step back to OIDC (omit / empty `NODE_AUTH_TOKEN`, keep `id-token: write`).

## npm Trusted Publishing

On npmjs.org for `create-g2rain-app`:

- GitHub Organization: `g2rain`
- Repository: `g2rain-app-cli`
- Workflow filename: `publish-npm.yml`
- Environment: `npm-production`

Target state: no long-lived npm write token. Bootstrap may use Environment `NPM_PUBLISH_TOKEN` until Trusted Publishing works. Publish workflow upgrades to `npm@^11.5.1` before `npm ci` (Trusted Publishing floor).

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
| `sync-templates.yml` | Manual: sync approved template tags into PR. |
| `publish-npm.yml` | Tag `v*`: 校验待发布包内快照、测试、打包与 smoke 后发布。Bootstrap uses Environment `NPM_PUBLISH_TOKEN`; target is OIDC Trusted Publishing. |

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
3. Configure `TEMPLATE_SYNC_TOKEN` (private templates only), `npm-production` Environment (+ optional bootstrap `NPM_PUBLISH_TOKEN` as **Environment** secret), CODEOWNERS, Trusted Publisher.
4. Run `sync-templates` workflow → review/merge PR.
5. Bump `package.json` version if needed, tag CLI `vX.Y.Z`, approve publish.
6. Smoke: `npx create-g2rain-app@X.Y.Z ...`
7. After Trusted Publishing works: remove `NPM_PUBLISH_TOKEN` and restore OIDC-only publish.
