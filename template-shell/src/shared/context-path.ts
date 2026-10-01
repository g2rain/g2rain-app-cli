/** Normalize a route prefix: leading slash, no trailing slash (except root). */
export function normalizeContextPath(value: string, field = 'contextPath'): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${field} is required`)
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (withLeading.length > 1 && withLeading.endsWith('/')) {
    return withLeading.slice(0, -1)
  }
  return withLeading
}

/** Resolve entryOrigin for MainHostFields when entry is an absolute or relative URL. */
export function resolveEntryOrigin(entry: string): string | undefined {
  try {
    return new URL(entry, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      .origin
  } catch {
    return undefined
  }
}
