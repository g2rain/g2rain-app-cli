import { loadMicroApp, start, type MicroApp } from 'qiankun'
import type { RuntimeAdapter } from '../types/runtime-adapter'

let qiankunStarted = false

/**
 * Must run before the first loadMicroApp (same as main-shell QiankunManager.initialize).
 */
export function ensureQiankunStarted(): void {
  if (qiankunStarted) return
  start({
    singular: false,
    sandbox: {
      experimentalStyleIsolation: true,
    },
  })
  qiankunStarted = true
  console.info('[QiankunAdapter] qiankun start() done (singular=false)')
}

/**
 * qiankun RuntimeAdapter. loadMicroApp stays in the Shell (not platform packages).
 */
export function createQiankunAdapter(): RuntimeAdapter {
  const handles = new Map<string, MicroApp>()

  return {
    async mount(input) {
      ensureQiankunStarted()

      const existing = handles.get(input.instanceId)
      if (existing) {
        console.info('[QiankunAdapter] remount: unmount existing handle', input.instanceId)
        await existing.unmount()
        handles.delete(input.instanceId)
      }

      const containerSelector =
        typeof input.container === 'string' ? input.container : `#${input.container.id}`

      // Never log props (may contain legacy token fields at the loader boundary).
      console.info('[QiankunAdapter] loadMicroApp', {
        name: input.name,
        entry: input.entry,
        container: containerSelector,
        instanceId: input.instanceId,
      })

      const el =
        typeof input.container === 'string'
          ? document.querySelector(input.container)
          : input.container
      if (!el) {
        throw new Error(`[QiankunAdapter] container not found: ${containerSelector}`)
      }

      const microApp = loadMicroApp(
        {
          name: input.name,
          entry: input.entry,
          container: containerSelector,
          props: { ...input.props },
        },
        {
          singular: false,
          sandbox: {
            experimentalStyleIsolation: true,
          },
        },
      )
      handles.set(input.instanceId, microApp)
      try {
        await microApp.mountPromise
        console.info('[QiankunAdapter] mountPromise resolved', {
          name: input.name,
          instanceId: input.instanceId,
        })
      } catch (error) {
        handles.delete(input.instanceId)
        console.error('[QiankunAdapter] mountPromise rejected', {
          name: input.name,
          entry: input.entry,
          container: containerSelector,
          error,
        })
        throw error
      }
    },

    async update(instanceId, props) {
      const microApp = handles.get(instanceId)
      if (!microApp) {
        throw new Error(`No qiankun handle for instance "${instanceId}"`)
      }
      console.info('[QiankunAdapter] update', { instanceId })
      await microApp.update?.(props)
    },

    async unmount(instanceId) {
      const microApp = handles.get(instanceId)
      if (!microApp) return
      console.info('[QiankunAdapter] unmount', { instanceId })
      try {
        await microApp.unmount()
      } finally {
        handles.delete(instanceId)
      }
    },

    has(instanceId) {
      return handles.has(instanceId)
    },
  }
}
