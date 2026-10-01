# 命令接口

用户操作见[使用手册](usage.md)。本文只列命令形状和默认值，供改 CLI 时对照。

## 命令名

```text
create-g2rain-app
g2rain-app
```

两者都指向 `dist/index.js`，行为必须一致。

## 子命令与项目族

| 命令 | 作用 |
| --- | --- |
| `app <name>` | 创建 `frontend-app` 业务子应用 |
| `shell <name>` | 创建 `frontend-shell` Main Shell |
| `create`（可省略） | 兼容入口；**未指定 family 时默认 `frontend-app`**，并打印提示 |
| `generate` | 从 SQL DDL 生成 views / api / mock / route-map（仅 frontend-app） |
| `build-config` | 从 route-map + `v-permission` 生成资源 JSON（仅 frontend-app） |
| `--help` / `app --help` / `shell --help` | 根帮助或分族帮助 |
| `--version` | 打印 CLI 版本 |

等价 family 参数：

```text
create-g2rain-app --family frontend-app --name <project-name>
create-g2rain-app --family frontend-shell --name <project-name>
```

### create / app（frontend-app）

```text
g2rain-app app <project-name> [--context-path <path>]
g2rain-app create [project-name] [--context-path <path>]
g2rain-app [project-name] [--context-path <path>]   # 隐式 create → frontend-app
```

默认 Context Path：去掉 `g2rain-` 前缀与 `-app` 后缀。

模板：包内 `template/`（源仓 `g2rain-app-template`）；覆盖环境变量 `G2RAIN_TEMPLATE_PATH`。

### shell（frontend-shell）

```text
g2rain-app shell <project-name> [--context-path <path>] [--port <number>] [--with-legacy]
g2rain-app --family frontend-shell --name <project-name> [--context-path <path>] [--port <number>] [--with-legacy]
```

默认：

| 参数 | 默认 |
| --- | --- |
| `--context-path` | `admin` |
| `--port` | `3000` |
| `--with-legacy` | `false`（未传则不开启） |

模板：包内 `template-shell/`（源仓 `g2rain-shell-template`）；覆盖环境变量 `G2RAIN_SHELL_TEMPLATE_PATH`。

`--with-legacy` 仅允许用于 `shell` / `--family frontend-shell`；`app`、`generate`、`build-config` 必须拒绝。开启后在基础 `template-shell/` 之上 merge 包内 `template-shell-legacy/`（源仓 `legacy-overlay/`），并在 `docs/project.yaml` 写入 `generation.legacyCompatibility: true`。默认生成物不得包含 `src/platform/legacy/`。

不得使用 `g2rain-app-template` 或 `g2rain-main-shell` 作为 Shell 模板源。

### generate

```text
g2rain-app generate --tables=<a,b> [--cwd .] [--sql path] [--views path] [--route-map path]
                     [--no-view|--skip-view] [--no-api|--skip-api] [--no-mock|--skip-mock] [--no-route|--skip-route]
```

亦可通过环境变量 `G2RAIN_TABLES=a,b` 提供表名。

### build-config

```text
g2rain-app build-config [--cwd .] [--route-map path] [--views path] [--out path]
```

当前不生成 `api-endpoints.json`。

## 退出行为

- 目标目录已存在（create）：退出 1
- 缺参 / 校验失败：退出 1
- 未知 `-` 选项：**报错退出 1**
- 包内模板或族专用 env 覆盖无效：退出 1

## 扩展点

新增项目族时注册 `src/families/<family>/definition.ts`（参数 schema、模板目录、identity、verify、help），并在 `registry.ts` 登记；避免在 `create.ts` 堆叠大型 if/else。
