export interface TenantProvisionPayload {
  organName: string
  organType: string
  realName: string
  email: string
  mobile: string
}

export interface TenantJoinOrganPayload {
  inviteCode: string
}
