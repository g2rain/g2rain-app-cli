/**
 * 机构 API（供 OrganSelect / ApiSelect 复用）
 */
import { getHttpClient } from '@runtime/http';
import type { OrganIdNameMap } from './type';

export class OrganApi {
  /**
   * 机构搜索（用于 RemoteSelect）
   * - 兼容两种参数：
   *   1) OrganSelect 传参：{ key?: string; value?: number }
   *   2) 直接传字符串关键字：string
   */
  static async searchOrgans(params?: { key?: string; value?: number } | string): Promise<OrganIdNameMap[]> {
    const http = getHttpClient('default');
    const organName = typeof params === 'string' ? params : (params?.key ?? (params?.value != null ? String(params.value) : ''));
    const res = await http.get<OrganIdNameMap[]>('/basis/organ/search', { organName });
    return res.data || [];
  }
}
