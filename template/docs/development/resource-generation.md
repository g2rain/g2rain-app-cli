# 资源配置生成

从前端路由和静态 `v-permission` 生成平台配置 JSON。引擎在 **g2rain-app-cli**（`g2rain-app build-config`）。

## 命令

```bash
npm run build:config
```

输入：

- `src/views/route-map.ts`
- route-map 对应页面目录中的 `.vue`

输出目录：`src/shared/config-util/config`

当前实际生成：

- `resources.json`：pages、pageElements；`apiEndpoints` 为空数组
- `pages.json`
- `page-elements.json`

当前不生成 `api-endpoints.json`。

可选路径参数：`--cwd` / `--route-map` / `--views` / `--out`。

## 注意

- 只收集静态 `v-permission="'xxx:yyy'"`；动态绑定不会进入产物。
- 最终导入与鉴权仍由平台服务负责。
