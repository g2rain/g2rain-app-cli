# 完成定义

- 需求与职责边界清楚，未把子应用业务或后端鉴权搬入 Shell。
- 新依赖遵守目标层次；必要偏差已写入 [deviations.md](../architecture/deviations.md) 并有退出计划。
- `applicationCode` / `viewId` / `instanceId` / `entry` / `activeRule` 变更已同步文档。
- 替换 `.env` 占位符后 `npm run build` 通过。
- Token、Secret、私钥、日志与公开配置经过安全检查。
- Context Path、Vite `base` 与 Nginx 示例路径一致。
- `docs/` 必填树、`docs/index.md` 与 `docs/project.yaml` 索引同步。
- 未执行的验证、已知风险与回滚方式已报告。
