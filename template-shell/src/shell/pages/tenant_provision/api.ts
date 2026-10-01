import type { UserVo } from '../../../runtime/api/authority-user'
import { getHttpClient } from '../../../runtime/http'
import type { TenantJoinOrganPayload, TenantProvisionPayload } from './type'

export class TenantProvisionApi {
  static async provisionAccount(payload: TenantProvisionPayload): Promise<UserVo> {
    const http = getHttpClient()
    const res = await http.client.post<UserVo>(
      '/basis/tenant_provision/provision_account',
      payload,
    )
    return res.data
  }

  static async joinOrgan(payload: TenantJoinOrganPayload): Promise<UserVo> {
    const http = getHttpClient()
    const res = await http.client.post<UserVo>('/basis/tenant_provision/join_organ', payload)
    return res.data
  }
}
