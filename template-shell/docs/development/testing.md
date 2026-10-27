# 测试策略

## 基线

| 层级 | 做法 |
| --- | --- |
| 类型 / 构建 | `npm run build`（`vue-tsc --noEmit` + `vite build`） |
| 回归测试 | `npm test`（Node.js 内置 test runner，TypeScript 编译真实模块并注入依赖；Workspace 测试编译真实 SFC，使用 Vue renderer 验证 KeepAlive） |
| 布局交互 | 手动：打开/切换/关闭 Shell Tab；概览不可关闭 |
| 主题 | 切换 light/dark 并刷新后仍保持 |
| 契约 | 变更 Platform Main / HTTP 后按 Appkit 生成契约第 10 节清单自检 |

## 推荐补充（生成后的主应用）

`1.0.1` 发布候选固定四个 Appkit 包为 `1.0.1`。深链恢复须验证菜单已就绪和延迟就绪两种场景：离开 Gateway 期间不被概览 Tab 的地址同步覆盖，离开成功或失败后均释放单飞标记。网关 API 代理清除客户端 `identities` 与 `X-Identity-Organ-Type`，部署环境应验证实际转发头。

- Workspace store：激活右侧/左侧/回退概览的关闭策略单测
- RuntimeAdapter：mount/update/unmount 串行队列
- SSO 回调成功/失败与 Token 刷新屏障
- 与真实子应用的浏览器冒烟（独立壳 + qiankun）

回归测试覆盖返回地址、最长 activeRule 匹配、Gateway 单飞与失败清理、菜单响应乱序和退出登录后的过期响应，以及 Shell 页在子应用切换后的缓存。测试不需要额外测试框架，使用现有 TypeScript/Vue 依赖和 Node.js 内置 runner；浏览器、IAM 与 Nginx 联调仍需单独执行。
