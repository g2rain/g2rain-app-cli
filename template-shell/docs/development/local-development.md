# 本地开发

## 准备

1. Node.js `>= 22`
2. 安装依赖：`npm install`
3. 将 `.env` 配置为本地值（与 main-shell 同款：同域 Context Path + Vite 代理到 `VITE_BACKEND_ORIGIN`）：

```env
VITE_CONTEXT_PATH={{CONTEXT_PATH}}
VITE_SERVER_PORT={{DEV_SERVER_PORT}}
VITE_BACKEND_ORIGIN=http://localhost:8080
VITE_APPLICATION_CODE={{PROJECT_NAME}}
VITE_SSO_BASE_URL=http://localhost:9000
VITE_AUTH_END_POINT=/auth/authorize
VITE_TOKEN_END_POINT=/auth/token
VITE_REDIRECT_URI=/sso_callback
VITE_DINGTALK_BIND_MODE=INTERNAL
```

脚手架生成时 CLI 会把项目名 / Context Path / 端口写成具体值。`VITE_SSO_BASE_URL` 联调前必填。

开发期浏览器请求形如 `{CONTEXT_PATH}/api/*`、`{CONTEXT_PATH}/auth/*`、`{CONTEXT_PATH}/lua/sign_code`，由 Vite 代理到 `VITE_BACKEND_ORIGIN`（须能路由到 Gateway / IAM / OpenResty 签名，与 main-shell 一致）。

## Application-DPoP 签名侧车（本地）

换票需要 OpenResty `/admin/lua/sign_code`，**不要**把该请求打到 Gateway。

```bash
./scripts/generate-sign-keys.sh          # 或 scripts/generate-sign-keys.ps1
# 将真实 IAM 公钥写入 lua/keys/iam-public-key.pem
docker compose -f docker-compose.sign.yml up --build
```

侧车暴露 `http://localhost:8088`。若本地仅测签名，可将 `VITE_BACKEND_ORIGIN` 临时指向该侧车；完整联调时 `VITE_BACKEND_ORIGIN` 应指向同时提供 `/admin/api`、`/admin/auth`、`/admin/lua` 的上游（与 main-shell 相同模型）。

## 命令

```bash
npm run dev      # http://localhost:3000/admin/
npm run build
npm run preview
```

## 与子应用联调

1. 登录后确认 Network 请求 `GET .../basis/authority/menus`，侧栏出现「首页」「初始化」本地菜单，其后为后端 / Mock 业务菜单。
2. 子应用 `entry` **只**使用菜单返回的 `endpointUrl`（origin）；`menu.store` 再 join `contextPath` 与尾斜杠。本地联调请在 **Mock / 后端菜单数据** 中配置正确 origin（例如 `//localhost:3001`），**不要**在 `menu.api.ts` 写 DEV 覆盖表。
3. 启动已接 `@g2rain/platform/sub` 的子应用（推荐 `g2rain-member-app`）。
4. 点击 `sub` 菜单：控制台应出现 `[QiankunAdapter] loadMicroApp`（`name` 必须为 **`g2rain-member-app`**；`instanceId` 形如 `g2rain-member-app:13638`，**不**拼进 name）；`entry` 必须为 **`//localhost:3001/member/`**（尾斜杠；`/member` 无尾斜杠会 404）。Network 确认 `GET .../member/` → 200 HTML。
5. 核对公开 props：**无 Token**（legacy 经 adapter 注入除外）；`contextPath` / `activeRule` 为**子应用**前缀（不是 Shell 自身 Context Path）。
6. entry 仅来自 menus / Mock，勿从 URL query 读取。
7. 同应用多菜单：各 Tab 独立 `instanceId` / 容器；切 Tab 不 unmount；关 Tab 只卸对应实例。

本地菜单说明：固定「首页」（不可关）；「初始化」分组下「账号管理」「租户初始化」打开 Workspace Tab。钉钉绑定回调路径为 `{contextPath}/passport/bind_result`（`VITE_DINGTALK_BIND_MODE` 默认 `INTERNAL`）。

**契约要点**：`loadMicroApp.name === MicroAppDefinition.name === applicationCode`（禁止 `__${instanceId}` 后缀）。

联调清单：打开 sub 菜单 → 地址变为微路径 → F5 应恢复同 Tab；访问 `/admin/redirect/{activeRule}/...` 应打开对应子应用；未登录深链经 SSO 后由 `restoreAfterAuth` 消费 `return_url`（见 [deviations.md](../architecture/deviations.md) TPL-001 / [runtime-flows.md](../architecture/runtime-flows.md)）。

## Header 右上角

布局：`[当前机构 ▾]` · `[⚙ 偏好]` · `[用户 ▾]`。

- 机构：独立下拉；目录来自 `session.availableOrgans`（SSO / 租户 API 扩展点），空目录时不可切换。
- 偏好：主题 light/dark（键 `g2rain-shell-theme`）与语言 zh-CN / en-US（键 `g2rain-shell-locale`）。
- 用户：展示会话摘要（`bootstrapSession` ← `/basis/authority/user`）；退出清 Token Store + `releaseAllOnLogout` + `menuStore.reset` + `clearSession`，再导航 `/logout`。

详见 [ui-theme-adoption.md](ui-theme-adoption.md)。
