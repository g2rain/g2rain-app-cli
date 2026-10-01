# Git 分支与提交策略

## 分支

- `main`：正式发布分支。
- `develop`：日常集成和开发分支。
- `feature/<name>`：特性开发。
- `fix/<name>`：缺陷修复。

```text
feature/* 或 fix/*
→ develop
→ 测试环境验证
→ main
```

feature/fix 不应绕过 develop 直接进入 main。模板仓库变更应在测试生成项目中验证，因为 main 上的模板版本会影响所有后续项目。

## 提交

推荐格式：

```text
type(scope): summary
```

示例：

```text
docs(architecture): add frontend template boundaries
feat(generator): support optional route output
fix(runtime): isolate router by app key
```

一次提交聚焦同一目的。生成结果可以与对应模板/页面变化一同提交，但必须能从 Diff 中识别，提交说明注明执行的生成命令。

## Pull Request

PR 至少说明：

- 修改目的和受影响的模板能力。
- 对新生成项目和已有项目的影响。
- 是否改变占位符、目录、环境变量、生成输出或公共 API。
- 执行的构建/测试/生成命令和结果。
- 架构偏差是否新增、缩小或迁移。
- 需要测试环境验证的 main-shell、IAM、Gateway 或容器条件。
