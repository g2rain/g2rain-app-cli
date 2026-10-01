# 测试策略

## 当前基线

```bash
npm test
```

GitHub Actions `ci.yml` 在每个 PR 与 `main`/`develop` push 上执行：`npm ci` → `npm test` → `npm pack --dry-run` → `npm run verify:template-snapshots`（仅 meta/hash/结构，不切换源仓、不强制跨仓重建）。跨仓重建留给 `verify-template-snapshots.yml`。

`npm test` 先编译 CLI（含复制 ejs 模板），再运行 Node test runner：

| 文件 | 覆盖 |
| --- | --- |
| `test/scaffold-identity.test.mjs` | frontend-app 脚手架身份改写 |
| `test/family-create.test.mjs` | app/shell 族解析、帮助、默认族提示、双模板脚手架 |
| `test/dispatch.test.mjs` | 子命令路由、family 别名、未知选项 |
| `test/generate.test.mjs` | SQL → views / route-map |
| `test/build-config.test.mjs` | route-map + v-permission → JSON |
| `test/resolve-template.test.mjs` | `template/` / `template-shell/` 与 env 覆盖 |
| `test/template-snapshots.test.mjs` | meta v2、树哈希、tag 解析、marker 排除 |

## Smoke Test（create）

1. 构建 CLI（确保已 `npm run sync:templates`）。
2. 临时目录：`create-g2rain-app app ...` 与 `create-g2rain-app shell ...`。
3. 检查 `family`、排除项、template ref；shell 检查 docs 树与无硬编码业务 entry。
4. 可选：用 `G2RAIN_TEMPLATE_PATH` / `G2RAIN_SHELL_TEMPLATE_PATH` 覆盖再验。

## 按变化验证

| 变化 | 覆盖场景 |
| --- | --- |
| 参数解析 | app/shell/create/generate/build-config、`--family`、未知参数、`--help` |
| generate | 最小 SQL、`--no-*`、路径 flag |
| build-config | 多权限、空页面目录警告、输出三 JSON |
| 模板定位 | 包内 template / template-shell、族 env、缺失时报错 |
| 发布 | shebang、两个 bin、npm pack 含 dist + template + template-shell、无 node_modules |
