# g2rain-app-template 国际化用法

登录后拉取 `.env` 中 `VITE_I18N_TAGS` 配置的文案包；HTTP 自动带 `Accept-Language`（当前 `localeStore.locale`，如 `zh-CN`）。

## 三种写法

| 场景 | 写法 |
|------|------|
| 模板 | `{{ $t('MESSAGE_CODE', '页面默认文案') }}` |
| JS 要一段文字 | `t('MESSAGE_CODE', '页面默认文案')` |
| JS 弹提示 | `ElMessage.success(t('MESSAGE_CODE', '操作成功'))` |

## 文案包 tags（`.env`）

- 配置项：`VITE_I18N_TAGS`（见 `.env` / `.env.production`，逗号分隔）
- 脚手架默认：`G2RAIN_SHARED`（无独立应用 tag；从模板生成新应用后追加，如 `G2RAIN_SHARED,MANAGER`）
- 顺序：**`G2RAIN_SHARED` 在前**（公共文案），**应用 tag 在后**（同名 `message_code` 由应用覆盖公共）
- 实现：`runtime/api/i18n.api.ts` 读取 `env.VITE_I18N_TAGS`，请求参数名为 **`tags`**
- 拉包：`GET /api/infra/i18n_message/locale?tags=G2RAIN_SHARED&locale=zh-CN`

## 约定

- 文案编码与后台 `i18n_message.message_code` 一致；页面 key 建议带模块前缀。
- 模板不要用 `useI18n`，已开启 `globalInjection`，直接用 `$t`。
- 样例见 `views/Home.vue`（示例 key 前缀 `TEMPLATE_HOME_*` 仅为 message_code 命名，不是 i18n tag）。
- 代码生成器：`view.ejs` 中业务标题/列名仍为硬编码中文；按钮、通用字段、提示消息使用 `G2_*` 共享 key。

## 页面默认值

第二个参数写在**当前页面**：后台未配置时用默认文案，有配置则用后台。

## 独立运行（`mode=alone`）

- `localeBoot` 登录后拉 `code_name_map`，`Home.vue` 顶部语言下拉与主应用 Header 一致。
- 切换语言会重新拉文案包并写入 `localStorage`（`g2rain.locale`）。

## 集成运行（qiankun）

- 不展示语言下拉；使用主应用 props 的 **`locale`**。
- `mount` / `update` 时调用 `localeStore.applyFromMain(locale)` 拉包。
