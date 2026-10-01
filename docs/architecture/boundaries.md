# 职责边界

## CLI 负责

- 解析交互式和非交互式 **create** 参数，并通过 family registry 分发到 `frontend-app` / `frontend-shell`。
- 选择可信模板来源（app：`template/`；shell：`template-shell/`）；保护目标目录不被覆盖。
- 按契约复制与排除文件；重写项目名、Context Path、端口等占位符与 `docs/project.yaml` 身份。
- **开发期生成引擎**（仅 frontend-app）：`generate` 与 `build-config`。
- 用明确退出码和消息报告结果。
- 让生成项目具备对应中央 Profile 要求的文档与目录基线。

## CLI 不负责

- 生成项目的业务领域规则与最终授权设计。
- 用 `frontend-app` 模板冒充 Main Shell，或从 `g2rain-main-shell` 复制历史实现。
- 平台侧资源导入、IAM 客户端注册或 Gateway 路由配置。
- 默认安装依赖、初始化 Git、创建远程仓库或部署环境。
- 自动升级已有项目到新模板版本。
- 在没有显式需求和失败恢复设计时执行任意 post-create 脚本。
- 浏览器运行时依赖（theme/ui/http/platform）；此类能力属于 `g2rain-appkit`。

## 与模板的契约

- `g2rain-app-template` → 包内 `template/` → `frontend-app`
- `g2rain-shell-template` → 包内 `template-shell/` → `frontend-shell`
- 模板拥有默认目录与占位符；CLI 拥有获取、复制、替换与分族校验。
- App 可通过 `devDependency` + `npm run build:generate|build-config` 调用 CLI bin。

## 与中央 Profile 的关系

CLI 内部不是 Vue App。`app` 输出须符合 `frontend-app`；`shell` 输出须符合 `frontend-shell` 与 appkit Main Shell 生成契约的必填 docs 树。
