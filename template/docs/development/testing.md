# 测试策略

## 当前基线

当前仓库只定义了构建验证：

```bash
npm run build
```

它覆盖 Vue/TypeScript 类型检查和 Vite 打包，但不覆盖单元测试、浏览器 E2E、lint、生成器快照或容器联调。贡献说明必须准确区分“构建通过”和“功能已测试”。

当前构建可以成功，但仍报告循环分块、主包体积、MockJS `eval` 和经典 `env-config.js` 等警告。它们登记在[架构偏差](../architecture/deviations.md)，后续修改相关模块时必须确认警告是否减少或恶化。

## 按变化选择验证

| 变化 | 最低验证 |
| --- | --- |
| 类型、组件、页面 | `npm run build`，浏览器验证主要交互和错误路径 |
| 路由/资源 | 独立与 qiankun 模式，route-map、资源接口和权限状态 |
| Token/HTTP/SSO | 登录、过期、刷新失败、回调、集成 Token 更新和日志脱敏 |
| i18n | 至少两种语言、独立切换、主应用 locale update 和回退文案 |
| 代码生成器 | 临时表验证全量和 `--no-*`，Review 输出与重复执行 |
| 资源生成器 | 页面/权限新增、删除、去重、动态表达式不生成和 JSON Diff |
| Docker/Nginx/Lua | 镜像构建、Context Path、静态资源、Gateway/IAM 代理、运行时 SSO 注入 |

## 建议补齐

- 使用 Vitest 覆盖 shared 工具、解析器、Store 和权限规则。
- 使用 Vue Test Utils 覆盖通用组件的 props/emits/失败回滚。
- 使用 Playwright 覆盖独立 SSO、qiankun mount/update/unmount 和多 Tab。
- 为生成器建立临时目录或快照测试，避免覆盖仓库页面。
- 为依赖方向增加可维护的工程检查；它应服务开发者和 CI，而不是只供 Agent 使用。

新增测试框架属于项目变更，需要同步 package scripts、文档和 CI；不能只写文档声称已有。
