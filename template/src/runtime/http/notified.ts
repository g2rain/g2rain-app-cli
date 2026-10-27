/**
 * 已由 http 层统一提示的错误。
 * 页面不再接住这类错误时，用它静默 Vue 与浏览器的未处理错误日志。
 */
import type { App } from 'vue';

const notified = new WeakSet<object>();

/** 标记错误已提示 */
export function markNotified(error: unknown): void {
  if (typeof error === 'object' && error !== null) notified.add(error);
}

/** 错误是否已由 http 层提示 */
export function isNotified(error: unknown): boolean {
  return typeof error === 'object' && error !== null && notified.has(error);
}

/** 已提示的错误不再输出未处理日志；应用卸载时解除监听 */
export function silenceNotified(app: App): void {
  const handle = app.config.errorHandler;
  app.config.errorHandler = (error, instance, info) => {
    if (isNotified(error)) return;
    if (handle) handle(error, instance, info);
    else console.error(error);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (isNotified(event.reason)) event.preventDefault();
  };
  window.addEventListener('unhandledrejection', onRejection);
  app.onUnmount(() => window.removeEventListener('unhandledrejection', onRejection));
}
