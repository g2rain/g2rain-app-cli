## Loading 管理器组件说明

本目录提供一个**组件层的全局 Loading 管理器**，用于在各类请求（例如 HTTP 拦截器、业务操作）中统一展示和关闭全局 Loading。

### 目录结构

- `loading.ts`：`LoadingManager` 实现与单例导出。
- `index.ts`：对外导出入口，统一暴露 `loadingManager` 与 `LoadingOptions` 类型。

> 注意：原有的 `src/runtime/http/loading.ts` 已删除，所有代码已迁移到 `@/components/loading`。
> 请统一使用 `@/components/loading` 下的导出。

### 使用方式

```ts
import { loadingManager } from '@/components/loading';

async function doSomething() {
  try {
    loadingManager.show({ text: '处理中...' });
    // 执行异步操作
  } finally {
    loadingManager.hide();
  }
}
```
