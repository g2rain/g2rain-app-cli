# Appkit 本地 pack 制品

Registry 未发版时，在 `g2rain-appkit` 中构建并打包，再拷贝到本目录：

```bash
cd g2rain-appkit
npm ci
npm run build --workspace @g2rain/http
npm run build --workspace @g2rain/platform
npm run build --workspace @g2rain/theme
npm run build --workspace @g2rain/ui
npm pack --workspace @g2rain/http
npm pack --workspace @g2rain/platform
npm pack --workspace @g2rain/theme
npm pack --workspace @g2rain/ui
```

将生成的 `g2rain-http-*.tgz`、`g2rain-platform-*.tgz`、`g2rain-theme-*.tgz`、`g2rain-ui-*.tgz` 放入本目录后：

```bash
npm install
```

`package.json` 使用 `file:kits/*.tgz` 依赖。**不以 `npm link` 作为验收依据。**

## Docker / 发布

在切换到正式 npm registry（偏差 TPL-004）之前，**应将本目录 `*.tgz` 提交到 Git**，以便 `g2rain-deploy` 克隆后 `./build.sh` 能执行 `npm ci`。

`Dockerfile` 会在 `npm install` 之前 `COPY kits`；缺少 tarball 会报 `ENOENT .../kits/g2rain-*.tgz`。

不要将真实 Token、私钥或生产 Secret 放入本目录。
