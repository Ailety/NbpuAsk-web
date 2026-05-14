<template>
  <AnimatedBackground :theme="currentTheme">
    <div class="legal-container">
      <div class="legal-card">
        <div class="legal-header">
          <h1 class="title">隐私政策</h1>
          <p class="subtitle">最近更新：2026年05月01日</p>
        </div>

        <div class="legal-content">
          <section>
            <h2>一、我们收集的信息</h2>
            <p>为了提供对话服务，我们会收集：</p>
            <ul>
              <li><strong>账户信息：</strong>您的用户名及加密后的密码（用于身份校验）。</li>
              <li>
                <strong>对话历史：</strong
                >我们会存储您的聊天记录，以便您在不同设备登录时同步上下文记忆。
              </li>
              <li><strong>设备信息：</strong>仅用于Token安全校验的必要浏览器指纹信息。</li>
            </ul>
          </section>

          <section>
            <h2>二、信息的使用方式</h2>
            <p>收集的数据仅用于以下目的：</p>
            <ul>
              <li>通过 <strong>RAG 技术</strong> 匹配校园知识库，为您提供精准答案。</li>
              <li>
                将您的提问发送至
                <strong>阿里百炼 (DashScope)</strong>
                接口进行语义生成（我们会对敏感信息进行脱敏处理）。
              </li>
              <li>优化模型响应速度及回答准确率。</li>
            </ul>
          </section>

          <section>
            <h2>三、数据安全</h2>
            <p>我们采用行业领先的技术保护您的隐私：</p>
            <ul>
              <li>密码使用 <strong>BCrypt</strong> 进行不可逆加盐哈希存储。</li>
              <li>敏感配置（如API Key）使用 <strong>AES-256</strong> 对称加密。</li>
              <li>对话接口采用 <strong>JWT (JSON Web Token)</strong> 鉴权，防止数据越权访问。</li>
            </ul>
          </section>

          <section>
            <h2>四、您的权利</h2>
            <p>
              您可以随时通过侧边栏操作删除特定对话记录。一旦删除，对应的数据库记录将永久抹除，无法找回。
            </p>
          </section>
        </div>

        <div class="legal-footer">
          <button class="back-btn" @click="$router.back()">我知道了</button>
        </div>
      </div>
    </div>
  </AnimatedBackground>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AnimatedBackground from '@/components/AnimatedBackground.vue'

const route = useRoute()
const currentTheme = computed(() => {
  return route.query.theme === 'register' ? 'register' : 'login'
})
</script>

<style scoped src="@/assets/legal-page.css"></style>
