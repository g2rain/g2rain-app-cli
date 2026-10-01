# Shell 双协议兼容升级方案

状态：`Implemented`  
适用版本：`g2rain-shell-template` 与 `create-g2rain-app shell` 的兼容性升级。  
跨仓交付：`g2rain-shell-template`（默认模板 + `legacy-overlay/`）与 `g2rain-app-cli`（`template-shell/` + `template-shell-legacy/` + `--with-legacy`）。

## 1. 决策

AppKit 是 Shell 的唯一核心协议。`legacy` 不是第二种核心运行链路，也不进入 Workspace、菜单、实例、公开 props 或 AppKit 的类型定义。

只有在创建 Shell 时显式选择 `--with-legacy`，生成结果才包含 legacy 兼容模块。该模块位于 Shell 边缘，可在所有存量应用迁移后整体删除；未启用该选项的 Shell 不包含 legacy 类型、配置、适配器、消息映射或测试。

```text
菜单 → Definition（核心事实） → Workspace / RuntimeStore → AdapterResolver → Protocol adapter → Shared Loader → qiankun
                                                                              ↑
                                              可选 legacy boundary（仅 --with-legacy，经 shell-extensions 接线）
```

该边界的目的只是把旧 props、旧消息和旧认证行为转换为 Shell 内部的统一动作。它不得创建第二套 Tab、Router、实例表、Token Store、qiankun handle 或操作队列。

## 2. 核心模型与可选模型

默认模板中的定义只描述所有微应用都需要的运行事实：

```ts
interface MicroAppDefinition {
  applicationCode: string
  name: string
  entry: string
  contextPath: string
  activeRule: string
}
```

`RuntimeStore` 始终通过 `createMainPlatform().buildPublicProps(...)` 构造 AppKit 公开 props，并使用已有 per-`instanceId` 队列、shared loader、qiankun handle 和清理顺序。协议选择不进入 Definition。

当生成了 legacy 支持时，才增加下列**边缘模块**（源码在模板仓 `legacy-overlay/`，CLI 同步为 `template-shell-legacy/`）：

```text
src/platform/legacy/
  registry.ts             # 仅 legacy applicationCode → LegacyIntegrationSpec
  adapter.ts              # legacy props / lifecycle 映射
  types.ts                # LegacyMountProps 等模块私有类型；不扩散到 Workspace
  README.md               # 每项迁移记录、删除条件与安全限制
src/components/micro-app/legacy-message-bridge.ts
src/runtime/shell-extensions.ts   # 覆盖默认 no-op：setAdapterResolver + startLegacyMessageBridge
```

`registry.ts` 只允许登记仍需兼容的应用编码。未命中时一律使用默认 AppKit adapter；禁止根据 URL、entry、菜单名、路由或子应用 window 变量猜测协议。  
legacy adapter 与 message bridge **只查 registry**，禁止再读 `MicroAppDefinition` 上的协议字段（核心模型不再持久化此类字段）。

## 2.1 三层分离与接线硬约束

| 层 | 职责 | 默认模板 | `--with-legacy` |
| --- | --- | --- | --- |
| Shared Loader | qiankun handle 表、`loadMicroApp` | 唯一实现 | 同一实例，禁止复制 |
| Protocol Adapter | mount/update props 转换 | AppKit 透传 | registry 命中时注入 legacy Token props |
| AdapterResolver | `applicationCode → Protocol Adapter` | 恒返回 AppKit | legacy-aware resolver |

接线方式（唯一允许）：

1. 默认模板提供稳定钩子 `src/runtime/shell-extensions.ts`（默认 `installShellExtensions()` 为空实现）。
2. `boot.ts` 调用 `installShellExtensions()`；覆盖层**只覆盖**该文件及 `src/platform/legacy/**`、`legacy-message-bridge` 等边缘文件。
3. **禁止**分叉或复制 `runtime.store.ts`、第二套 loader、或把协议字段写回 Definition / Workspace。

覆盖层源码位置：

| 位置 | 仓库 | 角色 |
| --- | --- | --- |
| `legacy-overlay/` | `g2rain-shell-template` | 覆盖层源码（相对项目根路径镜像） |
| `template-shell/` | `g2rain-app-cli` | 基础快照；sync **排除** `legacy-overlay/` |
| `template-shell-legacy/` | `g2rain-app-cli` | 由 `legacy-overlay/` sync；仅 `--with-legacy` 时 merge |

## 2.2 参考实现与本方案的收敛

实现边界以仓库 `g2rain-admin-shell`（测试仓，相对路径 `src/platform/apps/`、`src/components/micro-app/legacy-message-bridge.ts`）为行为参考，复用其已验证的三个关键做法：

| 参考实现 | 可复用的做法 | 本模板的收敛要求 |
| --- | --- | --- |
| `src/platform/apps/qiankun-adapter.ts` | 两种协议共用一个 loader / handle 表 | 保持一个 loader，legacy 不得自行创建 qiankun handle 表 |
| `src/platform/apps/adapters/{appkit,legacy}-adapter.ts` | AppKit 透传公开 props；legacy 只在 adapter 中补旧 props | 放到可选覆盖层；默认模板不出现 legacy adapter |
| `src/components/micro-app/legacy-message-bridge.ts` | 旧 `TOKEN_INVALID` 归一化后复用 Shell 刷新与定向响应 | 仅覆盖层 `shell-extensions` 注册；判定源改为 **registry** |
| `src/platform/apps/application-code.config.ts` | 仅 legacy applicationCode 列表，未登记默认 AppKit | 移入 `src/platform/legacy/registry.ts` |

参考 Shell 当前把 `mode`、`protocolVersion` 写进 `MicroAppDefinition` 并由 `RuntimeStore` 按 mode 选 adapter——可作为迁移期行为参考，但**不是**本模板目标核心模型。

## 3. 适配器选择

核心运行时只依赖：

```ts
type AdapterResolver = (applicationCode: string) => ShellMicroAppAdapter

interface ShellMicroAppAdapter {
  mount(input: MountInput): Promise<void>
  update(instanceId: string, props: MainPublicProps): Promise<void>
  unmount(instanceId: string): Promise<void>
  has(instanceId: string): boolean
}
```

- RuntimeStore 入参与 AppKit 出口始终是 `MainPublicProps`。
- legacy 注入的 `token` / `tokenKid` / `client` 仅存在于 `src/platform/legacy/types.ts` 的私有 `LegacyMountProps`，在 protocol adapter 出口交给 Shared Loader；不得扩散到 Workspace / Definition / `@g2rain/platform/main`。
- 默认：`createAppkitAdapterResolver(sharedLoader)`。
- `--with-legacy`：`shell-extensions` 调用 `setAdapterResolver(createLegacyAwareAdapterResolver(sharedLoader, legacyRegistry))`。

任何 legacy 特有的 Token props、旧事件名或负载都只能存在于该边缘层。AppKit 的 `MainPublicProps`、`RuntimeContext` 和默认消息桥仍禁止 Token、Token Kid、client、私钥与 Secret。

## 4. CLI 与模板变体

```text
g2rain-app shell <project-name> [--context-path <path>] [--port <number>] [--with-legacy]
```

| 创建方式 | 生成内容 | 使用边界 |
| --- | --- | --- |
| 默认（未传参数） | 仅 AppKit Shell | 新项目和已完成迁移的 Shell |
| `--with-legacy` | AppKit Shell + legacy 覆盖层 | 仅用于明确列出的存量应用迁移期 |

CLI 实现要点：

1. `frontend-shell` family：`withLegacy?: boolean`；仅 `shell` / `--family frontend-shell`；`app`、`generate`、`build-config` 拒绝该参数。
2. 名称统一 `--with-legacy`；默认 `false`；不得按项目名或环境自动开启。
3. 先 copy `template-shell/`，仅 `withLegacy === true` 时 merge `template-shell-legacy/`。
4. identity 写入 `docs/project.yaml`：`legacyCompatibility: true | false`、CLI 版本、模板 Ref；README 仅在 `true` 时显示迁移警告。
5. `verifyFrontendShell`：默认不得含 `src/platform/legacy/`；启用后必须含 registry、adapter、README 与至少一个边界测试。
6. 两组隔离验证：默认可构建且无 legacy；`--with-legacy` 可构建，并覆盖挂载/更新/关闭与消息映射（单测或 fixture）。

CLI 不得通过文本替换把 `mode` 或 `protocolVersion` 注入核心源码。

## 5. 迁移与下线

1. **修复基线**：恢复默认 Shell 编译与 AppKit 单协议；默认模板不得引用 legacy 文件。
2. **引入可选覆盖层**：实现并验证 `--with-legacy`；registry 初始为空。
3. **逐应用迁移**：每编码单独登记迁移记录、验收、回滚与计划删除日期；失败只回滚该 registry 条目。
4. **应用退出**：完成 AppKit 接入后删除 registry 条目、专属映射与测试。
5. **Shell 退出**：registry 为空后，删除覆盖层文件并恢复默认 `shell-extensions.ts`，或新建不带 `--with-legacy` 的 Shell。
6. **CLI 下线**：全部受支持 Shell 不再需要覆盖层后，先 deprecated，再在破坏性版本移除参数与 `template-shell-legacy/`。

## 6. 验收矩阵

| 场景 | 默认 Shell | `--with-legacy` Shell |
| --- | --- | --- |
| TypeScript / production build | 必须通过 | 必须通过 |
| AppKit 子应用 mount、Locale update、路由、关闭 | 必须通过 | 必须通过且行为相同 |
| 默认产物包含 legacy 文件或配置 | 必须失败 | 不适用 |
| 存量 legacy 子应用（未迁 AppKit） | 按 AppKit 挂载/鉴权，**无协议降级**；失败须可观测（日志/错误页） | registry 命中后 mount / update / unmount 必须通过 |
| 未登记应用 | 一律 AppKit | 一律 AppKit |
| Token / private client 出现在 AppKit props、URL、日志 | 必须失败 | 必须失败；仅 adapter 内受控转换可例外并登记偏差 |
| legacy `TOKEN_INVALID`（仅 `data.applicationCode`）单实例 | 不适用 | 必须刷新并定向响应 |
| 同 applicationCode 多实例且有激活 Tab | 不适用 | 路由到激活实例 |
| 同 applicationCode 多实例且无激活 Tab | 不适用 | warn，**不得**向错误实例回票 |
| 删除最后一个 legacy registry 条目后的构建 | 不适用 | 必须通过，并可移除覆盖层 |

## 7. 当前代码的收敛要求

升级时先从默认模板移除 `MicroAppDefinition.mode`、`protocolVersion` 及对 `application-code.config` 的引用，恢复可构建性；**不得**以补默认配置文件把 legacy 永久固化进核心。行为参考 `g2rain-admin-shell` 的共享 loader、adapter 与 legacy message bridge，协议选择迁到可选 resolver / registry。

过渡期间，legacy Token-in-props 或旧事件映射必须登记到 `docs/architecture/deviations.md`（受影响应用、风险、删除条件）。

## 8. 关联文档

- 中央 [Main Shell 契约](https://github.com/g2rain/g2rain/blob/main/docs/architecture/profiles/frontend-shell/main-shell-contract.md)
- 中央 [应用编码兼容方案](https://github.com/g2rain/g2rain/blob/main/docs/architecture/profiles/frontend-shell/application-code-compatibility.md)
- [Platform Main 采纳说明](../development/platform-main-adoption.md)
- `g2rain-app-cli`：`docs/development/command-interface.md`、`docs/development/template-contract.md`
