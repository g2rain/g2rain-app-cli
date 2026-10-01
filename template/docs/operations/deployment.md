# 构建与部署

## 前端构建

```bash
npm ci
npm run build
```

产物位于 `dist`，包含启动时可替换的 `env-config.js`。`dist` 已被 Git 忽略，不应提交。

## 镜像

```bash
docker build \
  --build-arg VITE_BUILD_MODE=production \
  -t g2rain/your-app:latest \
  .
```

或使用模板脚本：

```bash
./build.sh --image g2rain/your-app --tag latest --build-mode production
```

构建阶段使用 Node 22 Alpine，运行阶段使用 OpenResty Alpine，并从仓库 tar 包离线安装 luaossl。

## 启动示例

```bash
docker run --rm -p 8080:8080 \
  -e SERVER_PORT=8080 \
  -e CONTEXT_PATH=/your-app \
  -e GATEWAY_HOST=gateway \
  -e GATEWAY_PORT=8080 \
  -e IAM_HOST=iam \
  -e IAM_PORT=8080 \
  -e SSO_BASE_URL=https://platform.example.com \
  g2rain/your-app:latest
```

生产部署通过 Secret/Volume 注入 Lua/IAM 密钥文件，不在镜像或仓库保存真实私钥。

## Nginx 路径

- `${CONTEXT_PATH}/api/` → Gateway 根路径。
- `${CONTEXT_PATH}/auth/` → IAM `/auth/`。
- `${CONTEXT_PATH}/doc/` → Gateway。
- `${CONTEXT_PATH}/lua/sign_code` → Lua 签名处理。
- 其他路径 → 静态资源和 SPA `index.html` 回退。

修改代理规则时验证 Context Path rewrite 后的实际上游路径，避免多删或多加一段服务前缀。

## 部署前检查

- `npm run build` 通过。
- 镜像可以在目标架构构建，luaossl 加载成功。
- `SERVER_PORT` 与 Service/Ingress 健康检查端口一致。
- `VITE_CONTEXT_PATH`、`CONTEXT_PATH`、main-shell entry/activeRule 一致。
- Gateway/IAM DNS、端口、网络策略和证书正确。
- SSO Redirect URI 与公开域名一致。
- 资源配置已导入，应用编码与 `VITE_APPLICATION_CODE` 一致。
- 静态资源、刷新路由、独立登录、qiankun mount/update/unmount 均验证。
- 日志和镜像层不包含 Token、Client 私钥或生产密钥。

## 回滚

镜像使用不可变版本 Tag，保留上一个可用镜像和对应资源配置。模板升级可能同时改变前端产物与平台资源，回滚前确认两者兼容，不能只回滚镜像而保留不兼容的页面/权限配置。
