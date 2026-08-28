# 测试策略

## 当前基线

```bash
npm run build
```

当前只验证 TypeScript 编译，没有单元、lint 或自动集成测试。每次 CLI 行为变化至少在临时目录执行一次本地模板 smoke test。

## Smoke Test

1. 构建 CLI。
2. 创建全新临时父目录。
3. 设置 `G2RAIN_TEMPLATE_PATH` 指向已知本地模板。
4. 非交互生成唯一项目名。
5. 检查目标目录和排除项。
6. 检查 package.json.name、Context Path 和残留占位符。
7. 在生成项目执行依赖安装和 `npm run build`（网络/时间允许时）。
8. 重复同名生成，确认拒绝覆盖。

## 按变化验证

| 变化 | 覆盖场景 |
| --- | --- |
| 参数解析 | 两个 flag 拼写、位置参数、缺参、未知参数、取消、非 TTY |
| 项目名/路径 | 正常名、scoped/非法名、绝对路径、`..`、空白、已有目录 |
| Context Path | 默认推导、首尾 `/`、空值、非法字符、多段路径 |
| 模板定位 | 环境覆盖、本地相邻目录、Git clone、网络失败、不完整目录 |
| 复制 | 排除项、隐藏文件、二进制、权限和符号链接策略 |
| 替换 | 所有清单文件、缺失文件、重复 token、特殊字符、残留 token |
| 发布 | shebang、两个 bin、npm pack 内容、干净安装后的执行 |

## 建议自动化

- 使用 Node test runner 或 Vitest 测试参数、规范化和路径校验纯函数。
- 使用 `mkdtemp` 建立隔离集成测试，注入最小模板 fixture。
- 把 clone 适配成可替换接口，测试失败而不访问网络。
- 增加模板 manifest 契约测试和生成项目最小 build。
- 增加 `prepublishOnly` 执行 build/test，并在 CI 检查 `npm pack --dry-run`。
