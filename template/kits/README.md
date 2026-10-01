# 本地 `@g2rain/*` 制品（kits）

本目录存放经 `npm pack` 生成的公共包压缩包，供本仓库在无同级 `g2rain-appkit` 源码、以及 Docker 构建上下文内安装。

当前纳入 Git 的包：

| 文件 | 包名 |
| --- | --- |
| `g2rain-http-0.1.0.tgz` | `@g2rain/http` |
| `g2rain-ui-0.1.1.tgz` | `@g2rain/ui` |
| `g2rain-theme-0.1.0.tgz` | `@g2rain/theme` |
| `g2rain-platform-0.1.0.tgz` | `@g2rain/platform` |

`package.json` 统一使用 `file:kits/...`，避免依赖仓外路径（Docker 内 `../g2rain-appkit` 不存在）。

## 更新步骤

在已安装 Node `>=22` 的机器上：

```bash
cd ../g2rain-appkit
npm ci
npm run build --workspace @g2rain/http
npm run build --workspace @g2rain/theme
npm run build --workspace @g2rain/ui
npm run build --workspace @g2rain/platform
npm pack --workspace @g2rain/http --pack-destination ../g2rain-app-template/kits
npm pack --workspace @g2rain/ui --pack-destination ../g2rain-app-template/kits
npm pack --workspace @g2rain/theme --pack-destination ../g2rain-app-template/kits
npm pack --workspace @g2rain/platform --pack-destination ../g2rain-app-template/kits

cd ../g2rain-app-template
npm install ./kits/g2rain-http-0.1.0.tgz ./kits/g2rain-ui-0.1.1.tgz ./kits/g2rain-theme-0.1.0.tgz ./kits/g2rain-platform-0.1.0.tgz
```

版本号变化时同步修改本 README、`package.json` 与 lockfile。
