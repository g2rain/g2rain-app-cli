/**
 * 基于 window 的子应用事件适配器
 * 实现与主应用一致的 EventAdapter 模式：统一的事件发送/接收接口
 * - emitEvent：将标准的 MicroAppMessage 事件发送给主应用
 * - initEventListeners：监听主应用下发的 TOKEN_RESPONSE，并交给本地 Processor 处理
 */

import type { EventAdapter, MicroAppMessageUnion } from '@/components/micro-app';
import { MicroAppEventType } from '@/components/micro-app';
import { MicroAppMessageProcessorImpl } from './message-processor';

export class WindowEventSubAppEventAdapter implements EventAdapter {
  private boundHandlers: Map<string, (event: Event) => void> = new Map();
  private messageProcessor: MicroAppMessageProcessorImpl = new MicroAppMessageProcessorImpl();

  /**
   * 获取消息处理器
   */
  getMessageProcessor(): MicroAppMessageProcessorImpl {
    return this.messageProcessor;
  }

  /**
   * 初始化事件监听器
   * 监听主应用下发的 TOKEN_RESPONSE 消息，用于处理 token 刷新结果
   */
  initEventListeners(): void {
    const handler = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail as MicroAppMessageUnion;
      await this.messageProcessor.processRaw(message);
    };

    window.addEventListener(MicroAppEventType.TOKEN_RESPONSE, handler);
    this.boundHandlers.set(MicroAppEventType.TOKEN_RESPONSE, handler);
  }

  /**
   * 清理事件监听器
   */
  cleanupEventListeners(): void {
    this.boundHandlers.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    this.boundHandlers.clear();

    this.messageProcessor.clearHandlers();
  }

  /**
   * 发送事件到主应用
   * 子应用只需要将事件广播到 window，由主应用统一处理
   */
  emitEvent(message: MicroAppMessageUnion): void {
    const eventName = message.type;
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: message,
      }),
    );
  }
}
