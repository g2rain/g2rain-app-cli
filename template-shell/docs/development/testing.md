# 测试策略

## 基线

| 层级 | 做法 |
| --- | --- |
| 类型 / 构建 | `npm run build`（`vue-tsc --noEmit` + `vite build`） |
| 布局交互 | 手动：打开/切换/关闭 Shell Tab；概览不可关闭 |
| 主题 | 切换 light/dark 并刷新后仍保持 |
| 契约 | 变更 Platform Main / HTTP 后按 Appkit 生成契约第 10 节清单自检 |

## 推荐补充（生成后的主应用）

- Workspace store：激活右侧/左侧/回退概览的关闭策略单测
- RuntimeAdapter：mount/update/unmount 串行队列
- SSO 回调成功/失败与 Token 刷新屏障
- 与真实子应用的浏览器冒烟（独立壳 + qiankun）

模板仓不强制引入测试框架；新增自动化测试时应服务开发者与 CI，而不是仅供 Agent 使用。
