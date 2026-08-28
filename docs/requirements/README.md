# Requirements 使用说明

CLI 需求必须同时描述命令兼容、文件系统副作用、模板契约和生成项目影响。

```markdown
# 需求标题

## 背景

当前命令、模板或用户问题。

## 目标与非目标

- 本次实现什么。
- 明确不自动执行什么。

## 命令接口

- 交互/非交互语法、默认值、错误和退出码。
- 向后兼容与 npm 版本影响。

## 文件系统与模板

- 输入、输出、覆盖、排除、占位符和失败恢复。
- 模板/Profile 兼容版本。

## 安全

- 路径、shell、网络、模板供应链和 Secret 风险。

## 验收条件

1. 可观察结果。
2. 非法输入和失败结果。
3. 生成项目验证。

## 测试计划

- npm run build
- 临时目录 smoke/integration test
- npm pack --dry-run（发布变化）

## 发布与回滚

- CLI、模板、中央 Profile 的合并和发布顺序。
```

稳定命令和模板规则进入 development/operations 文档；长期项目取舍进入 `docs/decisions`；跨 App 输出规则进入中央 frontend-app Profile。
