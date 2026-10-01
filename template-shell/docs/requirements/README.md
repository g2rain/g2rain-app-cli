# 需求入口

本目录存放本仓库（模板或生成后主应用）的活跃需求文档。

## 规则

1. Agent 只认 `docs/project.yaml` 的 `aiCoding.activeRequirement`，或本目录中**唯一**状态为 `开发中` 的需求文档。
2. 没有或不唯一时停止开发，不按文件名或修改时间猜测。
3. Shell 需求应使用中央 `frontend-shell` 需求模板（见中央仓库 Profile / shell-generation-policy），并写清：
   - Context Path / applicationCode
   - 布局与 Workspace 行为
   - 子应用契约字段与可信目录来源
   - SSO / Token / 部署影响
4. 模板源仓日常无活跃需求时保持 `aiCoding.activeRequirement: null`。

## 当前

无活跃需求。
