/**
 * @g2rain/ui StatusSwitch 不再自动 ElMessage。
 * 业务页在 @success / @error 上调用本辅助即可恢复提示。
 *
 * 示例：
 * <StatusSwitch v-model="row.status" :api-method="..."
 *   @success="notifyStatusSwitchSuccess"
 *   @error="(p) => notifyStatusSwitchError(p)" />
 */
import { ElMessage } from 'element-plus';
import { t } from '@platform/i18n';
import { showErrorMessage } from './show-error-message';

export type StatusSwitchNotifyPayload = {
  nextValue: string | number | boolean;
  prevValue: string | number | boolean;
  error?: unknown;
};

export function notifyStatusSwitchSuccess(
  _payload?: StatusSwitchNotifyPayload,
  message?: string,
): void {
  ElMessage.success(message ?? t('G2_MSG_STATUS_UPDATE_OK', '状态更新成功'));
}

export function notifyStatusSwitchError(
  payload: StatusSwitchNotifyPayload,
  message?: string,
): void {
  const err = payload.error;
  if (err !== undefined && err !== null) {
    showErrorMessage(
      err instanceof Error ? err : message ?? t('G2_MSG_STATUS_UPDATE_FAIL', '状态更新失败'),
    );
    return;
  }
  showErrorMessage(message ?? t('G2_MSG_STATUS_UPDATE_FAIL', '状态更新失败'));
}
