# 安全边界

## 路径

- 项目名和模板路径都视为不可信输入。
- 最终目标必须解析为预期父目录内的直接子目录，不接受绝对路径、`..`、分隔符逃逸或平台保留名。
- 不覆盖已有目录；临时目录清理只针对本次创建且已验证的路径。
- 明确符号链接策略，避免复制时越过模板根目录或写入目标外部。

## 外部命令与网络

- create 默认使用包内模板，不发起 Git clone 或网络下载。
- `G2RAIN_TEMPLATE_PATH` / `G2RAIN_TEMPLATE_SOURCE` 只作为文件系统路径，不作为 shell 片段；外部命令一律用参数数组进程 API。
- 不自动执行模板内脚本、postinstall 或任意命令，除非用户明确同意且安全模型完整。

## 模板供应链

- 不复制 `.git`、node_modules、dist、密钥、生产配置、本机状态，以及 `.g2rain-template-meta.json` / `.g2rain-template-snapshot.md`。
- 同一 CLI 版本绑定包内三份快照；meta schema v2 记录 Git tag、完整 commit 与 `contentSha256`。正式同步仅通过 `sync-templates` workflow；禁止手改 `template*`。
- 生成后依赖安装仍执行第三方 package 生命周期脚本，开发者应审查 lockfile、registry 和依赖来源。
- npm 发布仅允许 GitHub Actions OIDC Trusted Publishing + `npm-production` 人工审批；本地 `prepublishOnly` / `npm publish` 失败。检查 tarball 不含 `node_modules` 与源码外 Secret。详见 [github-release-governance.md](../operations/github-release-governance.md)。
- 快照校验脚本不得切换相邻模板仓的 Git HEAD；重建使用 CI `.sources/*` 或已停在目标 commit 的 clone/worktree。

## 输入与日志

- 项目名和 Context Path 使用允许列表校验，并在错误中显示安全、可操作提示。
- 环境变量 `G2RAIN_TEMPLATE_PATH` 只作为路径，不作为 shell 片段。
- 不打印 npm Token、Git 凭据、私有仓库 URL 中的 Secret 或完整环境。
- 生成项目不得从模板继承生产 Token、私钥、Cookie 或用户数据。

## 漏洞报告

按根目录 [SECURITY.md](../../SECURITY.md) 私下报告，说明受影响的是 CLI、模板还是生成项目，不创建包含利用细节的公开 Issue。
