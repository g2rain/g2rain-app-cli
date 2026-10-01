/**
 * 路径规范化（与 main-shell shared/url.util 语义对齐，供网关等使用）
 */

export function normalizePathname(pathname: string): string {
  const p = `/${(pathname || '').trim()}`.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) {
    return p.slice(0, -1);
  }
  return p || '/';
}

/**
 * 拆分 pathname 与 ?query / #hash
 */
export function splitPathAndSuffix(fullPath: string): { pathname: string; suffix: string } {
  const q = fullPath.indexOf('?');
  const h = fullPath.indexOf('#');
  if (q < 0 && h < 0) {
    return { pathname: fullPath, suffix: '' };
  }
  const cut = Math.min(q >= 0 ? q : Infinity, h >= 0 ? h : Infinity);
  return {
    pathname: fullPath.slice(0, cut) || '/',
    suffix: fullPath.slice(cut),
  };
}

/** 当前浏览器完整路径（pathname + search + hash） */
export function getCurrentBrowserFullPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** pathname 是否等于 prefix 或以其为路径前缀 */
export function matchesPathPrefix(pathname: string, prefix: string): boolean {
  const normalized = normalizePathname(pathname);
  const normalizedPrefix = normalizePathname(prefix);
  return (
    normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`)
  );
}
