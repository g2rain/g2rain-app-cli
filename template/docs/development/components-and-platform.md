# Components、Platform、Runtime 与 Shared

## Components

当前通用组件包括：

| 模块 | 能力 | 注意事项 |
| --- | --- | --- |
| `permission` | 页面元素和 API permission provider、Vue 指令 | 前端判断不替代后端鉴权 |
| `loading` | 全局 Loading 引用管理 | 异常和取消路径必须关闭 |
| `micro-app` | 主子应用事件、消息工厂、类型守卫和 Window 适配 | 新消息需要版本/兼容性和清理设计 |
| `ErrorMessage` | 页面错误提示；StatusSwitch 的 `notifyStatusSwitch*` | 错误模型用 `@g2rain/http` 的 `G2rainHttpError` 和 `@g2rain/platform/error`，不要再在应用里复制一套 AppError |

通用 UI（`QueryForm`、`TableSort`、`RemoteSelect` / Organ / Dict / StatusSwitch）直接依赖 `@g2rain/ui`，不要经 `@/components` 转发。公共包接入：`@g2rain/theme` + `@g2rain/ui` + `@g2rain/platform` + `@g2rain/http`，均使用仓内 `kits/*.tgz`（见该目录 README），避免 Docker 构建依赖同级 `g2rain-appkit`。生命周期内核使用 `@g2rain/platform/sub` 的 `createStandardSubPlatform`，应用不再保留 `@g2rain/runtime`。

HTTP 公共内核直接使用 `@g2rain/http`。应用专属的 Client 注册表、Mock、IAM Key、Loading 组合和刷新协调位于 `src/runtime/http`；页面从 `@runtime/http` 获取 Client，不再存在 `src/components/http` 兼容层。装配入口为 `runtime/http/setup.ts` 的 `initHttp()`。

代码生成 / 资源配置：`create-g2rain-app`（`file:../g2rain-app-cli`）；本仓仅保留 `scripts/database.sql` 与 `config-util/config` 产物。

新增通用组件前确认至少有跨页面或跨项目复用价值，并通过 props、emits、slots、provider 暴露能力。不要把某个服务路径、业务 DTO 或 Store 写入组件内核。

## Platform

platform 管理 g2rain 前端平台语义：

- `apps`：qiankun props、事件和生命周期适配。
- `stores`：Token/Client 与 Locale 状态。
- `i18n`：应用文案加载、翻译和全局注入。
- `locale`：语言持久化、HTTP Header 与 Element Plus 包。
- `types`：分页、结果、菜单、HTTP 等平台契约。
- 错误展示留在 `components/ErrorMessage`。错误分类由 `@g2rain/platform/error` 和 `@g2rain/http` 负责。

平台层不能知道具体页面目录、业务表字段和领域操作。远程 API 实现应由 runtime 注入或注册，而不是 platform 直接引用应用 API。

## Runtime

runtime 是每个生成项目可定制的组合层，不等同通用组件库。它将平台能力连接到该应用的 SSO、Gateway、资源接口、路由和页面注册。

修改 runtime 时必须覆盖独立/集成两种模式和 mount/update/unmount 生命周期。同一份 JavaScript 可以同时挂多个 `instanceId`；宿主必须显式下发 `applicationCode`/`viewId`/`instanceId`，`appKey` 须等于 `instanceId`。禁止回退为单例路由，也不要在单个 Tab 的 `unmount` 里销毁共享 HTTP Client 或 Token 监听。

## Shared

shared 只保存无业务工具与构建期输入/产物路径约定。运行时 shared 不能导入 Vue Store 或页面；生成引擎在 `create-g2rain-app`，不能被浏览器入口打包执行。

## 能力迁移判断

```text
只服务一个页面 → views
服务当前应用多个页面但含应用语义 → runtime
服务多个同类 g2rain App 且无业务语义 → platform
纯 UI/交互/协议能力 → components
无框架、无业务的基础函数 → shared
```

下沉前必须先去除业务依赖；发现下层出现业务逻辑时应上移，而不是增加更多跨层别名。
