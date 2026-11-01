# 变更记录

## 1.0.2 — 2026-11-01

- 地址栏附加 `g2shell`，Gateway 恢复前移除宿主参数，与 app-template v1.0.2 配套。
- SSO 回跳存储按壳 Context Path 隔离。
- single-spa 生命周期超时保持 10 秒，告警延迟至 8 秒。
- Passport / TenantProvision 使用主题变量；production 模式裁剪 log/info/debug。
- 更新 legacy 覆盖层说明，中央文档固定引用 `v1.0.2`。

升级说明、依赖版本和验证范围见 [v1.0.2 Release](docs/releases/v1.0.2.md)。
