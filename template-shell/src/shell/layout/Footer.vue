<template>
  <footer class="shell-footer">
    <div class="footer-content">
      <span class="copyright">© 2026 谷雨开源SaaS(G2rain)</span>
      <span class="divider" aria-hidden="true">|</span>
      <a
        href="https://www.g2rain.com"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        G2rain官网
      </a>
      <span class="divider" aria-hidden="true">|</span>
      <a
        href="https://github.com/g2rain"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        项目主页
      </a>
    </div>
  </footer>
</template>

<script setup lang="ts">
</script>

<style scoped>
.shell-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-top: 1px solid var(--g2-border-color);
  background: var(--g2-bg-container);
  color: var(--g2-text-secondary);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  font-size: 12px;
  line-height: 1.4;
}

.copyright {
  color: var(--g2-text-secondary);
}

.divider {
  color: var(--g2-border-color);
}

.footer-link {
  color: var(--g2-color-primary);
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}
</style>
