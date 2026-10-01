# Views 规范

`src/views` 保存生成后应用的业务页面。模板生成器以表为单位创建以下结构：

```text
src/views/<module>/
├── index.vue
├── api.ts
├── type.ts
└── mock.ts       # 可选
```

复杂页面可以增加局部 components、composables 或子资源目录，但它们默认只属于当前页面，不从全局 components 出口导出。

## index.vue

- 负责页面组合和用户交互，不直接定义 HTTP 客户端实现。
- 使用同目录 `api.ts` 和 `type.ts`。
- `QueryForm` 的 `v-model`（如 `baseQueryForm`）使用 `ref`，脚本中通过 `.value` 读写；从 `@g2rain/ui` 导入，生成模板 `view.ejs` 已按此约定。
- 通用交互优先使用 components，平台状态使用 platform，启动/认证适配使用 runtime。
- 页面之间不直接深度引用；共享业务能力先明确所有权，再选择 runtime 或独立模块。
- 权限点使用静态 `v-permission="'namespace:action'"`，动态表达式当前无法被资源生成器扫描。

## api.ts

- API 类通常命名为 `{ModuleName}Api`，方法使用静态方法或模块函数，项目内保持一致。
- 获取 `getHttpClient('default')` 后调用 Gateway 路径。
- 常用方法命名为 `list`、`page`、`getById`、`save`、`remove`，但应服从后端真实用例，不强行包装不存在的 CRUD。
- 显式声明请求和响应类型；Mock 需要自动注册时可副作用导入 `./mock`。
- 页面组件不得重复实现 api.ts 已有的请求和响应转换。

## type.ts

- 查询条件使用 `{ModuleName}Query`，写入载荷使用 `{ModuleName}Payload`，读取模型使用清晰领域名。
- 读取模型可以继承 `BaseVo`，分页查询可以组合 `BaseSelectListDto`/`PageSelectListDto`。
- Payload 不应无差别复制服务端所有审计、权限或敏感字段。
- 后端 `BIGINT` 是否安全映射为 JavaScript number 必须由接口契约确认，不能由生成器默认决定。

## mock.ts

- 仅开发/显式 Mock 模式生效。
- 返回结构与真实接口保持一致，数据符合 type.ts。
- 不复制生产数据、Token、手机号等敏感信息。
- Mock 通过不能替代真实 Gateway/IAM 联调。

## route-map.ts

后端资源的 `linkPath` 必须能在 `views/route-map.ts` 找到组件：

```typescript
export const routeMap = {
  '/member': {
    component: () => import('@/views/member/index.vue'),
    name: 'Member',
    meta: { title: '会员管理', requiresAuth: true, showInHome: true },
  },
};
```

路径以 `/` 开头并与资源配置一致。正式页面应使用静态注册，不能依赖运行时任意字符串 import 被 Vite 自动打包。

## 页面完成检查

1. 页面、API 和类型职责清晰。
2. route-map 已注册且 linkPath 一致。
3. 权限编码稳定并可被生成器扫描。
4. 资源配置已重新生成和 Review。
5. 独立模式与 qiankun 模式的路由、Token、语言均验证。
6. `npm run build` 通过。
