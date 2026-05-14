<template>
  <div class="shared-page">
    <div v-if="isLoading" class="shared-state">
      <div class="state-card">
        <span class="loading-orbit" aria-hidden="true"></span>
        <div>
          <div class="state-title">正在加载分享对话……</div>
          <div class="state-subtitle">请稍候，正在读取对话内容</div>
        </div>
      </div>
    </div>

    <div v-else-if="loadError" class="shared-state">
      <div class="state-card is-error">
        <i class="pi pi-exclamation-circle"></i>
        <div>
          <div class="state-title">分享对话不可用</div>
          <div class="state-subtitle">该链接可能不存在，或原对话已被删除。</div>
        </div>
      </div>
    </div>

    <main v-else class="shared-shell">
      <header class="shared-header">
        <div class="brand-line">
          <div class="brand-logo">
            <img src="@/assets/logo.png" alt="Logo" />
          </div>
          <div class="brand-copy">
            <div class="brand-note">
              <span>该对话来自分享，</span>
              <span>由宁青千问生成，请仔细甄别。</span>
            </div>
          </div>
        </div>

        <section class="share-hero-card">
          <div class="title-block">
            <h1>{{ conversationTitle }}</h1>
            <p>{{ conversationSubtitle }}</p>
          </div>

          <div class="share-info-strip">
            <div class="owner-card" tabindex="0">
              <div class="owner-avatar" aria-hidden="true">
                <span>{{ ownerInitial }}</span>
              </div>
              <div class="owner-copy">
                <span>分享者</span>
                <strong>{{ ownerName }}</strong>
              </div>
              <div class="owner-popover">
                <div class="owner-popover-head">
                  <div class="owner-popover-avatar">{{ ownerInitial }}</div>
                  <div>
                    <div class="owner-popover-name">{{ ownerName }}</div>
                    <div class="owner-popover-id">{{ ownerIdText }}</div>
                  </div>
                </div>
                <div class="owner-popover-intro">{{ ownerIntro }}</div>
              </div>
            </div>

            <div class="share-stat-card">
              <i class="pi pi-calendar"></i>
              <span>分享于 {{ shareDateText }}</span>
            </div>
            <div class="share-stat-card">
              <i class="pi pi-eye"></i>
              <span>{{ visitCountText }}</span>
            </div>
          </div>
        </section>
      </header>

      <section class="shared-messages">
        <div v-if="messages.length === 0" class="empty-message">
          <i class="pi pi-comments"></i>
          <span>这段分享对话暂时没有消息。</span>
        </div>

        <ConversationMessage
          v-for="(message, index) in messages"
          :key="index"
          class="shared-rendered-message"
          :message="message"
          stale-thinking-note="请稍后刷新页面以查看更新后的分享内容。"
          readonly
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { useStore } from 'vuex'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ConversationMessage from '@/components/messages/ConversationMessage.vue'
import { formatDate, getConvStatusByTimestamp } from '@/utils/functions'
import { getSharedConversation } from '@/api/share'

defineOptions({ name: 'SharedView' })

const route = useRoute()
const store = useStore()
const isLoading = ref(true)
const loadError = ref(false)
const conversation = ref(null)
const sharedPayload = ref(null)
const SHARED_LOADING_MIN_MS = computed(() => store.state.CONVERSATION_LOADING_MIN_MS)

const conversationData = computed(() => conversation.value?.conversationData || {})
const conversationTitle = computed(() => conversationData.value.title || '分享对话')
const messages = computed(() => conversationData.value.messages || [])
const shareData = computed(() => sharedPayload.value?.share || {})
const ownerInfo = computed(() => sharedPayload.value?.owner || {})
const ownerName = computed(() => ownerInfo.value.nickname || ownerInfo.value.username || '匿名用户')
const ownerIntro = computed(() => ownerInfo.value.intro || '该用户暂无简介。')
const ownerIdText = computed(() => {
  const userId = ownerInfo.value.userId
  return userId ? `ID: ${userId}` : 'ID: -'
})
const ownerInitial = computed(() => Array.from(ownerName.value || 'N')[0]?.toUpperCase() || 'N')
const shareDateText = computed(() => formatDate(shareData.value.shareCreatedTime) || '-')
const visitCountText = computed(() => `${Number(shareData.value.visitCount || 0)} 次访问`)
const conversationSubtitle = computed(() => {
  const createdDate = formatDate(
    conversationData.value.createdTime || conversationData.value.timestamp,
  )
  const lastStatus = getConvStatusByTimestamp(conversationData.value.timestamp)
  const createdText = createdDate ? `对话创建于 ${createdDate}` : ''
  const lastText = lastStatus ? `上次对话于 ${lastStatus}` : ''
  return [createdText, lastText].filter(Boolean).join(' · ')
})

onMounted(async () => {
  const sharedId = route.params.id
  const loadingPaint = waitForSharedLoadingPaint()
  const dataPromise = getSharedConversation(sharedId)
  const loadingVisibleAt = await loadingPaint
  const data = await dataPromise
  sharedPayload.value = data
  conversation.value = data?.conversation || null
  loadError.value = !data?.conversation
  await waitRemainingLoadingTime(loadingVisibleAt)
  isLoading.value = false
})

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve)
  })
}

async function waitForSharedLoadingPaint() {
  await nextTick()
  await waitForAnimationFrame()
  await waitForAnimationFrame()
  return performance.now()
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function waitRemainingLoadingTime(startedAt) {
  const elapsed = performance.now() - startedAt
  const remaining = SHARED_LOADING_MIN_MS.value - elapsed
  if (remaining > 0) {
    await wait(remaining)
  }
}
</script>

<style scoped>
.shared-page {
  width: 100vw;
  min-height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at 50% 0%, rgba(219, 234, 254, 0.7), transparent 34%),
    linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%);
  color: #0f172a;
}

.shared-shell {
  width: min(960px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 0 0 64px;
}

.shared-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 5;
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 286px;
  padding: 18px 0 28px;
  box-sizing: border-box;
  background: linear-gradient(
    180deg,
    rgba(251, 253, 255, 0.98) 0%,
    rgba(251, 253, 255, 0.86) 76%,
    rgba(251, 253, 255, 0) 100%
  );
  backdrop-filter: blur(14px);
}

.brand-line {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: min(520px, 100%);
  margin: 0 auto 16px;
  padding: 10px 16px 10px 10px;
  border: 1px solid rgba(191, 219, 254, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 251, 255, 0.78)),
    rgba(255, 255, 255, 0.8);
  box-shadow:
    0 12px 30px rgba(15, 23, 42, 0.06),
    0 0 30px rgba(96, 165, 250, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.brand-logo img {
  width: 27px;
  height: 27px;
  border-radius: 50%;
}

.brand-copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  min-width: 0;
}

.brand-note {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 3px;
  color: #64748b;
  font-size: 12.5px;
  line-height: 1.35;
  white-space: normal;
}

.share-hero-card {
  width: min(760px, 100%);
  padding: 22px 24px 17px;
  box-sizing: border-box;
  border: 1px solid rgba(219, 234, 254, 0.9);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 251, 255, 0.76)),
    rgba(255, 255, 255, 0.82);
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.07),
    0 0 56px rgba(96, 165, 250, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
}

.title-block {
  text-align: center;
}

.title-block h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 850;
  line-height: 1.18;
}

.title-block p {
  margin: 9px 0 0;
  color: #64748b;
  font-size: 14px;
}

.share-info-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.owner-card,
.share-stat-card {
  display: inline-flex;
  align-items: center;
  min-height: 52px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.055);
}

.owner-card {
  position: relative;
  gap: 11px;
  min-width: 132px;
  max-height: 52px;
  padding: 7px 14px 7px 8px;
  outline: none;
}

.owner-card:hover,
.owner-card:focus-within {
  border-color: rgba(147, 197, 253, 0.86);
  box-shadow:
    0 14px 32px rgba(15, 23, 42, 0.08),
    0 0 0 3px rgba(59, 130, 246, 0.08);
}

.owner-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2);
}

.owner-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  text-align: left;
}

.owner-copy span,
.share-stat-card span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.25;
}

.owner-copy strong {
  max-width: 140px;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 780;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.owner-copy small {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.2;
}

.share-stat-card {
  gap: 8px;
  padding: 0 14px;
}

.share-stat-card i {
  color: #2563eb;
  font-size: 15px;
}

.owner-popover {
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  z-index: 20;
  width: 278px;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 6px) scale(0.98);
  transform-origin: top center;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92)),
    rgba(255, 255, 255, 0.94);
  box-shadow:
    0 24px 52px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.owner-popover::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 12px;
  height: 12px;
  transform: translateX(-50%) rotate(45deg);
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  border-left: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.96);
}

.owner-card:hover .owner-popover,
.owner-card:focus-within .owner-popover {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.owner-popover-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.owner-popover-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  border-radius: 16px;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
}

.owner-popover-name {
  color: #0f172a;
  font-size: 17px;
  font-weight: 760;
  line-height: 1.3;
}

.owner-popover-id {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.owner-popover-intro {
  margin-top: 14px;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.shared-messages {
  padding: 0 0 24px;
}

.shared-rendered-message {
  --message-width: min(760px, 100%);
  --message-max-width: 100%;
  --message-margin: 0 auto 30px;
  --user-message-content-max-width: min(560px, 78%);
  --model-message-content-padding: 7px 0 0;
  --message-link-color: #2563eb;
}

.empty-message,
.shared-state {
  display: flex;
  align-items: center;
  justify-content: center;
}

.shared-state {
  min-height: 100vh;
}

.empty-message {
  min-height: 220px;
  gap: 10px;
  color: #64748b;
}

.state-card {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 18px 21px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  transform: translateY(-42px);
}

.state-card.is-error i {
  color: #ef4444;
  font-size: 25px;
}

.state-title {
  color: #0f172a;
  font-size: 17px;
  font-weight: 750;
  line-height: 1.35;
}

.state-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.4;
}

.loading-orbit {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #2563eb, #0ea5e9, #22c55e, #2563eb);
  animation: spin 1.35s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .shared-shell {
    width: calc(100vw - 28px);
    padding-top: 0;
  }

  .shared-header {
    min-height: 334px;
    padding-top: 14px;
  }

  .brand-line {
    width: 100%;
    box-sizing: border-box;
  }

  .share-hero-card {
    padding: 20px 18px 16px;
  }

  .share-info-strip {
    justify-content: flex-start;
  }

  .owner-card,
  .share-stat-card {
    width: 100%;
  }

  .owner-popover {
    left: 0;
    width: min(278px, calc(100vw - 72px));
    transform: translateY(6px) scale(0.98);
  }

  .owner-popover::before {
    left: 27px;
  }

  .owner-card:hover .owner-popover,
  .owner-card:focus-within .owner-popover {
    transform: translateY(0) scale(1);
  }
}
</style>
