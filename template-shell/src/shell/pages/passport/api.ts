import type { Result } from '@g2rain/http'
import { getPathWithContextPath } from '../../../shared/env'
import { useAccessTokenStore } from '../../../platform/stores/token.store'
import { getAuthHttpClient, getHttpClient } from '../../../runtime/http'
import type {
  DingTalkBindStartRequest,
  DingTalkBindStartResponse,
  Passport,
  PassportIdpBinding,
  PassportIdpBindingQuery,
  PassportPayload,
} from './type'

const DINGTALK_BIND_START_PATH = '/auth/dingtalk/bind/passport/start'

export class PassportApi {
  static async save(payload: PassportPayload): Promise<Passport> {
    const http = getHttpClient()
    const res = await http.client.post<Passport>('/basis/passport/save', payload)
    return res.data
  }

  static async changePassword(
    id: string | number,
    payload: { oldPassword: string; newPassword: string },
  ): Promise<void> {
    const http = getHttpClient()
    await http.client.post(`/basis/passport/${id}/password`, payload)
  }
}

export class PassportIdpBindingApi {
  static async listByPassport(passportId: number): Promise<PassportIdpBinding[]> {
    const http = getHttpClient()
    const params: PassportIdpBindingQuery = { passportId }
    const res = await http.client.get<PassportIdpBinding[]>(
      '/basis/passport_idp_binding/list',
      { params },
    )
    return res.data ?? []
  }
}

export const IdpBindApi = {
  async start(body: DingTalkBindStartRequest): Promise<Result<DingTalkBindStartResponse>> {
    const tokenStore = useAccessTokenStore()
    if (!tokenStore.tokenString) {
      throw new Error('NO_LOGIN')
    }
    const response = await getAuthHttpClient().client.post<DingTalkBindStartResponse>(
      DINGTALK_BIND_START_PATH,
      body,
      {
        headers: {
          Authorization: `Bearer ${tokenStore.tokenString}`,
        },
      },
    )
    return response as unknown as Result<DingTalkBindStartResponse>
  },
}

export function buildBindReturnUrl(): string {
  if (typeof window === 'undefined') {
    return getPathWithContextPath('/passport/bind_result')
  }
  return window.location.origin + getPathWithContextPath('/passport/bind_result')
}

export function parseIamResult<T>(result: Result<T>): T {
  if (result.status !== 200 && result.status !== 0) {
    throw new Error(result.errorMessage || '请求失败')
  }
  return result.data
}
