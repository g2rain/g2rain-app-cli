const STORAGE_KEY = 'g2rain.locale';

export function loadSavedLocale(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function saveLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (error) {
    console.warn('[LocaleStorage] 保存语言选择失败:', error);
  }
}
