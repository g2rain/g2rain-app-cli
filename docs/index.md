# g2rain-app-cli 文档

本仓库是 g2rain 前端工程创建工具，不是浏览器运行时 App。它生成的项目来自 `g2rain-app-template`，并应采用中央 `frontend-app` Profile。

## 架构

- [架构概览](architecture/overview.md)
- [运行流程](architecture/runtime-flow.md)
- [职责边界](architecture/boundaries.md)
- [已知偏差](architecture/deviations.md)

## 开发

- [本地开发](development/local-development.md)
- [命令接口](development/command-interface.md)
- [模板契约](development/template-contract.md)
- [测试策略](development/testing.md)
- [完成定义](development/definition-of-done.md)
- [Git 工作流](development/git-workflow.md)

## 运行、安全与治理

- [发布](operations/publishing.md)
- [故障排查](operations/troubleshooting.md)
- [安全边界](security/security-boundaries.md)
- [Requirements](requirements/README.md)
- [项目级 ADR](decisions/README.md)
- [社区与联系](community.md)

## 事实层次

1. 中央 Frontend App Profile 管理生成项目必须满足的跨 App 规则。
2. g2rain-app-template 管理生成项目的实际模板实现和偏差。
3. 本仓库管理命令、模板获取、复制、替换和发布行为。
4. 生成后的具体项目管理自己的业务需求、架构偏差和运行配置。

文档与源码冲突时先确认是实现缺陷还是文档过时，不能把当前技术债静默写成推荐规范。
