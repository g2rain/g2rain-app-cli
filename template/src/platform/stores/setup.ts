/**
 * Platform Stores 初始化
 * 用于在 Vue 应用中设置 Pinia store
 */

import { createPinia, setActivePinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import type { App } from 'vue';

const store = createPinia();
store.use(piniaPluginPersistedstate);
// 认证桥和语言能力会在第一个 Vue 应用 mount 之前读 Store。
setActivePinia(store);

export const setupStore = (app: App<Element>) => {
  app.use(store);
};

export default store;
