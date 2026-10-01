import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MainPublicProps } from '@g2rain/platform/main'
import { getMainPlatform } from '../main-platform'
import { createInstanceQueue } from '../apps/instance-queue'
import { createQiankunAdapter, ensureQiankunStarted } from '../apps/qiankun-adapter'
import {
  createAppkitAdapterResolver,
  type AdapterResolver,
} from '../apps/adapters'
import { clearPendingAuthForInstance, closeAuthBridge } from '../../components/micro-app'
import { normalizeContextPath, resolveEntryOrigin } from '../../shared/context-path'
import { microAppContainerId, microAppContainerSelector } from '../../shared/qiankun-id'
import type { MicroAppDefinition, RuntimeInstance } from '../types/workspace'
import type { RuntimeAdapter } from '../types/runtime-adapter'

const queue = createInstanceQueue()
const sharedLoader: RuntimeAdapter = createQiankunAdapter()
let resolveAdapter: AdapterResolver = createAppkitAdapterResolver(sharedLoader)

/** Shared qiankun loader (single handle map). Legacy overlay must reuse this instance. */
export function getSharedRuntimeLoader(): RuntimeAdapter {
  return sharedLoader
}

/**
 * Sole RuntimeStore extension point for protocol selection.
 * Default is AppKit-only; `--with-legacy` replaces via shell-extensions.
 */
export function setAdapterResolver(next: AdapterResolver): void {
  resolveAdapter = next
}

export const useRuntimeStore = defineStore('shell-runtime', () => {
  const definitions = ref<Map<string, MicroAppDefinition>>(new Map())
  const instances = ref<Map<string, RuntimeInstance>>(new Map())

  function registerDefinition(definition: MicroAppDefinition): void {
    if (!definition.applicationCode.trim()) {
      throw new Error('MicroAppDefinition.applicationCode is required')
    }
    if (!definition.entry.trim()) {
      throw new Error('MicroAppDefinition.entry is required')
    }
    if (!definition.activeRule.trim()) {
      throw new Error('MicroAppDefinition.activeRule is required')
    }

    // qiankun / vite-plugin-qiankun lifecycle name must equal applicationCode.
    const qiankunName = definition.name.trim() || definition.applicationCode
    if (qiankunName !== definition.applicationCode) {
      console.warn(
        '[RuntimeStore] definition.name overridden to applicationCode for vite-plugin-qiankun',
        { provided: definition.name, applicationCode: definition.applicationCode },
      )
    }

    const contextPath = normalizeContextPath(definition.contextPath, 'MicroAppDefinition.contextPath')
    const next: MicroAppDefinition = {
      ...definition,
      name: definition.applicationCode,
      contextPath,
    }
    definitions.value.set(definition.applicationCode, next)
    console.info('[RuntimeStore] registerDefinition', {
      applicationCode: next.applicationCode,
      name: next.name,
      entry: next.entry,
      contextPath: next.contextPath,
      activeRule: next.activeRule,
    })
  }

  function clearDefinitions(): void {
    definitions.value = new Map()
    console.info('[RuntimeStore] clearDefinitions')
  }

  function markInactive(instanceId: string): void {
    const instance = instances.value.get(instanceId)
    if (!instance) return
    if (instance.status === 'mounted') {
      instance.status = 'inactive'
      console.info('[RuntimeStore] markInactive (no unmount)', instanceId)
    }
  }

  /**
   * Close / destroy order (required):
   * qiankun unmount → delete handle → platform.releaseInstance → delete RuntimeInstance
   */
  async function destroyInstance(instanceId: string): Promise<void> {
    await queue.enqueue(instanceId, async () => {
      console.info('[RuntimeStore] destroyInstance', instanceId)
      clearPendingAuthForInstance(instanceId)
      const instance = instances.value.get(instanceId)
      const adapter = resolveAdapter(instance?.applicationCode ?? '')
      await adapter.unmount(instanceId)
      getMainPlatform().releaseInstance(instanceId)
      instances.value.delete(instanceId)
      queue.clear(instanceId)
    })
  }

  async function updateInstanceProps(
    instanceId: string,
    props: Readonly<MainPublicProps>,
  ): Promise<void> {
    await queue.enqueue(instanceId, async () => {
      const instance = instances.value.get(instanceId)
      if (!instance) {
        throw new Error(`Unknown instance "${instanceId}"`)
      }
      const adapter = resolveAdapter(instance.applicationCode)
      await adapter.update(instanceId, props)
    })
  }

  /**
   * Mount uses stable definition.name (= applicationCode) for loadMicroApp.
   * instanceId is only the handle / Tab key — never appended to qiankun name.
   */
  async function mountInstance(input: {
    instanceId: string
    applicationCode: string
    viewId: string
    initialRoute?: string
    container?: string | HTMLElement
  }): Promise<void> {
    ensureQiankunStarted()

    const definition = definitions.value.get(input.applicationCode)
    if (!definition) {
      throw new Error(`Unknown applicationCode "${input.applicationCode}"`)
    }

    const containerSelector =
      typeof input.container === 'string'
        ? input.container
        : input.container
          ? `#${input.container.id}`
          : microAppContainerSelector(input.instanceId)

    // Stable lifecycle name — must match vite-plugin-qiankun(VITE_APPLICATION_CODE).
    const qiankunName = definition.name
    const adapter = resolveAdapter(input.applicationCode)

    console.info('[RuntimeStore] mountInstance begin', {
      instanceId: input.instanceId,
      applicationCode: input.applicationCode,
      viewId: input.viewId,
      initialRoute: input.initialRoute,
      entry: definition.entry,
      contextPath: definition.contextPath,
      activeRule: definition.activeRule,
      qiankunName,
      containerSelector,
    })

    await queue.enqueue(input.instanceId, async () => {
      const main = getMainPlatform()
      const entryOrigin = resolveEntryOrigin(definition.entry)
      const props = main.buildPublicProps(
        {
          applicationCode: input.applicationCode,
          viewId: input.viewId,
          instanceId: input.instanceId,
          mode: 'integrated',
          contextPath: definition.contextPath,
          ...(input.initialRoute ? { initialRoute: input.initialRoute } : {}),
        },
        {
          activeRule: definition.activeRule,
          ...(entryOrigin !== undefined ? { entryOrigin } : {}),
        },
      )

      instances.value.set(input.instanceId, {
        instanceId: input.instanceId,
        applicationCode: input.applicationCode,
        viewId: input.viewId,
        status: 'loading',
        containerId: microAppContainerId(input.instanceId),
        ...(input.initialRoute ? { initialRoute: input.initialRoute } : {}),
      })

      try {
        await adapter.mount({
          instanceId: input.instanceId,
          entry: definition.entry,
          container: containerSelector,
          props,
          name: qiankunName,
        })
        const current = instances.value.get(input.instanceId)
        if (current) current.status = 'mounted'
        console.info('[RuntimeStore] mountInstance ok', {
          instanceId: input.instanceId,
          qiankunName,
          initialRoute: input.initialRoute,
        })
      } catch (error) {
        console.error('[RuntimeStore] mountInstance failed — rolling back instance', {
          instanceId: input.instanceId,
          applicationCode: input.applicationCode,
          viewId: input.viewId,
          initialRoute: input.initialRoute,
          error: error instanceof Error ? error.message : String(error),
        })
        try {
          await adapter.unmount(input.instanceId)
        } catch {
          /* ignore */
        }
        try {
          getMainPlatform().releaseInstance(input.instanceId)
        } catch {
          /* ignore */
        }
        instances.value.delete(input.instanceId)
        throw error
      }
    })
  }

  async function releaseAllOnLogout(): Promise<void> {
    closeAuthBridge()
    const ids = [...instances.value.keys()]
    for (const instanceId of ids) {
      await destroyInstance(instanceId)
    }
  }

  /** Sub-app internal path remembered for Tab re-activation address sync. */
  function setLastActivePath(instanceId: string, path: string): void {
    const instance = instances.value.get(instanceId)
    if (!instance) return
    const normalized = path.startsWith('/') ? path : `/${path}`
    instance.lastActivePath = normalized
  }

  function getLastActivePath(instanceId: string): string | undefined {
    return instances.value.get(instanceId)?.lastActivePath
  }

  return {
    definitions,
    instances,
    registerDefinition,
    clearDefinitions,
    markInactive,
    destroyInstance,
    updateInstanceProps,
    mountInstance,
    releaseAllOnLogout,
    setLastActivePath,
    getLastActivePath,
  }
})
