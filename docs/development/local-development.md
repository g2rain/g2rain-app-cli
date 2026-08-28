# 本地开发

## 安装和构建

```bash
npm ci
npm run build
```

构建使用 `tsc -p tsconfig.json`，ESM 输出到 `dist`。`dist/index.js` 必须保留 Node shebang，两个 bin 才能直接执行。

## 安全验证 CLI

`npm run dev` 会立即运行 CLI 并可能在当前目录创建项目。推荐先创建临时父目录并使用本地模板：

```powershell
$env:G2RAIN_TEMPLATE_PATH = 'D:\github\g2rain-app-template'
New-Item -ItemType Directory -Force -Path "$env:TEMP\g2rain-cli-smoke" | Out-Null
Set-Location "$env:TEMP\g2rain-cli-smoke"
node D:\github\g2rain-app-cli\dist\index.js smoke-app --context-path smoke
```

检查完成后只清理明确的临时目录，不在仓库根运行递归删除。

## npm link

```bash
npm run build
npm link
g2rain-app smoke-app --context-path smoke
```

`npm link` 会改变本机全局 npm 链接，使用后按团队环境管理；普通验证直接执行 `node dist/index.js` 更可控。

## 调试

```bash
npm run dev -- smoke-app --context-path smoke
```

npm 会把 `--` 后参数传给 `tsx src/index.ts`。务必在临时工作目录运行。

## 修改前检查

- 参数变化是否同时影响两个 bin。
- 交互默认值与非交互规范化是否一致。
- 模板路径是目录、包含必需文件且 Profile 版本兼容。
- 复制/替换失败是否会留下目标目录。
- 模板新增占位符是否同步 CLI 清单。
- README、docs/project.yaml、发布包元数据是否一致。
