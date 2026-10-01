# Micro App 事件组件

微前端事件组件，提供类型安全的事件系统，用于主应用与子应用之间的通信。

## 使用方式

### 基本导入

```typescript
import {
  MicroAppEventType,
  MicroAppMessageFactory,
  type TokenRequestMessage,
  type RouteChangeMessage,
  isTokenRequestMessage,
} from '@/components/micro-app';
```

## 创建消息

```typescript
// 创建 Token 请求消息
const request = MicroAppMessageFactory.createTokenRequest(
  { someParam: 'value' },
  'req-123'
);

// 创建路由变化消息
const routeChange = MicroAppMessageFactory.createRouteChange({
  appKey: 'sub-app-1',
  activeRule: '/sub-app-1',
  routePath: '/test/dict',
  fullPath: '/sub-app-1/test/dict',
});
```

## 类型守卫使用

```typescript
function handleMessage(message: MicroAppMessageUnion) {
  if (isTokenRequestMessage(message)) {
    // TypeScript 知道这里是 TokenRequestMessage
    console.log(message.data); // 类型为 TokenRequestData
  } else if (isTokenResponseSuccessMessage(message)) {
    // TypeScript 知道这里是 TokenResponseSuccessMessage
    console.log(message.data.token); // 类型安全
  }
}
```

