# 层次与目录职责

本页是中央 [Frontend App 层次规范](https://github.com/g2rain/g2rain/blob/feature/g2rain-architectur-init/docs/architecture/profiles/frontend-app/layers.md) 在模板源码中的具体落地；中央规则定义目标方向，本页说明实际目录和模板细节。

## shared

`src/shared` 是最底层能力：环境读取、URL、JWT、随机数等无业务工具。`scripts/database.sql` 与 `config-util/config/*.json` 是构建输入/产物；生成引擎已迁至 `create-g2rain-app`（`g2rain-app generate|build-config`），不得被浏览器运行路径执行。

允许依赖第三方基础库；禁止依赖 components、platform、runtime 或 views。通用工具应保持无 Vue/Pinia/业务状态。

## components

`src/components` 放本应用仍保留的展示和基础交互能力，例如 Loading、权限指令、微前端消息协议与错误提示。通用 UI（QueryForm、RemoteSelect、TableSort 等）使用 `@g2rain/ui`。HTTP 内核和错误模型使用 `@g2rain/http` 与 `@g2rain/platform/error`，本地不再保留这两套实现。

目标上只依赖 shared 和第三方库。组件通过 props、事件、provider 或注入获得业务/平台能力，不能直接读取业务 API、业务 DTO、具体 Store 或页面文件。

## platform

`src/platform` 放同类 g2rain App 可复用的平台能力：

- `apps`：微前端协议和平台适配。
- `stores`：Token 与语言状态。
- `locale` / `i18n`：语言选择、文案加载与 Element Plus 语言包。
- `types`：平台 API、HTTP、菜单契约。

错误分类不在本目录实现，使用 `@g2rain/platform/error`。

platform 可以依赖 components/shared，但不应反向依赖某个应用的 runtime 或 views。需要应用回调时使用接口或生命周期上下文注入。

## runtime

`src/runtime` 是生成后应用的运行时组合层：

- `auth`：独立 SSO 与 Token 保证。
- `boot`：HTTP、资源、权限、路由和过期监听初始化。
- `router`：系统路由及独立/集成模式历史实现。
- `http`：组合 `@g2rain/http`、platform Token Store、应用认证失败处理、Client 注册表、Mock、IAM Key 与刷新协调；不复制公共请求内核。
- `api`：国际化、语言等应用运行所需平台接口。
- 组合根在 `main.ts` 调用一次 `createStandardSubPlatform`。Vue 与 Router 由 `@g2rain/platform/sub` 按 `instanceId` 管理，应用不再保存 `micro-shells` Map。

runtime 可依赖 platform/components/shared，不应成为跨项目 UI 组件库。与 views 的组装应由组合根注入；当前直接导入属于迁移偏差。

## views

`src/views` 是具体应用页面层，保存页面组件、业务 API、DTO/VO 类型、Mock 和组件注册表。页面可以使用所有下层能力，但页面间不应通过深层 import 形成隐式业务耦合。

模板当前包含 Home、SSO Callback，以及 dict/organ 的配套类型或 API 示例；生成具体应用后应删除无用示例并补充真实页面。

## shell

旧规范提到与 views 同级的 `shell` 页面框架层，但当前源码没有 `src/shell`。若未来加入，只负责布局、导航框架和宿主外观，不承载领域 API 或页面业务。不能在文档中把它描述为当前已有能力。

## 部署目录

- `nginx`：OpenResty 配置模板与容器入口。
- `lua`：可选签名、IAM 公钥读取和密钥目录约定。
- `Dockerfile`：Node 构建与 OpenResty 运行的多阶段镜像。
- `dist`：生成产物，已被 Git 忽略，不是源码事实来源。
