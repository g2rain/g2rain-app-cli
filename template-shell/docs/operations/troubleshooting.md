# 排障

## 开发服务器打不开 / 404

- 确认已访问带 Context Path 的地址，例如 `http://localhost:3000/admin/`。
- 检查 `.env` 是否仍含未替换的 `{{CONTEXT_PATH}}`（会导致 base 异常）。
- 端口冲突时修改 `VITE_SERVER_PORT`。

## `npm run build` 失败

- 先替换 `.env` 占位符。
- 确认 `kits/*.tgz` 存在且 `npm install` 成功。
- 查看 `vue-tsc` 报错的具体文件；布局组件是否从正确相对路径导入 store。

## Tab 打不开或关不掉

- 概览 Tab `closable: false`，关闭按钮不会渲染。
- Sidebar 仅调用 `openShellView`；业务微应用需先实现可信目录。

## 主题不生效

- 确认 `boot` 中已调用 `initThemeController`。
- 检查页面是否使用 `--g2-*` 变量而非写死颜色。

## 子应用白屏（接入后）

- 核对 `instanceId` 容器 DOM 是否存在。
- 切换 Tab 应 `inactive` 而非误 `unmount`。
- 关闭 Tab 的销毁顺序：unmount → 删 handle → `releaseInstance`。
- 对照 Appkit 生成契约与 `g2rain-main-shell` Tab 激活链。
