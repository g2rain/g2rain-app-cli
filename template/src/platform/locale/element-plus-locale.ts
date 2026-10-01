import type { Language } from 'element-plus/es/locale';

/** Vite 可分析的 EP 语言包索引（key 如 zh-cn、en） */
const epLocaleLoaders = import.meta.glob<{ default: Language }>(
  '/node_modules/element-plus/es/locale/lang/*.mjs',
);

async function loadEpLocaleByKey(key: string): Promise<Language | undefined> {
  const suffix = `/${key}.mjs`;
  const loader = Object.entries(epLocaleLoaders).find(([path]) => path.endsWith(suffix))?.[1];
  if (!loader) {
    return undefined;
  }
  const mod = await loader();
  return mod.default;
}

/**
 * 由后端 locale code（如 zh-CN、en-US）加载 Element Plus 语言包。
 * 依次尝试「完整码小写」「仅语言段」，与 EP 包名（zh-cn、en、ja…）对齐。
 */
export async function loadElementPlusLocaleByCode(localeCode: string): Promise<Language> {
  const normalized = localeCode.trim().toLowerCase().replace('_', '-');
  const lang = normalized.split('-')[0] ?? '';
  const candidates = [...new Set([normalized, lang].filter(Boolean))];

  for (const key of candidates) {
    const locale = await loadEpLocaleByKey(key);
    if (locale) {
      return locale;
    }
  }

  const fallback = await loadEpLocaleByKey('zh-cn');
  if (fallback) {
    return fallback;
  }

  const mod = await import('element-plus/es/locale/lang/zh-cn.mjs');
  return mod.default as Language;
}
