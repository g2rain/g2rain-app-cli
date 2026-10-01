# g2rain-app-template Agent Instructions

本文件是 AI Coding 在本项目中的执行入口。事实来源位于 `docs` 和当前源码，不在这里复制完整规范。

## 项目类型

- 类型：Vue 3 微前端应用模板
- 项目事实：`docs/project.yaml`
- 文档入口：`docs/index.md`
- 中央 Profile：`frontend-app`
- 当前试点版本：`1.0.0-draft`
- 中央仓库：`https://github.com/g2rain/g2rain`
- 试点分支：`feature/g2rain-architectur-init`
- Profile 路径：`docs/architecture/profiles/frontend-app`
- 本项目偏差：`docs/architecture/deviations.md`

中央 Profile 是所有同类前端 App 公共规则的事实来源；本项目 docs 维护模板实现、生成器、部署细节和当前偏差。正式发布后应把基线引用从试点分支切换到包含 `frontend-app` 的固定架构 Tag，不能继续跟随开发分支。

## 开始前

按顺序读取：

1. `docs/project.yaml`
2. 中央 `frontend-app` Profile
3. `docs/architecture/deviations.md`
4. `docs/architecture/overview.md`
5. `docs/architecture/layers.md`
6. `docs/architecture/dependencies.md`
7. `docs/development/code-conventions.md`
8. `docs/development/testing.md`
9. `docs/development/definition-of-done.md`
10. 当前需求对应的 `docs/requirements`、`docs/design` 或 `docs/decisions`

涉及页面、组件、生成器、配置、认证或部署时，继续读取对应专题文档。

## 实现约束

- 保持目标依赖方向：`views → runtime → platform → components → shared`，组合根 `main.ts` 可以装配各层。
- 不新增 components 对 platform/runtime/views、platform 对 runtime/views 的反向依赖；现有偏差仅用于迁移，不能作为范例。
- `views` 业务模块使用 `index.vue + api.ts + type.ts + mock.ts（可选）`，并在 `views/route-map.ts` 注册组件。
- 新增模块通过稳定 `index.ts` 暴露公共 API，外部不深度导入内部实现。
- 使用 Vue Composition API 和 `<script setup lang="ts">`；禁止新增 JavaScript 文件，避免新增 `any`，必须使用时限定边界并说明原因。
- 独立模式与 qiankun 集成模式都要考虑；集成模式必须维持 `instanceId` 多实例隔离与卸载清理，迁移期 `appKey === instanceId`；Token 不经公开 props（Auth Bridge）。
- Token、私钥、生产域名和敏感配置不得写入源码、Mock、生成模板或提交记录。
- 修改路由、静态权限点或 API 后评估并运行 `npm run build:config`；当前工具不会生成 API endpoint，不能伪造生成结果。
- 运行代码生成器前检查 Git 状态；生成器会覆盖文件，必须 Review Diff，不能覆盖未合并的手工业务代码。
- 修改源码结构、命令、环境变量、生成流程或运行时行为时同步更新 docs 和 README。
- 不能用本地规则静默覆盖中央 Profile；有意偏离时更新 `docs/architecture/deviations.md`，长期跨项目变化提交中央 ADR/Profile。
- 不向仓库添加仅供 Agent 使用的验证脚本；由 Agent 在任务期间动态检查。

## 完成前

- 检查 Git Diff，区分手写变化、生成结果和任务开始前已有变化。
- 执行 `npm run build`；不能执行时说明原因与风险。
- 动态检查 Markdown 相对链接、`docs/project.yaml`、`package.json`、环境变量、脚本和源码的一致性。
- 页面或权限变化检查 `route-map.ts` 与资源 JSON；生成器变化用临时输入验证，避免破坏真实页面。
- 按 `docs/development/definition-of-done.md` 报告完成项、未验证项和剩余架构偏差。
