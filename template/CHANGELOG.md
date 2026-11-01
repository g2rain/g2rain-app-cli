# 变更记录

## 1.0.2

发布日期：2026-11-01。完整说明见 [v1.0.2 Release](docs/releases/v1.0.2.md)。

- 集成直链支持 `g2shell` 指定同域宿主壳；缺失或非法时使用默认宿主 Origin 和 redirect 前缀。
- 独立模式 SSO 回跳存储改为 `return_url:${VITE_CONTEXT_PATH}`，隔离同域不同应用；旧 key 不迁移，升级中未完成的登录需重新发起。
- Vite `production` 模式通过 esbuild pure 配置裁剪 `console.log`、`console.info`、`console.debug` 调用，保留 warn/error。其他 mode 不启用此配置。
- 修正 dict Mock 数据及 Auth Bridge、目录职责文档；采用 Frontend App Profile 1.0.0，中央文档统一引用 Tag `v1.0.2`。

运行依赖 `@g2rain/http`、`platform`、`theme`、`ui` 保持 1.0.1，不随模板版本升级。

验证：生产构建通过；仍有 MockJS eval、chunk 体积、动态导入与 env-config.js 提示。浏览器双模式、多实例、SSO 和宿主壳联调未验证。发布时还需同步 CLI 内嵌模板并验证生成项目。
