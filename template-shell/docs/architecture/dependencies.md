# 依赖规则

## 内部

1. 禁止新增 `components → platform/runtime/views/shell`、`platform → runtime/views/shell`、`shared → platform/runtime/components` 等反向依赖。
2. `shell` 可依赖 `platform`（例如 Workspace store）以驱动布局；业务规则仍不得写入 shell。
3. 外部模块只从各层 `index.ts`（或明确的稳定路径）导入。

## 外部包

| 包 | 用途 | 约束 |
| --- | --- | --- |
| `@g2rain/platform` | `/main`、`/theme` 公开 API | 只走 `package.json#exports`；禁止深路径 |
| `@g2rain/http` | HTTP Client 工厂与拦截器能力 | Token Store 留在壳侧 |
| `@g2rain/theme` | CSS 变量与主题样式 | 壳负责持久化与 `data-g2-theme` |
| `@g2rain/ui` | 通用 UI 插件 | 经组合根注册 |
| `qiankun` | `loadMicroApp` | 仅 RuntimeAdapter 使用 |
| `vue` / `vue-router` / `pinia` / `element-plus` | 壳 UI 与状态 | 不得下沉进公共 platform 包 |

## 协作仓

- `g2rain-app-cli`：复制模板并替换占位符。
- `g2rain-main-shell`：生产参考实现。
- `g2rain-appkit`：契约与生成规范。
- 子应用（如 `g2rain-member-app`）：联调对象，不进入本模板依赖图。
