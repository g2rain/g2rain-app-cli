/**
 * dict 相关类型定义（用于字典项选择组件 DictSelect）
 */

import type { BaseVo } from '@platform/types/api.type';

export interface DictItem extends BaseVo {
  parentId: number;
  parentName?: string;
  usageCode: string;
  code: string;
  name: string;
  description: string;
  sortIndex: number;
}
