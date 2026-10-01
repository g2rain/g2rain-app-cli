# 运行流程

## 启动

目标顺序（见 `src/runtime/boot.ts`）：

1. 创建 Vue App 与 Pinia
2. 注册 Element Plus / `@g2rain/ui`
3. `initThemeController`
4. `initHttpClient`（`withAuth` + Token Store / SSO hooks）
5. `initMainPlatform({ runtimePort })` + `startTokenInvalidHandler` + `startRequestTokenHandler` + `startRouteChangeHandler`
6. 注册 Shell Router（`/sso_callback`、`/logout`、`/redirect/*` bare；`/` + `MicroAppFallback` 静默匹配微路径，**禁止** catch-all `redirect:/`）
7. `sso.start()` → `bootstrapSession`（已登录则拉 `/basis/authority/user`，并 `openAuthBridge`）
8. `startMenuBoot()`：watch 登录态 → `GET /basis/authority/menus` → 注册 `MicroAppDefinition` → `restoreAfterAuth`
9. `app.mount('#app')`

## Workspace / Tab

1. 默认打开不可关闭的「Shell 概览」Tab。
2. Sidebar：`shell` → `openShellView`；`sub` → `openMicroAppView`；`group` 仅分组。
3. TabBar 负责 `activateTab` / `closeTab`。
4. **全部 micro-app Tab 的 DOM 容器常驻**（`v-for` + `v-show`）；切 Tab 只切换显示，不销毁容器。
5. 切换离开 `micro-app` Tab 时仅 `markInactive`，**不** unmount、**不** remount、**不** `update(initialRoute)`。
6. 再次激活已挂载实例：只把状态改回 `mounted` 并显示其容器（reuse without remount）。
7. 关闭 `micro-app` Tab 时走 RuntimeStore `destroyInstance`，再移除 Tab（容器随 Tab 删除）。
8. **地址栏同步**（对齐 main-shell，`history.replaceState`）：
   - `App` 常驻 `MainLayout`（bare 路由除外），避免 Fallback 卸壳。
   - `activateTab` → `syncBrowserAddressForTab`：micro 用 `wrapActiveRule(activeRule, lastActivePath ?? initialRoute)`；shell 回到 `VITE_CONTEXT_PATH/`。
   - 子应用 `g2rain:sub-app:route-change` → 仅当前激活实例写入 `lastActivePath` 并用 `fullPath` 更新地址栏。
   - qiankun/single-spa 会对 `replaceState` 合成 `popstate`；壳 Router 用 `MicroAppFallback`（不 redirect）吃掉 `/member/...`，否则会跳回 `/admin`。

## 深链 / RedirectGateway

1. **直链刷新**：浏览器打开 `/member/...` → Vite/Nginx 将 document 回退到壳 SPA → **在** Vue Router 前将地址 `replaceState` 为 `/admin/redirect/member/...`（避免 history base=`/admin/` 把 URL 改写成 `/admin/member/...`）→ Gateway / `restoreAfterAuth` → 匹配 sub 菜单 → `openMicroAppView(initialRoute)`。菜单 `linkPath` 是子应用**内部路径**（可与 contextPath 同名：内部 `/member` → 地址栏 `/member/member`）；仅从浏览器全路径解析时做一次 `stripActiveRule`。
2. **网关**：`/admin/redirect/member/...`（Router：`/redirect/:pathMatch(.*)*`）→ `SubAppRedirectGateway`：
   - 未登录：`saveReturnUrl` → SSO
   - 已登录：等菜单定义就绪 → `handleRedirectGatewayWhenAuthed` → 打开 Tab 后 `router.replace('/')`，再 `syncBrowserAddressForTab` 写回真实微路径。
3. **SSO 回跳**：`SsoCallback` 仍 `replace('/')`；`return_url`（localStorage）由 `restoreAfterAuth` 在 `menu.boot` 后消费。
4. `redirectToSSO` 前若尚无 `return_url` 则写入当前 pathname（微路径会包装为网关路径）。
5. 登出：`clearReturnUrl` + `resetNavigationRestoreState`。

本期不做：动态注册壳业务子路由；Token 不得进入 URL / return_url。

## 微应用

1. 登录后 `menu.boot` 拉取 `/basis/authority/menus`，前置静态 `SHELL_MENUS`。
2. `sub` 菜单按 `applicationCode` 去重后 `registerDefinition`（`name === applicationCode`，供 vite-plugin-qiankun；`entry` = `resolveMicroAppEntry(origin, contextPath)`，**必须带尾斜杠**，如 `//localhost:3001/member/`）。
3. 开发态可用 `DEV_SUB_APP_ENTRY_BY_APPLICATION_CODE` 覆盖 entry origin（见 `runtime/api/menu.api.ts`）。
4. `openMicroAppView`：按 `applicationCode + viewId` 去重；`instanceId = \`${applicationCode}:${viewId}\``（= 迁移期 appKey）；**禁止**把 instanceId 拼进 `loadMicroApp.name`；**必须**携带菜单 `linkPath` → `initialRoute`（子应用内部路径，如 `/member_identity`）。
5. Workspace 为每个 micro Tab 渲染固定 `#sub-app-container-*`；首次激活时 `nextTick` → `mountInstance` → `loadMicroApp({ name: definition.name })` → `buildPublicProps`（含 `initialRoute`；禁止 Token）。
6. 子应用挂载前发 `REQUEST_TOKEN`；Shell 校验实例后 `getSharedAuth` → 定向 `TOKEN_RESPONSE`（含 client 浅拷贝）；Member 再 `settleInitialRoute(initialRoute)`。
7. 挂载失败：回滚 RuntimeInstance + 删除失败 Tab，允许重试。
8. 切 Tab：`markInactive` + `v-show`（不 unmount）+ 地址栏同步；关 Tab：`destroyInstance`（按 instanceId 卸 handle + 清认证等待）。
9. Main→Sub 定向消息经 `runtimePort.emit`。
10. Sub→Main `route-change`：`startRouteChangeHandler` 更新 `lastActivePath` 并 `replaceState(fullPath)`。

`contextPath` / `activeRule` 与 `initialRoute` 职责不同：前两者是部署与激活前缀；后者是本次菜单要打开的子应用内部页面。缺 `initialRoute` 或未以 `/` 开头时不得静默打开。

## 认证

1. 未登录访问受保护路由 → `saveReturnUrl`（若微路径）→ `sso.redirectToSSO`（需 `VITE_SSO_BASE_URL`）
2. IAM 回调 `/sso_callback` → `generateToken(code)` → `bootstrapSession` → `/`（菜单 watch 随后 `restoreAfterAuth`）
3. HTTP 鉴权：`authSessionProvider` + `ensureAccessToken`；失败走 `authErrorHandler` 回 SSO
4. 子应用 `REQUEST_TOKEN` → 壳 `ensureAccessToken` 单飞 → `TOKEN_RESPONSE`（token / tokenKid / client 浅拷贝；不自监听）
5. 子应用 `TOKEN_INVALID` → 壳 `refreshToken` → `TOKEN_RESPONSE`（含 client）；失败 → `TOKEN_ERROR`
6. 退出：`closeAuthBridge` → 卸载实例 → 清 return_url / Token / Session / 菜单定义 → `/logout`
7. Session store 仅持有非敏感摘要；Token / client 不得写入公开 props 或日志

## 部署路径

- Vite `base` = `VITE_CONTEXT_PATH`（需尾部 `/`）
- 浏览器 History base = 同一 Context Path
- **开发态**：`vite-plugin-micro-spa-fallback` 将非 Context Path 的 HTML 导航（如 `/member/...`）回退到壳 SPA
- **生产 Nginx**：`{{CONTEXT_PATH}}` 下静态资源 `try_files` 回退 `index.html`；同域微应用 **activeRule 的 document 请求**亦需回退到**壳** `index.html`（子应用静态资源仍按 entry 源分发）。否则刷新 `/member/...` 会 404
