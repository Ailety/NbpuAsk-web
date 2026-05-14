<template>
  <AnimatedBackground :theme="currentTheme">
    <div class="legal-container">
      <div class="legal-card">
        <div class="legal-header">
          <h1 class="title">用户协议</h1>
          <p class="subtitle">生效日期：2026年05月01日</p>
        </div>

        <div class="legal-content">
          <section>
            <h2>一、服务说明</h2>
            <p>
              “宁青千问”是专为宁波职业技术大学（及相关校区）师生设计的AI助手。本服务利用大语言模型技术为您提供校园咨询、教务查询及学术辅助。请您知悉，AI生成的内容具有随机性，仅供参考。
            </p>
          </section>

          <section>
            <h2>二、用户行为规范</h2>
            <ul>
              <li>严禁利用本工具传播违反国家法律法规、公序良俗的信息。</li>
              <li>严禁上传或咨询涉及国家秘密、校务敏感数据及他人隐私的内容。</li>
              <li>用户需保证注册信息的真实性，且仅限本人使用校内账号。</li>
            </ul>
          </section>

          <section>
            <h2>三、免责声明</h2>
            <p>
              由于AI技术的局限性，本系统回答可能包含错误或过时的信息。对于涉及请假、考试、财务等重大决策，请务必以校方官方通知和教务系统数据为准，开发者不对因参考AI建议造成的损失负责。
            </p>
          </section>

          <section>
            <h2>四、知识产权</h2>
            <p>
              本系统及相关算法架构由开发者陈敬幸研发，受知识产权法保护。未经授权，严禁对接口进行恶意爬取或商业倒卖。
            </p>
          </section>
        </div>

        <div class="legal-footer">
          <button class="back-btn" @click="$router.back()">返回</button>
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
