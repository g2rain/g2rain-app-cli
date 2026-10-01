import { getHttpClient } from '../http'

export interface BaseVo {
  id: number
  updateTime?: string
  createTime?: string
  version?: number
}

export interface PassportVo extends BaseVo {
  username: string
  realName: string
  sex?: string
  birthday?: string
  idNo?: string
  mobile?: string
  email?: string
  status?: string
  deleteFlag?: boolean
}

export interface OrganVo extends BaseVo {
  organName: string
  organType?: string
  status?: string
  /** Platform operator organ — blocks tenant provision when true. */
  admin?: boolean
}

export interface UserVo extends BaseVo {
  passportId?: number
  organId: number
  email?: string
  mobile?: string
  realName: string
  admin?: boolean
  deleteFlag?: boolean
}

export interface AuthorityUserVo extends UserVo {
  passport?: PassportVo
  organ?: OrganVo
}

/** @deprecated Use PassportVo — kept for Header/session mapping aliases. */
export type PassportSummary = Pick<PassportVo, 'username' | 'realName'>

/** @deprecated Use OrganVo */
export type OrganSummaryVo = Pick<OrganVo, 'id' | 'organName' | 'organType' | 'admin'>

let cache: AuthorityUserVo | null = null

export function clearAuthorityUserCache(): void {
  cache = null
}

/** GET /basis/authority/user — identity for Header / session / init pages. */
export async function getAuthorityUser(forceRefresh = false): Promise<AuthorityUserVo> {
  if (!forceRefresh && cache) return cache
  const http = getHttpClient()
  const res = await http.client.get<AuthorityUserVo>('/basis/authority/user')
  cache = res.data
  return res.data
}

/** POST /authority/user/update — optional profile update used by passport flows. */
export async function updateUser(payload: Partial<UserVo> & { id: number }): Promise<void> {
  const http = getHttpClient()
  await http.client.post('/authority/user/update', payload)
  cache = null
}
