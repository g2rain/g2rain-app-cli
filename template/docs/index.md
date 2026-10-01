# g2rain-app-template 文档

本目录用于让开发者和 AI Coding 基于当前源码维护模板。根 README 负责快速上手，`docs/project.yaml` 保存机器可读事实，专题文档保存架构、开发、生成、运行和安全规则。

本项目是组织级 [`frontend-app 1.0.0-draft`](https://github.com/g2rain/g2rain/tree/feature/g2rain-architectur-init/docs/architecture/profiles/frontend-app) 的首个试点。中央 Profile 管理同类 App 的公共规则，本目录维护模板实现、生成器、部署细节和[架构偏差](architecture/deviations.md)。正式发布后应切换到包含该 Profile 的固定架构 Tag。

## 架构

- [架构概览](architecture/overview.md)
- [层次与目录职责](architecture/layers.md)
- [依赖规则](architecture/dependencies.md)
- [运行时流程](architecture/runtime-flows.md)
- [Platform 生命周期](architecture/platform-lifecycle.md)
- [已知架构偏差](architecture/deviations.md)

## 开发

业务 App 的创建、页面生成和资源配置生成使用 [CLI 使用手册](https://github.com/g2rain/g2rain-app-cli/blob/main/docs/development/usage.md)。下面是维护本模板仓库时的文档。

- [本地开发](development/local-development.md)
- [代码规范](development/code-conventions.md)
- [Views 规范](development/views-conventions.md)
- [Components 与 Platform](development/components-and-platform.md)
- [代码生成](development/code-generation.md)
- [资源配置生成](development/resource-generation.md)
- [测试策略](development/testing.md)
- [完成定义](development/definition-of-done.md)
- [Git 工作流](development/git-workflow.md)

## 运行与安全

- [配置](operations/configuration.md)
- [构建与部署](operations/deployment.md)
- [故障排查](operations/troubleshooting.md)
- [安全边界](security/security-boundaries.md)

## 需求与决策

- [Requirements 使用说明](requirements/README.md)
- [项目级 ADR](decisions/README.md)
- [社区与联系](community.md)

## 维护规则

- 源码、`package.json`、环境文件和部署脚本是实现事实；文档与它们冲突时，先判断代码缺陷还是文档过时，不能静默选择一方。
- 修改模板将影响所有以后创建的应用，必须同时考虑模板仓库和生成后项目。
- 生成器输出不是天然正确的代码；必须 Review、测试并允许业务项目继续修改。
- 架构目标与当前偏差分开维护，不能把技术债固化为新规范。
