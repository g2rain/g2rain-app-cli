# 层次

目标依赖方向：

```text
shared → components → platform → runtime → views / shell
组合根 main.ts / App.vue / runtime/boot.ts 可装配各层
```

| 目录 | 职责 |
| --- | --- |
| `shared` | 环境变量、项目名、无业务状态工具 |
| `components` | 不依赖 platform/runtime 的可复用 UI |
| `platform` | Workspace / Runtime / Session、Main/Theme 协调器、qiankun 适配与类型 |
| `runtime` | boot、HTTP 工厂、路由与运行时装配 |
| `views` | Shell 自有认证/租户页面扩展位 |
| `shell` | 全局布局、菜单、Tab、Workspace 与 Shell 本地页 |

同层与跨层优先从稳定 `index.ts` 公共出口导入。违反目标方向的依赖必须登记在 [deviations.md](deviations.md)，且不得作为新代码范例。
