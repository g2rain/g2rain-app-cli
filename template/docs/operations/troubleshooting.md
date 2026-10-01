# 故障排查

## 启动后跳到 main-shell

默认运行模式是集成意图。需要独立开发时设置 `VITE_RUN_MODE=alone` 或访问 `?mode=alone`。同时检查 `VITE_MAIN_SHELL_ORIGIN` 是否误指向当前子应用，避免跳转循环。

## 开发端口不符合 .env

Vite server 当前读取进程环境变量并回退 `3001`。在启动命令前显式设置 `VITE_SERVER_PORT`，不要只修改 `.env` 后假设 server 配置一定读取它。

## qiankun 无法挂载

- 检查 mount props 是否有 `container`、`applicationCode`、`viewId`、`instanceId`，且 `appKey === instanceId`。
- 检查 Vite base、main-shell entry 和 activeRule。
- 查看 Auth Bridge、Token 初始化、资源加载和 Router 初始化的先后错误。
- 多 Tab 问题检查是否复用了尚未 unmount 的同一个 `instanceId`。同一实例未卸载时再次 mount 会失败。

## 打开业务页时先闪一下首页 `/`

集成模式 MemoryHistory 默认落在 `/`。`main.ts` 必须在 `vueApp.mount` 之前调用 `settleInitialRoute(initialRoute)`；若先 mount 再 replace，会先画出 `Home.vue` 再切到目标页。

## 页面空白或动态路由找不到组件

- 检查 `/basis/authority/resources` 是否返回页面。
- 检查 `page.linkPath` 与 `views/route-map.ts` 的 key 完全一致。
- 正式页面使用静态 dynamic import 注册，避免依赖任意路径运行时 import。
- 检查资源接口失败是否触发了 SSO 跳转。

## 权限元素未生成

- `v-permission` 必须是静态字符串并包含冒号，例如 `v-permission="'member:add'"`。
- 页面必须存在于 route-map，生成器才会扫描对应目录。
- 运行 `npm run build:config` 后检查 `page-elements.json` Diff。
- 动态权限表达式不会被当前解析器识别。

## API 端点 JSON 不存在

这是当前实现限制。API parser 尚未接入生成主流程，也未输出 `api-endpoints.json`；不能通过重复执行命令解决。见[资源配置生成](../development/resource-generation.md)。

## 容器 502 或静态资源 404

- 检查 Gateway/IAM Host 与 Port。
- 检查构建期和运行期 Context Path 是否一致。
- 检查 `SERVER_PORT`；入口默认 80，Dockerfile EXPOSE 8080。
- 检查 Nginx rewrite 后的上游路径。
- 检查 `dist/env-config.js` 和 `index.html` 是否存在。

## SSO 回调循环

核对公开 Origin、Context Path、`VITE_REDIRECT_URI`、IAM 客户端登记值和 main-shell 网关路径。不要在日志中打印完整 Token 排查问题。独立模式必须从 `/?mode=alone` 重新登录；旧的 `sso_callback` 地址无法恢复私钥。
