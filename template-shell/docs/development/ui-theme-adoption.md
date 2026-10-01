# UI / Theme 采纳说明

## 当前状态

| 项 | 状态 |
| --- | --- |
| `@g2rain/theme` | 依赖已声明；由 ThemeController 驱动 CSS / `data-g2-theme` |
| `@g2rain/platform/theme` | `createThemeController` 在 `platform/theme` 单例化 |
| `@g2rain/ui` | `boot` 中 `app.use(G2rainUi, …)` |
| Element Plus | 全量注册，供后续壳组件使用 |
| 持久化 | `localStorage` 键 `g2rain-shell-theme`（壳侧拥有） |
| 语言偏好 | Header「偏好」下拉；键 `g2rain-shell-locale`；驱动 `G2rainUi` locale 与已挂载实例 `notifyLocale` |

## 规则

1. 主题 CSS 来自 `@g2rain/theme`；壳只负责初始值、切换与持久化。
2. 布局组件优先使用 `--g2-*` CSS 变量，避免硬编码品牌色。
3. `@g2rain/ui` 的 `translate` / `locale` 由组合根注入；模板基线返回 fallback 文案。
4. 不得在公共包中写入具体壳的 localStorage 键或项目品牌文案。
5. 主题 / 语言收进 Header「偏好」；机构切换与用户菜单保持独立入口。

## 验证

- Header「偏好」可在 light/dark 与 zh-CN / en-US 间切换。
- 刷新后主题与语言保持。
- Shell 页面背景/文字随 `--g2-bg-*` / `--g2-text-*` 变化。
