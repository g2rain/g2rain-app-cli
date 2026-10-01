/**
 * 微前端消息处理器
 * 统一的入口，根据消息类型自动分发到对应的处理器
 */

import type { MicroAppMessage, MicroAppMessageHandler, MicroAppMessageProcessor } from './types';
import { MicroAppEventType, type MicroAppMessageUnion } from './types';

/**
 * 微前端消息处理器实现
 * 统一的入口，根据消息的 type 自动分发到对应的处理器
 */
export class MicroAppMessageProcessorImpl implements MicroAppMessageProcessor {
  // 事件类型到处理器的映射
  private handlerMap: Map<MicroAppEventType, MicroAppMessageHandler> = new Map();

  /**
   * 为指定事件类型设置处理器
   * @param eventType 事件类型
   * @param handler 处理器
   */
  registerHandler(eventType: MicroAppEventType, handler: MicroAppMessageHandler): void {
    this.handlerMap.set(eventType, handler);
  }

  /**
   * 处理原始数据
   * 仅支持标准消息格式：
   * - 必须包含 type / data / timestamp 字段
   * 其他格式将直接忽略并打印告警
   * @param rawData 原始数据（期望为标准消息格式）
   * @param eventType 事件类型（保留参数以兼容现有调用，但不再用于旧格式转换）
   */
  async processRaw(rawData: MicroAppMessageUnion): Promise<void> {
    // 标准消息格式：包含 type / data / timestamp
    if (
      rawData &&
      rawData.type &&
      rawData.data !== undefined &&
      rawData.timestamp &&
      typeof rawData.timestamp === 'number'
    ) {
      console.log(
        '[MicroAppMessageProcessor] 收到标准消息格式:',
        rawData,
      );
      await this.process(rawData as MicroAppMessage<MicroAppEventType, unknown>);
      return;
    }

    // 非标准格式，直接告警并忽略
    console.warn('[MicroAppMessageProcessor] 收到非标准消息格式，已忽略:', {
      rawData,
    });
  }

  /**
   * 处理消息
   * 根据消息的 type 自动分发到对应的处理器
   */
  async process(message: MicroAppMessage<MicroAppEventType, unknown>): Promise<void> {
    try {
      // 根据消息类型分发到具体的处理器
      const messageUnion = message as MicroAppMessageUnion;
      let handler: MicroAppMessageHandler | undefined;
      handler = this.handlerMap.get(message.type);

      if (handler) {
        await handler.process(message);
      } else {
        console.warn('[MicroAppMessageProcessor] 未找到对应的事件处理器:', message.type);
      }
    } catch (error) {
      console.error('[MicroAppMessageProcessor] 处理消息时发生错误:', error, message);
      throw error;
    }
  }

  /**
   * 移除所有处理器
   */
  clearHandlers(): void {
    this.handlerMap.clear();
  }
}

