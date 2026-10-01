import { createThemeController, type G2rainTheme, type ThemeController } from '@g2rain/platform/theme'

const STORAGE_KEY = 'g2rain-shell-theme'

let controller: ThemeController | undefined

function readPersistedTheme(): G2rainTheme | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : undefined
  } catch {
    return undefined
  }
}

/** Theme persistence belongs to the Shell; @g2rain/theme only ships CSS. */
export function initThemeController(): ThemeController {
  if (controller) return controller
  controller = createThemeController({
    initialTheme: readPersistedTheme() ?? 'light',
    persist(theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        /* ignore quota / private mode */
      }
    },
  })
  return controller
}

export function getThemeController(): ThemeController {
  if (!controller) {
    throw new Error('Theme controller is not initialized')
  }
  return controller
}
