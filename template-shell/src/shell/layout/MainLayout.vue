<template>
  <!-- Bare auth pages: no shell chrome (align main-shell MainLayout). -->
  <router-view v-if="isBareAuthRoute" />

  <div v-else class="app-container">
    <Header />
    <div class="app-main">
      <Sidebar />
      <div class="app-content">
        <TabBar />
        <Workspace />
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from './Header.vue'
import Sidebar from './Sidebar.vue'
import TabBar from './TabBar.vue'
import Workspace from './Workspace.vue'
import Footer from './Footer.vue'

const route = useRoute()

/** SSO / logout must not render Workspace chrome. */
const isBareAuthRoute = computed(
  () => route.meta.bare === true || route.path.endsWith('/sso_callback') || route.path.endsWith('/logout'),
)
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--g2-bg-page);
}

.app-main {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
