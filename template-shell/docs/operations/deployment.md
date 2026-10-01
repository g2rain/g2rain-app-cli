# 部署

## 构建（静态）

```bash
# 确保 CONTEXT_PATH / 端口已是具体值
npm ci
npm run build
```

产物位于 `dist/`，静态资源以 `VITE_CONTEXT_PATH` 为 `base`。

## 容器镜像

构建依赖 npm Registry 上的 `@g2rain/*@1.0.0`；镜像内执行 `npm ci` / `npm install`，不再拷贝本地 kits 制品。

```bash
./build.sh
# 等价：docker build -t g2rain/<project>:latest .
```

产物镜像需在 `g2rain-deploy` 的 `services.conf` / Compose 中登记后，由 `./update.sh <service>` 拉取构建并启动。入口路径示例：`/admin/`。

## OpenResty 镜像（含 Application-DPoP）

模板提供 `Dockerfile` + `nginx/default.conf.template` + `lua/`：

1. 本地生成密钥：`./scripts/generate-sign-keys.sh`（或 `scripts/generate-sign-keys.ps1`）
2. 将真实 **IAM** 公钥写入 `lua/keys/iam-public-key.pem`（勿提交）
3. 构建镜像时 **不** 把私钥打进层；运行时由 deploy 挂载 `config/<project>/keys`
4. 暴露 `/lua/sign_code`、`/keys/iam-key-id`、`/keys/iam-public-key`（另有 Context Path 前缀变体）

本地签名侧车（开发）：

```bash
docker compose -f docker-compose.sign.yml up --build
```

开发环境可将 `VITE_BACKEND_ORIGIN` 指向签名侧车（仅测签名）或指向同时提供 `/admin/api`、`/admin/auth`、`/admin/lua` 的上游（与 main-shell 同款）。在 deploy 栈内由本容器 OpenResty 提供签名，无需侧车。

## Nginx 纯静态示例

参考 `nginx/default.conf.example`（无 Lua）。生产签名必须用 OpenResty 模板或等价边缘。

## 检查清单

- [ ] Context Path 与网关入口文档一致
- [ ] 私钥仅 volume / secret 注入，未进 Git / 镜像层
- [ ] 静态资源 404 回退正确
- [ ] 子应用 `entry` 仅来自受信配置
- [ ] 生产 `SSO_BASE_URL` 已注入（`env-config.js`）
