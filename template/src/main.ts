import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import type { Router } from 'vue-router';
import { createStandardSubPlatform, createSubDirectedMessage, resolveSubHostProps } from '@g2rain/platform/sub';
import type { ResolvedSubHost } from '@g2rain/platform/sub';
import type { RuntimeContext } from '@g2rain/platform';
import { createThemeCapability } from '@g2rain/platform/theme';
import App from './App.vue';
import { initRouter, updateRouter } from '@runtime/router';
import { setupStore } from '@platform/stores/setup';
import { i18n, loadAndApplyI18nMessages, t } from '@platform/i18n';
import { localeBoot } from '@runtime/boot/locale.boot';
import { isAloneMode } from '@shared/utils/mode.util';
import { redirectToMainShellGatewayIfNeeded } from '@shared/utils/shell-gateway.util';
import { getQiankunSubAppEventAdapter, registerQiankunLifecycle } from '@platform/apps';
import type { MicroAppProps } from '@platform/apps';
import { requestSharedAuth } from '@platform/apps';
import {
  initApplicationResources,
  initRoutesFromResources,
  isSsoCallbackPath,
  setupTokenExpiredWatcher,
  teardownTokenExpiredWatcher,
} from '@runtime/boot';
import { permissionPlugin } from '@/components/permission';
import { setupG2rainUi } from '@runtime/ui/setup-g2rain-ui';
import { showErrorMessage } from '@/components/ErrorMessage';
import { loadElementPlusLocaleByCode } from '@platform/locale';
import { useLocaleStore } from '@platform/stores/locale.store';
import { env } from '@shared/env';
import { sso } from '@runtime/auth';
import { updateHttpBaseURLFromHost } from '@runtime/http';
import type { MicroAppMessageUnion } from '@/components/micro-app';

const STANDALONE_INSTANCE_ID = '__g2rain_standalone__';

const APPLICATION_CODE = env.VITE_APPLICATION_CODE;
const CONTEXT_PATH = env.VITE_CONTEXT_PATH || '/';

function hostDefaults() {
  return {
    applicationCode: APPLICATION_CODE,
    contextPath: CONTEXT_PATH,
  };
}

function markQiankunRuntime(): void {
  (window as Window & { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__ = true;
}

function resolveMountNode(container: HTMLElement): HTMLElement {
  if (container.id === 'app') {
    return container;
  }

  const existing = container.querySelector('#app');
  if (existing instanceof HTMLElement) {
    existing.innerHTML = '';
    return existing;
  }

  const mountNode = document.createElement('div');
  mountNode.id = 'app';
  container.innerHTML = '';
  container.appendChild(mountNode);
  return mountNode;
}

function withHostMetadata(resolved: ResolvedSubHost): RuntimeContext {
  const metadata: Record<string, string> = {};
  if (resolved.host.activeRule) {
    metadata.activeRule = resolved.host.activeRule;
  }
  if (resolved.host.entryOrigin) {
    metadata.entryOrigin = resolved.host.entryOrigin;
  }
  if (Object.keys(metadata).length === 0) {
    return resolved.context;
  }
  return {
    ...resolved.context,
    metadata,
  };
}

function readMetadata(context: RuntimeContext, key: string): string | undefined {
  const value = context.metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function currentI18nLocale(): string {
  const fromStore = useLocaleStore().locale;
  if (fromStore) {
    return fromStore;
  }
  const locale = i18n.global.locale;
  return typeof locale === 'string' ? locale : locale.value;
}

async function replaceIfMatched(router: Router, initialRoute: string | undefined): Promise<void> {
  if (!initialRoute) {
    return;
  }
  await router.isReady();
  const resolved = router.resolve(initialRoute);
  if (resolved.matched.length > 0) {
    await router.replace(initialRoute);
  }
}

async function settleInitialRoute(router: Router, initialRoute: string | undefined): Promise<void> {
  await router.isReady();
  if (initialRoute) {
    const resolved = router.resolve(initialRoute);
    if (resolved.matched.length > 0) {
      await router.replace(initialRoute);
      return;
    }
  }

  const current = router.currentRoute.value;
  if (current.matched.length > 0) {
    return;
  }
  if (current.path !== '/' && current.path !== '') {
    return;
  }
  const home = router.getRoutes().find((route) => route.path === '/');
  if (home) {
    await router.replace('/');
  }
}

function bindRouteSync(router: Router, context: RuntimeContext): () => void {
  const activeRule = readMetadata(context, 'activeRule');
  if (context.mode !== 'integrated' || !activeRule) {
    return () => undefined;
  }

  return router.afterEach((to) => {
    const routePath = to.path;
    const fullPath = `/${activeRule}/${routePath}`.replace(/\/{2,}/g, '/');
    const message = createSubDirectedMessage(
      {
        applicationCode: context.applicationCode,
        viewId: context.viewId,
        instanceId: context.instanceId,
      },
      'g2rain:sub-app:route-change',
      {
        appKey: context.instanceId,
        activeRule,
        routePath,
        fullPath,
      },
    );
    getQiankunSubAppEventAdapter().emitEvent(message as MicroAppMessageUnion);
  });
}

async function createRouterForContext(context: RuntimeContext): Promise<Router> {
  if (context.mode === 'standalone' && isSsoCallbackPath()) {
    return initRouter([]);
  }

  try {
    await initApplicationResources();
    const resourceRoutes = await initRoutesFromResources();
    return initRouter(resourceRoutes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.mode === 'standalone' && message.includes('未登录')) {
      await sso.redirectToSSO();
      return initRouter([]);
    }
    console.error('[platform] 资源路由初始化失败:', error);
    if (context.mode === 'integrated') {
      throw new Error('MAIN_AUTH_BRIDGE_UNAVAILABLE');
    }
    throw error;
  }
}

function installApplication(vueApp: VueApp): void {
  setupStore(vueApp);
  setupTokenExpiredWatcher();
  vueApp.use(i18n);
  vueApp.use(ElementPlus);
  setupG2rainUi(vueApp);
  vueApp.use(permissionPlugin);
  localeBoot.start();
}

const definition = createStandardSubPlatform({
  applicationCode: APPLICATION_CODE,
  async createApplication(context) {
    const vueApp = createApp(App);
    installApplication(vueApp);

    const ssoCallback = context.mode === 'standalone' && isSsoCallbackPath();
    const router = await createRouterForContext(context);
    vueApp.use(router);
    const stopRouteSync = bindRouteSync(router, context);

    return {
      async mount(container) {
        if (ssoCallback) {
          vueApp.mount(resolveMountNode(container));
          try {
            await initApplicationResources(router);
            const returnUrl = localStorage.getItem('return_url') || '/';
            localStorage.removeItem('return_url');
            await router.replace(returnUrl);
            await router.isReady();
          } catch (error) {
            console.error('[platform] SSO 回调后资源加载失败:', error);
          }
          return;
        }
        // 先结算初始路由再 mount，避免 MemoryHistory 默认 / 先闪出 Home
        await settleInitialRoute(router, context.initialRoute);
        vueApp.mount(resolveMountNode(container));
      },
      async update(next) {
        if (APPLICATION_CODE) {
          try {
            const resourceRoutes = await initRoutesFromResources();
            updateRouter(router, resourceRoutes);
          } catch (error) {
            console.error('[platform] 路由更新失败:', error);
          }
        }
        await replaceIfMatched(router, next.initialRoute);
      },
      unmount() {
        stopRouteSync();
        localeBoot.stop();
        vueApp.unmount();
      },
    };
  },
  i18n: {
    engine: {
      getLocale: currentI18nLocale,
      async setLocale(locale) {
        await useLocaleStore().applyFromMain(locale);
      },
      translate(key) {
        return t(key);
      },
      loadMessages(locale) {
        return loadAndApplyI18nMessages(locale);
      },
    },
    uiLocale: {
      async applyLocale(locale) {
        await loadElementPlusLocaleByCode(locale);
      },
    },
  },
  error: {
    unknownMessage: '未知错误',
    presenter: {
      present(_error, message) {
        showErrorMessage(message);
      },
    },
    actions: {
      async handle(action) {
        if (action === 'reauthenticate') {
          await sso.redirectToSSO();
        }
      },
    },
  },
  capabilities: [createThemeCapability()],
});

async function mountIntegrated(props: MicroAppProps): Promise<void> {
  if (!props.container) {
    throw new Error('qiankun mount: container 未提供');
  }

  markQiankunRuntime();
  const resolved = resolveSubHostProps(props, hostDefaults());
  if (import.meta.env.DEV) {
    console.log('[qiankun] mount', {
      instanceId: resolved.instanceId,
      viewId: resolved.context.viewId,
      applicationCode: resolved.context.applicationCode,
      locale: resolved.context.locale,
      initialRoute: resolved.context.initialRoute,
      activeRule: resolved.host.activeRule,
    });
  }

  // IAM 拉钥走 auth client，基址必须先于 Token 初始化。
  updateHttpBaseURLFromHost(resolved.host);

  // 挂载前向 Shell 请求共享认证；禁止在未登录态初始化资源。
  await requestSharedAuth(resolved.context, { reason: 'mount' });

  try {
    await definition.mount({
      instanceId: resolved.instanceId,
      context: withHostMetadata(resolved),
      container: props.container,
    });
  } catch (error) {
    teardownTokenExpiredWatcher();
    throw error;
  }
}

async function updateIntegrated(props: MicroAppProps): Promise<void> {
  const resolved = resolveSubHostProps(props, hostDefaults());
  await definition.update(resolved.instanceId, resolved.patch);
}

async function unmountIntegrated(props: MicroAppProps): Promise<void> {
  const resolved = resolveSubHostProps(props, hostDefaults());
  await definition.unmount(resolved.instanceId);
  teardownTokenExpiredWatcher();
}

async function mountStandalone(): Promise<void> {
  const container = document.querySelector('#app');
  if (!(container instanceof HTMLElement)) {
    throw new Error('未找到挂载容器 #app');
  }

  const code = APPLICATION_CODE;
  if (!code) {
    throw new Error('VITE_APPLICATION_CODE 未配置，请在环境变量中配置应用编码');
  }

  try {
    await definition.mount({
      instanceId: STANDALONE_INSTANCE_ID,
      context: {
        applicationCode: code,
        viewId: STANDALONE_INSTANCE_ID,
        instanceId: STANDALONE_INSTANCE_ID,
        mode: 'standalone',
        contextPath: CONTEXT_PATH,
        theme: 'light',
      },
      container,
    });
  } catch (error) {
    teardownTokenExpiredWatcher();
    throw error;
  }
}

registerQiankunLifecycle({
  mount: mountIntegrated,
  update: updateIntegrated,
  unmount: unmountIntegrated,
});

if (redirectToMainShellGatewayIfNeeded()) {
  // location.replace 已发起，等待卸载
} else if (isAloneMode()) {
  if (import.meta.env.DEV) {
    console.log('[main] 独立运行模式 (mode=alone)，应用编码:', APPLICATION_CODE);
  }

  const runStandalone = () => {
    mountStandalone().catch((error) => {
      console.error('[main] 独立运行模式渲染失败:', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStandalone);
  } else {
    runStandalone();
  }
}
