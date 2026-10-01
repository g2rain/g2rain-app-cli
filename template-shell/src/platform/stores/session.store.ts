import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAccessTokenStore } from './token.store'
import {
  clearAuthorityUserCache,
  getAuthorityUser,
} from '../../runtime/api/authority-user'
import { openAuthBridge } from '../../components/micro-app'

/** Non-sensitive identity summary only. Never store Token / Secret here for display. */
export interface SessionUserSummary {
  displayName: string
  account: string
}

export interface SessionOrganSummary {
  name: string
  organCode: string
  /** Platform operator organ when true. */
  admin?: boolean
}

/**
 * Session / SSO state interface. Identity is filled after Token Store login
 * via /basis/authority/user.
 */
export const useSessionStore = defineStore('shell-session', () => {
  const user = ref<SessionUserSummary | null>(null)
  const organ = ref<SessionOrganSummary | null>(null)
  const availableOrgans = ref<SessionOrganSummary[]>([])

  const isLoggedIn = computed(() => user.value !== null)
  const hasOrgan = computed(() => organ.value !== null)

  function setUser(next: SessionUserSummary | null): void {
    user.value = next
  }

  function setOrgan(next: SessionOrganSummary | null): void {
    organ.value = next
  }

  function setAvailableOrgans(next: readonly SessionOrganSummary[]): void {
    availableOrgans.value = [...next]
  }

  function switchOrgan(organCode: string): void {
    const matched = availableOrgans.value.find((item) => item.organCode === organCode)
    if (!matched) {
      throw new Error(`Unknown organCode "${organCode}"`)
    }
    organ.value = matched
  }

  function clearSession(): void {
    user.value = null
    organ.value = null
    availableOrgans.value = []
    clearAuthorityUserCache()
  }

  /**
   * When Token Store reports login, load non-sensitive user/organ for Header.
   * Does not fabricate identity when not logged in.
   */
  async function bootstrapSession(): Promise<void> {
    const tokenStore = useAccessTokenStore()
    if (!tokenStore.isLogin) {
      clearSession()
      return
    }

    openAuthBridge()

    try {
      const authority = await getAuthorityUser(true)
      const displayName = authority.realName || authority.passport?.realName || '用户'
      const account = authority.passport?.username || authority.email || String(authority.id)
      setUser({ displayName, account })

      if (authority.organ) {
        const summary: SessionOrganSummary = {
          name: authority.organ.organName,
          organCode: String(authority.organ.id),
          admin: authority.organ.admin,
        }
        setOrgan(summary)
        setAvailableOrgans([summary])
      } else if (authority.organId != null) {
        const summary: SessionOrganSummary = {
          name: `机构 ${authority.organId}`,
          organCode: String(authority.organId),
        }
        setOrgan(summary)
        setAvailableOrgans([summary])
      }
    } catch (error) {
      console.warn('[session] failed to load authority user:', error)
      setUser({ displayName: '已登录用户', account: '—' })
    }
  }

  return {
    user,
    organ,
    availableOrgans,
    isLoggedIn,
    hasOrgan,
    setUser,
    setOrgan,
    setAvailableOrgans,
    switchOrgan,
    clearSession,
    bootstrapSession,
  }
})
