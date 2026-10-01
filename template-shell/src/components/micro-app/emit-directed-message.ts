import type { MainDirectedMessage } from '@g2rain/platform/main'

/**
 * Deliver a Main → Sub directed message via window CustomEvent.
 * Event name is message.type; detail is the full directed envelope.
 * Does not register listeners (Shell must not self-handle TOKEN_RESPONSE).
 */
export function emitDirectedMessage<T>(message: Readonly<MainDirectedMessage<T>>): void {
  if (typeof message.type !== 'string' || message.type.trim() === '') {
    throw new Error('Directed message type is required')
  }
  if (typeof message.instanceId !== 'string' || message.instanceId.trim() === '') {
    throw new Error('Directed message instanceId is required')
  }

  const detail: MainDirectedMessage<T> = {
    type: message.type,
    data: message.data,
    applicationCode: message.applicationCode,
    viewId: message.viewId,
    instanceId: message.instanceId,
    appKey: message.appKey,
    timestamp: message.timestamp,
  }
  if (message.requestId !== undefined) {
    detail.requestId = message.requestId
  }

  window.dispatchEvent(new CustomEvent(message.type, { detail }))
}
