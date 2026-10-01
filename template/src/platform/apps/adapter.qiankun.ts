/**
 * Qiankun 子应用入口。
 * 只注册 vite-plugin-qiankun 生命周期，并把 mount/update/unmount 交给组合根。
 * Vue、Router 和 Scope 由 @g2rain/platform/sub 管理，这里不保存实例 Map。
 */

import type { MicroAppProps } from './types';
import { WindowEventSubAppEventAdapter } from '@/components/micro-app/event-windows-adapter';
import { renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';
import { initMicroAppMessageHandlers } from './message-handlers';

export class QiankunSubAppEventAdapter extends WindowEventSubAppEventAdapter {}

const qiankunEventAdapter = new QiankunSubAppEventAdapter();

export function getQiankunSubAppEventAdapter(): QiankunSubAppEventAdapter {
  return qiankunEventAdapter;
}

export interface QiankunLifecycleHandlers {
  mount(props: MicroAppProps): Promise<void>;
  update(props: MicroAppProps): Promise<void>;
  unmount(props: MicroAppProps): Promise<void>;
}

/**
 * TOKEN_RESPONSE 处理器在模块生命周期里注册一次，写入共享 Token Store，不按 Tab 拆。
 */
export function registerQiankunLifecycle(handlers: QiankunLifecycleHandlers): void {
  qiankunEventAdapter.initEventListeners();
  initMicroAppMessageHandlers(qiankunEventAdapter.getMessageProcessor());

  renderWithQiankun({
    async bootstrap() {
      // 尽早标记 qiankun，避免 Token Store persist 在模块求值后误用独立模式策略。
      (window as Window & { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__ = true;
      if (import.meta.env.DEV) {
        console.log('[qiankun] 子应用启动');
      }
    },

    async mount(props: MicroAppProps) {
      await handlers.mount(props);
    },

    async update(props: MicroAppProps) {
      await handlers.update(props);
    },

    async unmount(props: MicroAppProps) {
      await handlers.unmount(props);
    },
  });
}
