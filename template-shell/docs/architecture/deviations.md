# 已知偏差

本表记录模板相对中央 `frontend-shell 1.0.0` / Main Shell 契约的已知差距。空表项表示当前无额外偏差；有意偏离必须追加行并给出退出条件。

| ID | 描述 | 影响 | 退出条件 |
| --- | --- | --- | --- |
| TPL-001 | 已接菜单挂载 + Tab↔地址栏同步 + `MicroAppFallback` + **深链 `restoreAfterAuth` + `/redirect` Gateway + Vite SPA fallback**；生产 Nginx 微路径 document 回退待环境验证 | 生产若未配置微路径回退到壳 index，刷新 `/member/...` 仍 404 | 目标环境完成 Nginx（或等价）微路径 document → 壳 `index.html` 后关闭本行 |
| TPL-002 | Token Store / SSO / `bootstrapSession` 已落地；联调冒烟待真实 IAM + Gateway + Sign | 本地无 SSO / Backend 配置时启动或换票失败 | 配置 `VITE_SSO_BASE_URL` + `VITE_BACKEND_ORIGIN` 完成未登录→回调→刷新→退出后关闭本行 |
| TPL-005 | OpenResty/Lua 签名已纳入模板；容器联调与密钥注入待各环境验证 | 生成后需挂载 `lua/keys` | 在目标环境完成 `docker compose -f docker-compose.sign.yml` 或等价镜像冒烟后关闭本行 |
| TPL-006 | ~~REQUEST_TOKEN / route-change 未接~~ → 已接 | — | 可关闭本行 |
| TPL-007 | Token 持久化于 `localStorage` 键 `g2rain-shell-token:${applicationCode}`（旧固定键一次性迁移） | XSS / 共享设备有落盘风险 | 评估 HttpOnly 会话或缩短 refresh；禁止 `console.log` 整包消息 |
| TPL-008 | `loadMicroApp.name` 固定为 `applicationCode`（对齐 vite-plugin-qiankun），**不用** main-shell 的 `` `${name}__${instanceId}` `` | 与 main-shell 命名策略分叉；同应用多实例依赖 qiankun 同名多 load + 子应用按 instanceId 隔离 | 中央 Profile / Appkit 统一多实例命名契约后收敛 |
| TPL-009 | Auth Bridge 经同页 `CustomEvent` 定向下发 `token` / `tokenKid` / **client 浅拷贝**（含私钥 JWK）；禁止 props / URL / storage / 日志 | 同页任意脚本可窃听；接受「同页可信微前端」模型 | 若改为隔离进程或 Token Exchange，更新契约后关闭 |
| TPL-010 | 双协议兼容：默认模板为 AppKit 单协议；legacy 仅经 CLI `--with-legacy` 覆盖层（`legacy-overlay/` → `template-shell-legacy/`）。覆盖层在 mount/update 向 props 注入 `token`/`tokenKid`/`client`（查 registry） | Token-in-props 与 AppKit「公开 props 无敏感信息」短期分叉；同页泄露面与 TPL-009 同类 | 应用迁出 registry 并改走 Auth Bridge；全部迁移后删除覆盖层。默认模板不得含 `src/platform/legacy/`。详见[双协议兼容升级方案](legacy-compatibility-upgrade.md) |
| TPL-011 | legacy `TOKEN_INVALID` 仅带 `data.applicationCode` 时由 `legacy-message-bridge` 解析活动/唯一实例后再 refresh（仅 `--with-legacy`） | 多实例同 applicationCode 且无激活 Tab 时无法路由，不得向错误实例回票 | Manager 改为定向信封（含 instanceId）或完成迁移后关闭 |

不得把上表临时状态复制为新生成主应用的长期默认模式。
