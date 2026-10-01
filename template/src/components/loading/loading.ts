/**
 * Loading 管理器（组件层实现）
 * 用于统一管理全局 Loading 状态，支持并发请求计数
 *
 * 该实现已完全替代原有的 `src/runtime/http/loading.ts`。
 */

import { ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading';

/**
 * Loading 配置选项
 */
export interface LoadingOptions {
  text?: string; // loading 文本
  background?: string; // 背景色
}

/**
 * Loading 管理器类
 * 使用计数器管理多个并发请求，只有所有请求完成才关闭 loading
 *
 * 为了降低页面抖动和闪烁，增加了：
 * - 延迟展示：短请求不再立刻弹出全局遮罩
 * - 最小展示时长：一旦展示会保持一小段时间，避免频繁 show/hide
 */
class LoadingManager {
  private loadingInstance: LoadingInstance | null = null;
  private requestCount = 0;

  // 延迟与最小展示时长（单位：ms）
  private readonly showDelay = 200;
  private readonly minVisibleDuration = 300;

  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private shownAt = 0;

  /**
   * 显示 loading
   * @param options Loading 配置选项
   */
  show(options?: LoadingOptions): void {
    this.requestCount++;

    // 已经在显示或已经有 show 定时器，无需重复设置
    if (this.loadingInstance || this.showTimer != null) {
      return;
    }

    this.showTimer = window.setTimeout(() => {
      this.showTimer = null;

      // 延迟期间请求可能已经完成
      if (this.requestCount <= 0 || this.loadingInstance) {
        return;
      }

      this.loadingInstance = ElLoading.service({
        lock: true,
        text: options?.text || '加载中...',
        background: options?.background || 'rgba(0, 0, 0, 0.7)',
      });
      this.shownAt = Date.now();
    }, this.showDelay);
  }

  /**
   * 隐藏 loading
   */
  hide(): void {
    this.requestCount--;

    // 还有未完成的请求，不关闭 loading
    if (this.requestCount > 0) {
      return;
    }

    this.requestCount = 0;

    // 还没真正显示，只是在延迟阶段：直接取消定时器即可
    if (!this.loadingInstance) {
      if (this.showTimer != null) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      return;
    }

    const elapsed = Date.now() - this.shownAt;
    const remain = this.minVisibleDuration - elapsed;

    if (remain <= 0) {
      this.closeNow();
      return;
    }

    // 未达到最小展示时长，延迟关闭
    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer);
    }
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = null;
      this.closeNow();
    }, remain);
  }

  /**
   * 立即关闭 loading（内部使用）
   */
  private closeNow(): void {
    if (this.loadingInstance) {
      this.loadingInstance.close();
      this.loadingInstance = null;
    }
  }

  /**
   * 强制关闭 loading（用于错误情况）
   */
  forceHide(): void {
    this.requestCount = 0;

    if (this.showTimer != null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.closeNow();
  }

  /**
   * 获取当前请求计数
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * 检查是否正在显示 loading
   */
  isLoading(): boolean {
    return this.loadingInstance !== null;
  }
}

// 导出单例实例
export const loadingManager = new LoadingManager();
