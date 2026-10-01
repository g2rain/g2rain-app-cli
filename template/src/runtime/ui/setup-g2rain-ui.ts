/**
 * 装配 @g2rain/ui：基础 UI 上下文由 G2rainUi 提供，组织/字典数据
 * Provider 由 G2rainPlatformUi 提供。组合根职责留在 runtime；Token / API
 * 由本应用注入，不进入公共包。
 */
import type { App } from 'vue';
import { G2rainUi } from '@g2rain/ui';
import { G2rainPlatformUi } from '@g2rain/ui/platform';
import '@g2rain/theme/styles.css';
import '@g2rain/ui/style.css';
import { t } from '@platform/i18n';
import { useAccessTokenStore, useLocaleStore } from '@platform/stores';
import { OrganApi } from '@/views/organ/api';
import { DictItemApi } from '@/views/dict/api';

export function setupG2rainUi(app: App): void {
  app.use(G2rainUi, {
    translate: (key, fallback) => t(key, fallback),
    locale: () => {
      try {
        return useLocaleStore().locale;
      } catch {
        return undefined;
      }
    },
  });
  app.use(G2rainPlatformUi, {
    onMissingProvider: (name) => {
      if ((import.meta.env as { DEV?: boolean }).DEV) {
        console.warn(`[G2rainUi] missing data provider: ${name}`);
      }
    },
    dataProviders: {
      organ: {
        loadOptions: async (params) => {
          const rows = await OrganApi.searchOrgans({
            key: params.key,
            value: params.value,
          });
          return rows as unknown as Array<Record<string, unknown>>;
        },
        getPolicy: () => {
          try {
            const tokenStore = useAccessTokenStore();
            return {
              defaultValue: tokenStore.isAdminCompany ? null : (tokenStore.organId ?? null),
              clearable: tokenStore.isAdminCompany,
              autoSelectFirstWhenEmpty: !tokenStore.isAdminCompany && tokenStore.organId == null,
            };
          } catch {
            return {
              defaultValue: null,
              clearable: true,
              autoSelectFirstWhenEmpty: false,
            };
          }
        },
      },
      dict: {
        loadOptions: async (params) => {
          const usageCode = params.usageCode?.trim() || params.dictCode?.trim();
          const code = params.code?.trim();
          const keyFromQuery =
            typeof params.query?.key === 'string' ? params.query.key.trim() : undefined;
          return DictItemApi.select({
            usageCode,
            code,
            key: keyFromQuery,
          });
        },
      },
    },
  });
}
