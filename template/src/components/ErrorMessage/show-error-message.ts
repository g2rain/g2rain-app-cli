import { ElMessage } from 'element-plus';

export interface ErrorMessageOptions {
  title?: string;
  duration?: number;
}

export type ErrorMessagePayload = string | Error | { message?: string; errorCode?: string; code?: string };

/**
 * 统一的错误消息展示封装（Element Plus ElMessage）
 */
export function showErrorMessage(error: ErrorMessagePayload, options: ErrorMessageOptions = {}): void {
  let message = '请求失败';
  let errorCode: string | undefined;

  if (typeof error === 'string') {
    message = error;
  } else {
    message = error.message || message;
    if ('errorCode' in error && typeof error.errorCode === 'string' && error.errorCode !== '') {
      errorCode = error.errorCode;
    } else if ('code' in error && typeof error.code === 'string' && error.code !== '') {
      errorCode = error.code;
    }
  }

  const fullMessage = errorCode ? `[${errorCode}] ${message}` : message;

  ElMessage({
    type: 'error',
    message: fullMessage,
    duration: options.duration ?? 3000,
  });
}
