/**
 * Server menu DTO — aligns with Basis AuthorityMenuVo.
 */
export interface AuthorityMenuVo {
  id: number
  parentId: number | null
  applicationCode: string
  endpointUrl: string
  /** Sub-app route prefix (not Shell VITE_CONTEXT_PATH). */
  contextPath: string
  menuName: string
  menuCode: string
  linkPath: string | null
  icon: string | null
  menuSortOrder: number | null
  subMenus?: AuthorityMenuVo[]
}
