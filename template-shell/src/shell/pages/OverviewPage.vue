<template>
  <div class="home-page">
    <el-card class="welcome-card" shadow="never">
      <h1 class="title">g2rain 开源 SaaS 平台</h1>
      <p class="subtitle">面向企业级场景的可持续交付 SaaS 开源平台</p>

      <p class="description">
        g2rain 是一个面向企业级应用的开源 SaaS 平台，围绕
        <strong>统一认证与授权</strong>、 <strong>微前端架构</strong>、
        <strong>统一管理后台</strong> 等核心能力， 提供从
        <strong>网关、SSO、主应用壳、子应用</strong> 到
        <strong>工程化规范</strong> 的一整套解决方案， 帮助企业持续、低成本地交付 SaaS 产品。
      </p>
    </el-card>

    <div class="bottom-content">
      <el-row :gutter="16" class="feature-row">
        <el-col :span="8">
          <el-card shadow="never">
            <h3>统一认证与授权</h3>
            <p>内置 SSO、Token 生命周期管理、多应用统一身份体系，支持多租户与复杂企业权限场景。</p>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never">
            <h3>微前端架构</h3>
            <p>基于 qiankun 构建的主应用 + 子应用体系，支持按租户、按权限动态加载业务模块。</p>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never">
            <h3>可持续交付</h3>
            <p>
              从工程模板、运行时能力到平台规范，帮助 SaaS 产品在长期演进中保持可维护性与可扩展性。
            </p>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="link-card" shadow="never">
        <el-row :gutter="24">
          <el-col :span="12">
            <h3 class="section-title">平台资源</h3>
            <ul class="link-list">
              <li>
                <span>项目主页：</span>
                <a href="https://github.com/g2rain" target="_blank" rel="noopener noreferrer">
                  https://github.com/g2rain
                </a>
              </li>
              <li>
                <span>官方文档：</span>
                <a
                  href="https://github.com/g2rain/g2rain"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://github.com/g2rain/g2rain
                </a>
              </li>
              <li>
                <span>讨论区：</span>
                <a
                  href="https://github.com/g2rain/g2rain/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Discussions
                </a>
              </li>
              <li>
                <span>官方网站：</span>
                <a href="http://www.g2rain.com" target="_blank" rel="noopener noreferrer">
                  http://www.g2rain.com
                </a>
              </li>
            </ul>
          </el-col>
          <el-col :span="12">
            <h3 class="section-title">联系我们</h3>
            <ul class="link-list">
              <li>
                <span>联系邮箱：</span>
                <a href="mailto:g2rain_developer@163.com">g2rain_developer@163.com</a>
              </li>
              <li>
                <span>微信公众号：</span>
                <strong>谷雨开源SaaS</strong>
              </li>
            </ul>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
// Platform intro page — no business logic.
</script>

<style scoped>
.home-page {
  padding: 16px;
  background-color: var(--g2-bg-page);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.welcome-card {
  margin-bottom: 16px;
  background-color: var(--g2-bg-container);
  border: 1px solid var(--g2-border-color-light);
  flex-shrink: 0;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--g2-text-primary);
}

.subtitle {
  color: var(--g2-text-secondary);
  margin: 0 0 16px;
  font-size: 14px;
}

.description {
  line-height: 1.7;
  color: var(--g2-text-primary);
  font-size: 14px;
  margin: 0;
}

.bottom-content {
  margin-top: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.feature-row {
  margin-bottom: 16px;
}

.feature-row :deep(.el-card) {
  background-color: var(--g2-bg-container);
  border: 1px solid var(--g2-border-color-light);
}

.feature-row :deep(.el-card h3) {
  font-size: 16px;
  margin: 0 0 8px;
  color: var(--g2-text-primary);
  font-weight: 600;
}

.feature-row :deep(.el-card p) {
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  color: var(--g2-text-secondary);
}

.link-card {
  background-color: var(--g2-bg-container);
  border: 1px solid var(--g2-border-color-light);
}

.section-title {
  font-size: 16px;
  margin: 0 0 16px;
  font-weight: 600;
  color: var(--g2-text-primary);
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.link-list li {
  line-height: 1.6;
  color: var(--g2-text-primary);
  font-size: 13px;
  margin-bottom: 8px;
}

.link-list li:last-child {
  margin-bottom: 0;
}

.link-list span {
  color: var(--g2-text-secondary);
  display: inline-block;
  min-width: 80px;
}

.link-list a {
  color: var(--g2-color-primary);
  text-decoration: none;
}

.link-list a:hover {
  text-decoration: underline;
}
</style>
