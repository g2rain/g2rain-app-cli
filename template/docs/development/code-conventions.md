# 代码规范

## TypeScript 与 Vue

- 使用 Vue 3 Composition API 和 `<script setup lang="ts">`。
- 与 `defineModel` / 整对象 `v-model` 双向绑定的状态优先使用 `ref`（例如 `QueryForm` 的 `baseQueryForm`）；不要用 `const reactive` 承接整对象赋值。
- 通用 UI（`QueryForm`、`TableSort`、`RemoteSelect` 等）从 `@g2rain/ui` 导入，不经 `@/components` 转发。
- 仅在「只改对象内部字段、不整对象替换」时使用 `reactive`。
- 不新增 `.js` / `.jsx` 业务文件；`tsconfig` 已排除它们。
- 保持 `strict`，公共函数、props、emits、API 入参与返回值显式声明类型。
- 新代码优先 `unknown`、泛型和类型守卫，不新增无边界 `any`。
- 第三方库或 Window 扩展确需 `any` 时，把断言限制在适配器边界并写明原因。
- 异步副作用明确处理错误，不使用未等待 Promise 隐藏启动失败。

## 分层与导入

- 遵守[依赖规则](../architecture/dependencies.md)。路径别名不能成为跨层捷径。
- 可复用模块从 `index.ts` 导入，避免调用方依赖内部文件布局。
- 业务 API、DTO、枚举和流程留在 views/runtime，不能下沉到通用 components。
- 需要反向协作时使用 provider、props、事件或组合根注入。
- 当前偏差不得扩散；触及相关代码时优先缩小依赖面，并更新偏差状态。

## API 与错误

- 页面 API 使用 `getHttpClient('default')`，认证和文档等特殊场景使用已定义 Client 类型。
- API 路径保持以 `/` 开头，业务服务前缀与 Gateway 路由约定一致。
- `api.ts` 负责传输调用，页面组件不直接拼装 Axios 配置。
- 使用稳定错误类型和用户可理解提示；不要依赖后端异常文本判断权限或状态。
- 前端权限只控制体验，后端必须重新鉴权。

## 状态、认证与多实例

- 集成模式 Token 经 Auth Bridge 定向消息写入，不经公开 props，也不建立冲突的本地认证状态。
- 独立模式才执行完整 SSO 和本地持久化链路。
- qiankun 按 `instanceId` 隔离 Vue 和 Router；`appKey` 仅作须等于 `instanceId` 的迁移期别名。不得用单一全局 Router/Vue 实例覆盖多个 Tab。
- mount、update、unmount 的监听、Watcher、Router 和 DOM 操作必须配对。
- 不在日志中输出完整 Token、Client 私钥或用户敏感资料。

## 国际化

- 模板使用 `$t('MESSAGE_CODE', '默认文案')`，脚本使用平台 `t` 函数。
- 公共文案 Tag 在前、应用 Tag 在后，允许应用覆盖同名编码。
- 页面新增用户可见文案时评估是否需要 message code；不能只在一种语言环境验证。

## 注释和命名

- 注释解释业务/架构原因，不重复代码字面行为。
- 组件 PascalCase，函数/变量 camelCase，常量可使用 UPPER_SNAKE_CASE。
- 类型名体现用途，例如 `XxxQuery`、`XxxPayload`、`XxxVo`，不要用含混 `Data` 传播跨层。
- 删除已失效注释和重复说明；文档路径必须对应当前源码。
