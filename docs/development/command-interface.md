# 命令接口

## 命令名

```text
create-g2rain-app
g2rain-app
```

两者都指向 `dist/index.js`，行为必须一致。

## 当前语法

```text
create-g2rain-app [project-name] [context-path]
create-g2rain-app [project-name] --context-path <context-path>
create-g2rain-app [project-name] --context_path <context-path>
```

示例：

```bash
create-g2rain-app g2rain-member-app member
create-g2rain-app g2rain-member-app --context-path member
```

缺失参数时进入 prompts：

```text
? Project name › g2rain-new-app
? Context path (URL prefix, without leading slash) › new
```

## 默认 Context Path

| 项目名 | 默认 Context Path |
| --- | --- |
| `g2rain-member-app` | `member` |
| `g2rain-manager` | `manager` |
| `demo-app` | `demo` |
| `g2rain-app` | `g2rain-app`（移除后为空时回退原名） |

输出显示时统一带前导 `/`，写入模板的 `{{CONTEXT_PATH}}` 不带首尾 `/`。

## 退出行为

- 目标目录已存在：打印错误并退出 1。
- 项目名缺失/取消：退出 1。
- Context Path 为空：退出 1。
- 模板 clone 失败：退出 1。
- 未捕获复制/替换错误：顶层 catch 打印错误并退出 1。

当前未知选项会被忽略，也没有 `--help`、`--version`、`--template` 或 `--template-ref`。文档不能提前承诺这些能力；新增时应保持自动化可预测性和向后兼容。

## 设计要求

- 交互和非交互必须共享校验函数。
- 非 TTY/CI 缺参时应快速失败，不无限等待 Prompt。
- 错误包含参数名和修复方式，不输出堆栈中的 Secret。
- 破坏命令语义的变化按 npm 语义版本升级并提供迁移说明。
