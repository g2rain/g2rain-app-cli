/**
 * Passport-related types (aligned with basis PassportVo / IdP binding).
 */

export interface BaseVo {
  id: number
  updateTime?: string
  createTime?: string
  version?: number
}

export interface Passport extends BaseVo {
  username: string
  password?: string
  realName: string
  sex?: string
  birthday?: string
  idNo?: string
  mobile?: string
  email?: string
  status?: string
  passwordTrusted?: boolean
  deleteFlag?: boolean
}

export interface PassportPayload {
  id?: number
  username?: string
  password?: string
  realName?: string
  sex?: string
  birthday?: string
  idNo?: string
  mobile?: string
  email?: string
  passwordTrusted?: boolean
}

export interface PassportIdpBinding extends BaseVo {
  passportId?: number
  idpType?: string
  idpSubject?: string
  corpId?: string
  idpUserId?: string
  idpApplicationCode?: string
  bindMode?: string
  rawProfile?: string
}

export interface PassportIdpBindingQuery {
  passportId?: number
  idpType?: string
}

export interface DingTalkBindStartRequest {
  bindMode?: string
  returnUrl?: string
}

export interface DingTalkBindStartResponse {
  gotoUrl: string
}
