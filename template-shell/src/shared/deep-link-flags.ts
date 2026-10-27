/** 同页深链离开 Gateway 期间暂停地址同步，避免概览地址覆盖目标。 */
let leavingGateway = false

export function setDeepLinkLeavingGateway(value: boolean): void {
  leavingGateway = value
}

export function isDeepLinkLeavingGateway(): boolean {
  return leavingGateway
}
