import { watch } from 'vue';
import { useAccessTokenStore } from '@platform/stores';
import { useLocaleStore } from '@platform/stores/locale.store';
import { isQiankunRuntime } from '@shared/utils/mode.util';

class LocaleBoot {
  private stopWatch: (() => void) | null = null;

  async initLocale(): Promise<void> {
    const tokenStore = useAccessTokenStore();
    const localeStore = useLocaleStore();

    if (!tokenStore.isLogin) {
      return;
    }

    if (localeStore.initialized) {
      return;
    }

    await localeStore.initialize();
  }

  start(): void {
    if (isQiankunRuntime()) {
      console.log('[LocaleBoot] 集成模式，语言由主应用 locale 驱动');
      return;
    }

    const tokenStore = useAccessTokenStore();
    const localeStore = useLocaleStore();

    if (this.stopWatch) {
      this.stopWatch();
    }

    if (tokenStore.isLogin && !localeStore.initialized) {
      this.initLocale().catch((error) => {
        console.error('[LocaleBoot] 启动时加载语言列表失败:', error);
      });
    }

    this.stopWatch = watch(
      () => tokenStore.isLogin,
      (isLogin) => {
        if (isLogin) {
          this.initLocale().catch((error) => {
            console.error('[LocaleBoot] 登录后加载语言列表失败:', error);
          });
        }
      },
    );

    console.log('[LocaleBoot] 已开始监听登录状态（独立运行）');
  }

  stop(): void {
    if (this.stopWatch) {
      this.stopWatch();
      this.stopWatch = null;
    }
  }
}

export const localeBoot = new LocaleBoot();
