<!-- Appended when scaffolding with --with-legacy. Do not use as the sole deviations.md. -->

| TPL-LEGACY-010 | **legacy 适配器**在 mount/update 时向 props 合并 `token` / `tokenKid` / `client`；仅 `LEGACY_APPLICATION_REGISTRY` 命中的应用走此路径；AppKit 仍禁止 props 带 Token | 与 AppKit「公开 props 无敏感信息」短期分叉；同页泄露面与 TPL-009 同类 | 该应用迁出 legacy registry 并改走 Auth Bridge 后删除注入；全部迁移后删除 `src/platform/legacy/` 覆盖层 |
| TPL-LEGACY-011 | legacy `TOKEN_INVALID` 仅带 `data.applicationCode` 时由 `legacy-message-bridge` 解析活动/唯一实例后再 refresh | 多实例同 applicationCode 且无激活 Tab 时无法路由；不得向错误实例回票 | 子应用改为定向信封（含 instanceId）或完成迁移后关闭 |
