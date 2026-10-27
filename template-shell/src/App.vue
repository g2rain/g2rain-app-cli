<template>
  <el-config-provider :locale="elementLocale">
    <MainLayout />
  </el-config-provider>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { ElConfigProvider } from 'element-plus'
import type { Language } from 'element-plus/es/locale'
import { storeToRefs } from 'pinia'
import { MainLayout } from './shell'
import { useLocaleStore } from './platform/stores/locale.store'

const { locale: userLocale } = storeToRefs(useLocaleStore())
const elementLocale = shallowRef<Language>()

async function loadElementLocale(code: string): Promise<Language> {
  const key = code.toLowerCase().startsWith('en') ? 'en' : 'zh-cn'
  if (key === 'en') {
    return (await import('element-plus/es/locale/lang/en.mjs')).default as Language
  }
  return (await import('element-plus/es/locale/lang/zh-cn.mjs')).default as Language
}

watch(
  userLocale,
  (code) => {
    void loadElementLocale(code || 'zh-CN').then((loc) => {
      elementLocale.value = loc
    })
  },
  { immediate: true },
)
</script>

<style>
html,
body,
#app {
  margin: 0;
  min-height: 100%;
  background: var(--g2-bg-page);
  color: var(--g2-text-primary);
  font-family: var(--g2-font-family);
}
</style>
