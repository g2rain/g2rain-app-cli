/**
 * Join URL / path segments with `/`, keeping only the first `//` (protocol or protocol-relative).
 */
export function joinUrlSegments(...parts: Array<string | undefined | null>): string {
  const input = parts
    .map((p) => p?.trim())
    .filter((p): p is string => !!p)
    .join('/')

  const schemeIdx = input.indexOf('://')
  const start = schemeIdx > 0 ? schemeIdx + 3 : input.startsWith('//') ? 2 : 0

  const chars: string[] = []
  let prevSlash = false

  for (let i = start; i < input.length; i++) {
    const ch = input[i]
    if (ch !== '/' || !prevSlash) {
      chars.push(ch)
    }
    prevSlash = ch === '/'
  }

  return input.slice(0, start) + chars.join('')
}

/**
 * Strip activeRule prefix from a browser path → sub-app internal path.
 * stripActiveRule('/app', '/app/home') → '/home'
 */
export function stripActiveRule(
  activeRule: string | null | undefined,
  path: string | null | undefined,
): string {
  const normalizedRule =
    `/${(activeRule || '').trim()}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
  const normalizedPath = `/${(path || '').trim()}`.replace(/\/+/g, '/')

  if (normalizedRule === '/') {
    return normalizedPath
  }
  if (normalizedPath === normalizedRule) {
    return '/'
  }
  const prefixWithSlash = `${normalizedRule}/`
  if (normalizedPath.startsWith(prefixWithSlash)) {
    return normalizedPath.slice(normalizedRule.length)
  }
  return normalizedPath
}

/**
 * Prefix sub-app internal path with activeRule for the browser address bar.
 * wrapActiveRule('/app', '/home') → '/app/home'
 * wrapActiveRule('/member', '/member') → '/member/member'
 *   (internal route may equal contextPath string; callers must pass INTERNAL paths only)
 * wrapActiveRule('/member', '/') → '/member'
 */
export function wrapActiveRule(
  activeRule: string | null | undefined,
  path: string | null | undefined,
): string {
  const normalizedRule =
    `/${(activeRule || '').trim()}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
  const normalizedPath = `/${(path || '').trim()}`.replace(/\/+/g, '/')

  if (normalizedRule === '/') {
    return normalizedPath
  }
  // Already a full browser path under this rule (has a segment after activeRule).
  // Do NOT treat path === rule as "already wrapped": internal routes may equal contextPath
  // (e.g. activeRule=/member, internal=/member → browser /member/member).
  if (normalizedPath.startsWith(`${normalizedRule}/`)) {
    return normalizedPath
  }
  return normalizedPath === '/' ? normalizedRule : `${normalizedRule}${normalizedPath}`
}

/**
 * Update the browser address bar without triggering Vue Router navigation.
 * pathname must start with `/` (e.g. `/member/member_identity` or `/admin/`).
 */
export function replaceBrowserPathname(pathname: string): void {
  if (typeof window === 'undefined') return
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const url = `${window.location.origin}${normalized}`
  if (window.location.href === url) return
  window.history.replaceState(
    { ...(window.history.state || {}), microApp: true },
    '',
    url,
  )
}

/**
 * Qiankun HTML entry must end with `/` (Vite base is `/member/`; `/member` 404s).
 * `rawEntry` is origin or base URL (e.g. `//localhost:3001`); `contextPath` is `/member`.
 * Public props still use contextPath without trailing slash.
 */
export function resolveMicroAppEntry(rawEntry: string, contextPath: string): string {
  const origin = rawEntry.trim().replace(/\/+$/, '')
  const path = contextPath.trim().replace(/^\/+|\/+$/g, '')
  if (!origin) {
    throw new Error('MicroApp entry origin is required')
  }
  if (!path) {
    return `${origin}/`
  }
  return `${origin}/${path}/`
}
