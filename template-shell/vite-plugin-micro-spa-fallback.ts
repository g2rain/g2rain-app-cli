import type { Plugin } from 'vite'

/**
 * Dev-only: document navigations outside Shell Context Path (e.g. /member/...)
 * must load the Shell SPA so deep-link refresh works (same origin as qiankun host).
 */
export function microAppSpaFallbackPlugin(contextPath: string): Plugin {
  const ctx = `/${contextPath.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/') || '/'
  const ctxPrefix = ctx === '/' ? '/' : `${ctx}/`

  return {
    name: 'g2rain-micro-app-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '/'
        const pathname = rawUrl.split('?')[0] || '/'

        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }

        // Let Vite / proxies handle assets and Context Path routes
        if (
          pathname.startsWith('/@') ||
          pathname.startsWith('/node_modules') ||
          pathname.startsWith('/src') ||
          pathname.includes('.')
        ) {
          next()
          return
        }

        if (ctx === '/') {
          next()
          return
        }

        if (pathname === ctx || pathname.startsWith(ctxPrefix)) {
          next()
          return
        }

        // Outside shell base: serve SPA entry under Context Path
        const accept = req.headers.accept || ''
        if (!accept.includes('text/html')) {
          next()
          return
        }

        req.url = `${ctxPrefix}index.html`
        next()
      })
    },
  }
}
