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
  controller.subscribe(() => applyThemeToSubApps())
  return controller
}

/** qiankun 给子应用包裹层加的属性；样式隔离会把子应用 CSS 里的 :root 改写成这个元素 */
const SUB_APP_WRAPPER = '[data-qiankun]'

/** 把当前主题写到子应用包裹层上，嵌入的子应用随主应用一起切换主题 */
export function applyThemeToSubApps(root: ParentNode = document): void {
  if (!controller) return
  const theme = controller.getTheme()
  root.querySelectorAll<HTMLElement>(SUB_APP_WRAPPER).forEach((el) => {
    el.dataset.g2Theme = theme
  })
}

export function getThemeController(): ThemeController {
  if (!controller) {
    throw new Error('Theme controller is not initialized')
  }
  return controller
}
