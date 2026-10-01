/**
 * Stable composition-root hook for optional Shell capabilities.
 * Default template is a no-op. The `--with-legacy` overlay replaces this file
 * to install AdapterResolver + legacy message bridge without forking RuntimeStore.
 */
export function installShellExtensions(): void {
  // intentionally empty
}
