import '@g2rain/theme/styles.css'
import '@g2rain/ui/style.css'
import 'element-plus/dist/index.css'
import { boot } from './runtime/boot'

void boot().catch((error: unknown) => {
  console.error('[shell] boot failed', error)
})
