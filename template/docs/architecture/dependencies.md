# 依赖规则

公共依赖规则以中央 [Frontend App Profile](https://github.com/g2rain/g2rain/tree/feature/g2rain-architectur-init/docs/architecture/profiles/frontend-app) 为准。本页补充模板的导入方式和当前迁移要求，偏离必须登记在[架构偏差](deviations.md)。

## 目标方向

```text
views → runtime → platform → components → shared
```

这是一条职责下降方向，不要求每层必须经过相邻层。views 可以直接使用 platform/components/shared，runtime 可以直接使用 components/shared。组合根 `src/main.ts` 和 `src/App.vue` 负责应用装配，可以引用被装配的各层。

## 禁止事项

- shared 引用 components、platform、runtime 或 views。
- components 直接引用 platform Store、runtime 类型或 views API。
- platform 直接调用应用 runtime、业务 API 或 views。
- runtime 把具体业务页面当作平台能力输出。
- views 之间深度导入内部组件、API 或私有类型。
- 外部模块绕过 `index.ts` 深度导入可复用模块内部实现。

## 边界交互

上层能力需要被下层调用时，优先使用：

1. 下层声明接口或 provider，上层注册实现。
2. 组合根传入生命周期回调或上下文。
3. props、事件或类型安全的消息协议。
4. 将真正通用的类型下沉到无业务依赖的位置。

不要用路径别名掩盖反向依赖；`@/`、`@platform`、`@runtime`、`@shared` 只改善导入可读性，不改变架构方向。

## Public API

- components/platform/runtime 子模块通过 `index.ts` 暴露稳定接口。
- `index.ts` 只导出调用方需要的组件、函数和类型。
- 私有解析器、内部 Store 结构和具体适配实现不应被上层深度依赖。
- 修改公共导出前检查模板生成项目和其他 App 是否会受影响。

## 当前状态

当前源码尚未完全满足目标方向。现有反向依赖不能在无迁移设计的情况下粗暴删除，也不能被后续需求继续扩大；具体位置和推荐演进见[架构偏差](deviations.md)。
