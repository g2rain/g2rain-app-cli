<template>
  <header class="shell-header">
    <div class="logo">
      <img :src="logoHeader" alt="谷雨开源SaaS平台" class="logo-image" />
    </div>

    <div class="header-right">
      <!-- 当前机构 -->
      <el-dropdown trigger="click" :disabled="!canSwitchOrgan" @command="handleOrganCommand">
        <button type="button" class="header-trigger" :disabled="!canSwitchOrgan">
          <span class="trigger-label">{{ organLabel }}</span>
          <el-icon class="trigger-icon"><ArrowDown /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in availableOrgans"
              :key="item.organCode"
              :command="item.organCode"
              :class="{ 'is-active': organ?.organCode === item.organCode }"
            >
              {{ item.name }}（{{ item.organCode }}）
            </el-dropdown-item>
            <el-dropdown-item v-if="availableOrgans.length === 0" disabled>
              暂无可切换机构
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 偏好：主题 / 语言 -->
      <el-dropdown trigger="click" @command="handlePreferenceCommand">
        <button type="button" class="header-icon-btn" title="偏好设置">
          <el-icon><Setting /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled class="menu-section">主题</el-dropdown-item>
            <el-dropdown-item
              v-for="item in themeOptions"
              :key="item.value"
              :command="`theme:${item.value}`"
              :class="{ 'is-active': theme === item.value }"
            >
              {{ item.label }}
            </el-dropdown-item>
            <el-dropdown-item divided disabled class="menu-section">语言</el-dropdown-item>
            <el-dropdown-item
              v-for="item in localeOptions"
              :key="item.code"
              :command="`locale:${item.code}`"
              :class="{ 'is-active': locale === item.code }"
            >
              {{ item.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 用户 -->
      <el-dropdown trigger="click" @command="handleUserCommand">
        <button type="button" class="header-trigger user-trigger">
          <span class="trigger-label">{{ userLabel }}</span>
          <el-icon class="trigger-icon"><ArrowDown /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>{{ userDetail }}</el-dropdown-item>
            <el-dropdown-item command="passport" :disabled="!isLoggedIn">
              账号管理
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided :disabled="!isLoggedIn">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowDown, Setting, SwitchButton } from '@element-plus/icons-vue'
import type { G2rainTheme } from '@g2rain/platform/theme'
import logoHeader from '@/assets/brand/logo-header.png'
import { getMainPlatform } from '../../platform/main-platform'
import { getThemeController } from '../../platform/theme'
import { useLocaleStore, type ShellLocaleCode } from '../../platform/stores/locale.store'
import { useRuntimeStore } from '../../platform/stores/runtime.store'
import { useSessionStore } from '../../platform/stores/session.store'
import { useAccessTokenStore } from '../../platform/stores/token.store'
import { useMenuStore } from '../../platform/stores/menu.store'
import { useWorkspaceStore } from '../../platform/stores/workspace.store'
import {
  clearReturnUrl,
  resetNavigationRestoreState,
} from '../../runtime/navigation/sub-app-redirect'

const router = useRouter()
const session = useSessionStore()
const localeStore = useLocaleStore()
const runtimeStore = useRuntimeStore()
const tokenStore = useAccessTokenStore()
const menuStore = useMenuStore()
const workspace = useWorkspaceStore()

const { user, organ, availableOrgans, isLoggedIn } = storeToRefs(session)
const { locale, options: localeOptions } = storeToRefs(localeStore)

const theme = ref<G2rainTheme>(getThemeController().getTheme())
const themeOptions: ReadonlyArray<{ value: G2rainTheme; label: string }> = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
]

const userLabel = computed(() => {
  if (!user.value) return '未登录'
  return user.value.displayName
})

const userDetail = computed(() => {
  if (!user.value) return '尚未登录'
  return `${user.value.displayName}（${user.value.account}）`
})

const organLabel = computed(() => {
  if (!organ.value) return '未选择机构'
  return organ.value.name
})

const canSwitchOrgan = computed(() => availableOrgans.value.length > 0)

function handleOrganCommand(organCode: string): void {
  session.switchOrgan(organCode)
}

function applyTheme(next: G2rainTheme): void {
  getThemeController().setTheme(next)
  theme.value = next
}

async function applyLocale(next: ShellLocaleCode): Promise<void> {
  localeStore.setLocale(next)
  const main = getMainPlatform()
  const instanceIds = [...runtimeStore.instances.keys()]
  await Promise.all(instanceIds.map((instanceId) => main.notifyLocale(instanceId, next)))
}

async function handlePreferenceCommand(command: string): Promise<void> {
  if (command.startsWith('theme:')) {
    applyTheme(command.slice('theme:'.length) as G2rainTheme)
    return
  }
  if (command.startsWith('locale:')) {
    await applyLocale(command.slice('locale:'.length) as ShellLocaleCode)
  }
}

async function handleUserCommand(command: string): Promise<void> {
  if (command === 'passport') {
    workspace.openShellView({
      viewId: 'shell.passport',
      title: '账号管理',
      kind: 'shell',
      closable: true,
      shellPage: 'passport',
    })
    return
  }
  if (command !== 'logout') return
  await runtimeStore.releaseAllOnLogout()
  menuStore.reset()
  clearReturnUrl()
  resetNavigationRestoreState()
  tokenStore.logout()
  session.clearSession()
  await router.push('/logout')
}
</script>

<style scoped>
.shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--g2-border-color);
  background: var(--g2-bg-container);
  color: var(--g2-text-primary);
}

.logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo-image {
  display: block;
  height: 36px;
  width: auto;
  max-width: min(320px, 42vw);
  object-fit: contain;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-trigger,
.header-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--g2-border-color);
  background: var(--g2-bg-muted);
  color: var(--g2-text-regular);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  line-height: 1.2;
}

.header-trigger:disabled,
.header-icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-icon-btn {
  padding: 6px 8px;
}

.user-trigger {
  max-width: 220px;
}

.trigger-label {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--g2-text-primary);
}

.trigger-icon {
  font-size: 12px;
  color: var(--g2-text-secondary);
}

:deep(.el-dropdown-menu__item.is-active) {
  color: var(--g2-color-primary);
  font-weight: 600;
}

:deep(.el-dropdown-menu__item.menu-section) {
  font-size: 12px;
  color: var(--g2-text-secondary);
  cursor: default;
}
</style>
