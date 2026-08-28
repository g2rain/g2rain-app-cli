# 模板契约

## 模板来源

- 仓库：`https://github.com/g2rain/g2rain-app-template`
- 本地覆盖：`G2RAIN_TEMPLATE_PATH`
- 中央规则：`frontend-app` Profile 的 scaffolding policy

当前没有固定模板 Ref。这是已知偏差，不能把 npm CLI 版本视为已经唯一确定生成内容。

## 必需文件

CLI 至少依赖模板存在 `package.json`；当前缺失时会跳过重写但仍可能报告成功，后续应通过 manifest 强制验证。占位替换文件按[project.yaml](../project.yaml)清单维护。

建议模板提供机器可读 manifest：

```yaml
schemaVersion: 1
template: g2rain-app-template
frontendProfile: 1.0.0-draft
placeholders:
  - name: PROJECT_NAME
    token: "{{PROJECT_NAME}}"
  - name: CONTEXT_PATH
    token: "{{CONTEXT_PATH}}"
```

这是建议方向，不是当前已有文件。

## 复制排除

当前排除 `.git`、node_modules、dist、`.DS_Store` 和 package-lock。不得复制模板私钥、本地 Secret、IDE 状态或构建缓存。新增排除项时评估是否误删业务目录中的同名文件。

不复制 lockfile 意味着生成项目首次运行 `npm install` 并重新解析依赖版本，降低可复现性。若未来改为复制 lockfile，需同步 CLI 提示为 `npm ci` 并明确模板/生成项目依赖升级策略。

## 占位符

- `{{PROJECT_NAME}}`：npm package name、应用编码和镜像/文档示例等模板位置。
- `{{CONTEXT_PATH}}`：不带首尾 `/` 的 URL 路径段。

当前只替换固定文本文件，不做全仓扫描。生成验证应搜索残留占位符，但要区分 docs 中刻意说明占位符的内容。

## 生成项目文档身份

模板中的架构说明可以作为新项目文档的基础，但模板仓库身份不能原样成为生成项目身份。生成结果至少应包含：

- 新项目的名称与仓库标识；
- 采用的中央 Profile 及版本；
- CLI 版本、模板来源和可追溯 Ref；
- 适用于业务 App 的 Agent 审核入口，而不是模板维护说明。

当前实现尚未转换 `AGENTS.md` 和 `docs/**`，会保留 `g2rain-app-template` 元数据。创建项目后需人工校正，详见[已知偏差 DEV-008](../architecture/deviations.md#dev-008生成项目仍保留模板文档身份)。后续实现应通过生成 manifest 或明确的文档占位清单完成转换，并加入集成测试。

## 契约变更流程

```text
中央 Profile 规则变化
→ 更新 app-template 与模板元数据
→ 更新 app-cli 复制/替换契约
→ 在临时目录生成项目
→ 验证占位符、排除项、npm install 和 npm run build
→ 记录 CLI/模板兼容版本
```

CLI、模板和中央 Profile 的改动可以位于不同仓库，但发布必须按兼容顺序协调。
