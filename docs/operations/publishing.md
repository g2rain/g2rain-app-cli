# npm 发布

## 包结构

- npm 包：`create-g2rain-app`
- 当前版本：`0.1.0`
- 发布文件：`dist`
- bin：`create-g2rain-app`、`g2rain-app` → `dist/index.js`
- Node engines：`>=22`

模板代码不打包进 npm 包；运行时从本地路径或 GitHub 获取。因此 CLI 发布和模板发布是两个独立版本，需要显式兼容关系。

## 发布前

```bash
npm ci
npm run build
npm pack --dry-run
```

检查：

- dist/index.js 存在且首行 shebang 正确。
- tarball 只包含预期 dist、package metadata 和必要文档/许可证。
- 两个 bin 在干净目录可运行。
- 本地模板 smoke test 通过。
- 计划使用的模板 Ref 与中央 frontend-app Profile 兼容。
- package version 按兼容性升级，README/docs 与实际参数一致。
- npm registry、provenance、2FA 和发布权限符合组织要求。

当前没有 `prepublishOnly`，发布命令不会自动保证 dist 最新。发布者必须构建；后续应自动化。

## 发布后

在干净临时目录验证：

```bash
npx create-g2rain-app@<version> smoke-app --context-path smoke
```

确认包版本、模板来源、生成结果和下一步命令。npm 版本不可覆盖；发现问题发布修复版本并说明受影响的 CLI/模板组合。

## 回滚

npm 不能把已使用版本当作可变文件回滚。严重问题可 deprecate 有问题版本、发布修复版本，并在 Issues/Discussions 提示。若问题来自模板默认分支，需同时修复/固定模板来源，避免旧 CLI 继续拉取变化内容。
