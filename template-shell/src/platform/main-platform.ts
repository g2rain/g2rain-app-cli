import {
  createMainPlatform,
  type MainPlatformCoordinator,
  type MainPlatformRuntimePort,
} from '@g2rain/platform/main'

let coordinator: MainPlatformCoordinator | undefined

/** Composition root creates the Main platform coordinator exactly once. */
export function initMainPlatform(runtimePort: MainPlatformRuntimePort): MainPlatformCoordinator {
  if (coordinator) {
    throw new Error('createMainPlatform must be called only once in the composition root')
  }
  coordinator = createMainPlatform({ runtimePort })
  return coordinator
}

export function getMainPlatform(): MainPlatformCoordinator {
  if (!coordinator) {
    throw new Error('Main platform is not initialized. Call initMainPlatform from the composition root.')
  }
  return coordinator
}
