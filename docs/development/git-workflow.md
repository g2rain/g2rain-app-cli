# Git 分支与提交策略

- `main`：正式 npm 发布分支。
- `develop`：日常集成分支。
- `feature/<name>`：特性。
- `fix/<name>`：缺陷修复。

```text
feature/* 或 fix/* → develop → CLI/模板测试 → main
```

推荐提交格式：

```text
type(scope): summary
```

示例：

```text
feat(cli): validate target project path
fix(template): pin compatible template ref
docs(scaffold): document placeholder contract
```

PR 说明：

- 命令兼容性和 npm 版本影响。
- 模板/Profile 兼容范围。
- 新增或删除的参数、占位符、排除项和输出。
- 临时目录测试与生成项目构建结果。
- 发布/回滚顺序和剩余偏差。

main 发布时升级 package version，构建 dist，检查 tarball，并以不可变 npm 版本发布；不能覆盖已发布版本。
