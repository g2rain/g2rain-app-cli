# 安全边界

## 认证与授权

- 集成模式信任 main-shell Auth Bridge 下发 Token 的前提是子应用确实由受信 shell 挂载；不能把任意 Window 全局值或公开 props 当作服务端授权依据。
- 独立模式通过 IAM SSO 获得 Token，Redirect URI 必须精确注册并校验返回状态。
- 前端 `v-permission`、资源页面和 `hasApiPermission` 只控制 UI，Gateway 和领域服务必须执行最终认证、租户和权限校验。
- Token 过期、刷新失败和 qiankun update/unmount 要清理状态，避免跨 Tab 或跨用户复用。

## 密钥与配置

- `VITE_*`、`env-config.js`、前端 Bundle 和浏览器 Storage 均不是 Secret 存储。
- Lua 私钥、IAM 公钥/Key ID 通过部署 Secret 或 Volume 注入，不提交真实文件。
- 示例、Mock、生成模板和文档只使用无效占位值。
- Docker 镜像构建上下文和镜像层不得包含本地密钥。

## HTTP 与代理

- 生产环境使用 HTTPS，限制管理和签名端点的来源、方法和网络范围。
- CORS、Host、X-Forwarded-* 和代理路径由部署环境明确配置，不能依赖开发默认。
- 签名覆盖的请求体、Content-Type/boundary 和实际发送字节必须一致。
- 不信任前端传入的租户、权限、角色或资源列表；后端根据 Token 和可信上下文重新计算。

## 数据与日志

- 不记录完整 Access Token、Refresh Token、Client 私钥、验证码、Cookie 或个人敏感资料。
- 错误日志保留请求关联信息但避免请求体全量输出。
- Mock 不复制生产数据。
- 国际化/资源接口响应也按最小必要原则返回，不向前端暴露内部权限实现细节。

## 依赖与供应链

- 使用 `npm ci` 和受 Review 的 lockfile。
- 升级 Vue/Vite/qiankun/HTTP/crypto 依赖时检查安全公告、Node engines、Peer Dependencies 和生成项目兼容性。
- Docker 基础镜像和仓库内 luaossl tar 包需要可追踪版本与来源，发布时扫描镜像。
- 不运行不可信 SQL 输入；`create-g2rain-app` 生成器具有本地文件覆盖能力，执行前确认 Git 状态。

## 漏洞报告

安全问题按根目录 [SECURITY.md](../../SECURITY.md) 私下报告，不创建公开 Issue。
