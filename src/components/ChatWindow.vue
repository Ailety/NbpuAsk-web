<template>
  <div class="chat-container" :class="{ collapsed: isSidebarCollapsed }">
    <div class="sidebar-controls">
      <div
        class="expand-btn has-tooltip"
        @click="emit('toggle-sidebar')"
        @mouseenter="showTooltip($event, '展开侧边栏')"
        @mouseleave="hideTooltip"
      >
        <ExpandBtn />
      </div>
      <div
        class="new-chat-btn has-tooltip"
        @click="emit('create-new-conversation')"
        @mouseenter="showTooltip($event, '开启新对话')"
        @mouseleave="hideTooltip"
      >
        <NewChatBtn />
      </div>
    </div>

    <div ref="chatWindowRoot" class="chat-window" :class="{ 'welcome-mode': isWelcomeMode }">
      <div ref="welcomeElements" class="welcome-elements" v-if="isWelcomeMode">
        <div class="welcome-content">
          <div class="welcome-logo">
            <img src="@/assets/logo.png" alt="Logo" />
          </div>
          <h1 class="welcome-title" :data-title="welcomeTitle">{{ welcomeTitle }}</h1>
        </div>
      </div>
      <div
        v-if="welcomeSnapshotVisible"
        class="welcome-leave-snapshot"
        :style="welcomeSnapshotStyle"
        @animationend="clearWelcomeSnapshot"
      >
        <div class="welcome-content">
          <div class="welcome-logo">
            <img src="@/assets/logo.png" alt="Logo" />
          </div>
          <h1 class="welcome-title" :data-title="welcomeTitle">{{ welcomeTitle }}</h1>
        </div>
      </div>

      <div class="chat-area" :class="{ 'fade-out': isWelcomeMode }">
        <div class="chat-header">
          <div class="chat-title-shell" :class="{ 'is-title-editing': isTitleEditing }">
            <div class="chat-title-frame" :style="titleFrameStyle" @click.stop="startTitleEdit">
              <input
                v-if="isTitleEditing"
                ref="titleInput"
                v-model="titleDraft"
                class="chat-title-input"
                maxlength="10"
                @click.stop
                @blur="commitTitleEdit"
                @keydown.enter.prevent="commitTitleEdit"
                @keydown.esc.prevent="cancelTitleEdit"
              />
              <h2 v-else class="chat-title">{{ curConvTitle }}</h2>
            </div>
            <div v-if="chatSubtitle" class="chat-subtitle">{{ chatSubtitle }}</div>
          </div>
        </div>
        <div class="chat-masking chat-header-masking"></div>

        <div
          ref="chatMessages"
          class="chat-messages"
          :class="{ 'is-preparing-conversation': showConversationLoading }"
          @scroll="handleScroll"
          @wheel.passive="handleUserScrollIntent"
          @pointerdown="handleUserScrollIntent"
          @touchstart.passive="handleUserScrollIntent"
        >
          <div
            v-show="showScrollButton && curConvData.messages.length !== 0"
            class="scroll-to-bottom"
            @click.stop="scrollToBottom({ force: true })"
          >
            <ScrollBottomBtn />
          </div>

          <ConversationMessage
            v-for="(message, index) in curConvData.messages"
            :key="index"
            class="chat-rendered-message"
            :message="message"
            :elapsed-now="elapsedNow"
            enable-streaming-tail
          />
        </div>
        <transition name="conversation-loading-fade">
          <div v-if="showConversationLoading" class="conversation-loading-layer">
            <div class="conversation-loading-card">
              <span class="conversation-loading-orbit" aria-hidden="true"></span>
              <div class="conversation-loading-copy">
                <div class="conversation-loading-title">正在加载对话数据……</div>
                <div class="conversation-loading-subtitle">即将为你定位到最新内容</div>
              </div>
            </div>
          </div>
        </transition>
        <div class="chat-masking chat-footer-masking"></div>
      </div>

      <div class="chat-input">
        <div class="input-frame">
          <textarea
            ref="messageInput"
            id="newMessageInput"
            v-model="newMessage"
            @input="adjustTextareaHeight"
            @keydown.enter="handleKeyDown"
            placeholder="给 宁青千问 发送消息"
            rows="3"
          ></textarea>
        </div>
        <div
          class="send-button-wrap"
          @mouseenter="showTooltip($event, inputBtnTip)"
          @mouseleave="hideTooltip"
        >
          <button @click="sendMessage" :disabled="!canSendMessage">
            <div class="send-icon">
              <SendMsgBtn />
            </div>
          </button>
        </div>
      </div>

      <p v-if="hasActiveConversation" class="copyright-text">
        {{ copyrightText }} | 宁青千问 是一款 AI 工具，其回答未必正确无误
      </p>

      <div class="floating-tooltip" v-if="tooltip.visible" :style="tooltipStyle">
        {{ tooltip.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import ExpandBtn from '@/components/icons/ChatWindow/expandBtn.vue'
import NewChatBtn from '@/components/icons/ChatWindow/newChatBtnS.vue'
import ScrollBottomBtn from '@/components/icons/ChatWindow/scrollBottomBtn.vue'
import SendMsgBtn from '@/components/icons/ChatWindow/sendMsgBtn.vue'
import ConversationMessage from '@/components/messages/ConversationMessage.vue'
import {
  getLocalConvs,
  getCurConvTitle,
  getCurConv,
  getCurConvIndex,
  getServerUrl,
  setCurConv,
  getAuthToken,
  formatDate,
  getConvStatusByTimestamp,
} from '@/utils/functions'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { createConversation, renameConversation } from '@/api/conversation'
import { showMessage } from '@/utils/message'
import { isThinkingMessage } from '@/utils/messageRendering'
import {
  CHAT_RUN_STATE,
  CHAT_VIEW_STATE,
  isChatRunBusyState,
  isConversationLoadingState,
  isWelcomeState,
} from '@/utils/chatStateMachine'
import { useFloatingTooltip } from '@/composables/useFloatingTooltip'

defineOptions({ name: 'ChatWindow' })

const props = defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  viewState: {
    type: String,
    default: CHAT_VIEW_STATE.INITIALIZING,
  },
})

const emit = defineEmits(['toggle-sidebar', 'create-new-conversation', 'send-message'])

const router = useRouter()
const store = useStore()

const newMessage = ref('')
const showScrollButton = ref(false)
const chatRunState = ref(CHAT_RUN_STATE.IDLE)
const modelAnswerIndex = ref(-1)
const messageInput = ref(null)
const chatMessages = ref(null)
const titleInput = ref(null)
const welcomeElements = ref(null)
const chatWindowRoot = ref(null)
const isTitleEditing = ref(false)
const titleDraft = ref('')
const elapsedNow = ref(Date.now())
const showConversationLoading = ref(false)
const welcomeSnapshotVisible = ref(false)
const welcomeSnapshotStyle = ref({})
const { tooltip, tooltipStyle, showTooltip, hideTooltip } = useFloatingTooltip()
let thinkingTimer = null
let autoScrollFrame = null
let lastAutoScrollAt = 0
let conversationLoadingHideTimer = null
let conversationLoadingVisibleAt = 0
let conversationLoadingCycle = 0
let isConversationLoadingPainted = false
let isConversationLoadingHidePending = false

const AUTO_SCROLL_THRESHOLD = 220
const SCROLL_BUTTON_THRESHOLD = 70
const CONVERSATION_LOADING_MIN_MS = computed(() => store.state.CONVERSATION_LOADING_MIN_MS)
const welcomeTitles = [
  '有什么我可以帮你的？',
  '今天想问点什么？',
  '把问题交给宁青千问。',
  '需要查资料、写内容，还是理思路？',
  '我在这里，随时开始提问。',
]
const welcomeTitle = ref(welcomeTitles[Math.floor(Math.random() * welcomeTitles.length)])

const isSidebarCollapsed = computed(() => props.sidebarCollapsed || store.state.sidebarCollapsed)
const copyrightText = computed(() => store.state.copyrightText)
const isWelcomeMode = computed(
  () =>
    isWelcomeState(props.viewState) &&
    !hasActiveConversation.value &&
    !showConversationLoading.value,
)
const wantsConversationLoading = computed(() => isConversationLoadingState(props.viewState))
const isModelThinking = computed(() => isChatRunBusyState(chatRunState.value))

watch(
  isWelcomeMode,
  (nextWelcomeMode, previousWelcomeMode) => {
    if (previousWelcomeMode && !nextWelcomeMode) {
      showWelcomeLeaveSnapshot()
    }

    if (nextWelcomeMode) {
      clearWelcomeSnapshot()
    }
  },
  { flush: 'sync' },
)

const hasActiveConversation = computed(() => getLocalConvs().length > 0 && getCurConvIndex() !== -1)
const curConvTitle = computed(() => (hasActiveConversation.value ? getCurConvTitle() : ''))
const curConvData = computed(() =>
  hasActiveConversation.value ? getCurConv().conversationData : { messages: [] },
)
const chatSubtitle = computed(() => {
  if (!hasActiveConversation.value) return ''

  const data = curConvData.value
  const createdDate = formatDate(data.createdTime || data.timestamp)
  const lastStatus = getConvStatusByTimestamp(data.timestamp)
  const createdText = createdDate ? `对话创建于 ${createdDate}` : ''
  const lastText = lastStatus ? `上次对话于 ${lastStatus}` : ''

  return [createdText, lastText].filter(Boolean).join(' · ')
})
const titleFrameStyle = computed(() => {
  const titleText = isTitleEditing.value ? titleDraft.value : curConvTitle.value
  const titleLength = Math.max(Array.from(titleText || '').length, 4)
  const hoverWidth = Math.min(480, Math.max(180, titleLength * 34 + 74))
  const editWidth = Math.min(560, Math.max(320, titleLength * 34 + 128))

  return {
    '--title-frame-width': `${isTitleEditing.value ? editWidth : hoverWidth}px`,
  }
})

function showWelcomeLeaveSnapshot() {
  const rect = welcomeElements.value?.getBoundingClientRect()
  const rootRect = chatWindowRoot.value?.getBoundingClientRect()
  if (!rect || !rootRect) return

  welcomeSnapshotStyle.value = {
    left: `${rect.left - rootRect.left}px`,
    top: `${rect.top - rootRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
  welcomeSnapshotVisible.value = true
}

function clearWelcomeSnapshot() {
  welcomeSnapshotVisible.value = false
  welcomeSnapshotStyle.value = {}
}

const pendingModelMessage = computed(() => {
  const messages = curConvData.value.messages || []
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.sender === 'model') return isThinkingMessage(message) ? message : null
    if (message.sender === 'user') return null
  }
  return null
})
const hasPendingModelResponse = computed(() => Boolean(pendingModelMessage.value))
const canSendMessage = computed(
  () => newMessage.value.trim() !== '' && !isModelThinking.value && !hasPendingModelResponse.value,
)
const inputBtnTip = computed(() =>
  hasPendingModelResponse.value || isModelThinking.value ? '宁青千问正在思考中...' : '发送消息',
)

onMounted(() => {
  nextTick(() => {
    adjustTextareaHeight()
  })

  thinkingTimer = window.setInterval(() => {
    elapsedNow.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  conversationLoadingCycle += 1
  if (thinkingTimer) {
    window.clearInterval(thinkingTimer)
    thinkingTimer = null
  }
  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
    conversationLoadingHideTimer = null
  }
  cancelAutoScroll()
})

watch(
  wantsConversationLoading,
  (shouldShowLoading) => {
    if (shouldShowLoading) {
      showConversationLoadingCard()
    } else {
      hideConversationLoadingCard()
    }
  },
  { immediate: true },
)

watch(
  hasActiveConversation,
  () => {
    nextTick(() => {
      adjustTextareaHeight()
      updateScrollButton()
    })
  },
  { immediate: true },
)

watch(
  () => [curConvData.value.messages?.length || 0, getCurConvIndex()],
  () => {
    nextTick(() => {
      updateScrollButton()
    })
  },
)

function handleScroll(event) {
  const container = event.target
  updateScrollButton(container)

  if (
    autoScrollFrame &&
    performance.now() - lastAutoScrollAt > 120 &&
    getBottomDistance(container) > AUTO_SCROLL_THRESHOLD
  ) {
    cancelAutoScroll()
  }
}

function startTitleEdit() {
  if (!hasActiveConversation.value || isTitleEditing.value) return

  titleDraft.value = curConvTitle.value
  isTitleEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function cancelTitleEdit() {
  isTitleEditing.value = false
  titleDraft.value = curConvTitle.value
}

async function commitTitleEdit() {
  if (!isTitleEditing.value) return

  const nextTitle = titleDraft.value.trim()
  const currentTitle = curConvTitle.value

  if (nextTitle === '' || nextTitle === currentTitle) {
    cancelTitleEdit()
    return
  }

  if (nextTitle.length > 10) {
    showMessage('对话名称不能超过10个字符！', 'error', 2)
    titleDraft.value = currentTitle
    isTitleEditing.value = false
    return
  }

  await renameConversation(getCurConvIndex(), nextTitle)
  isTitleEditing.value = false
}

function updateScrollButton(container = chatMessages.value) {
  if (!container || !hasActiveConversation.value) {
    showScrollButton.value = false
    return
  }

  showScrollButton.value = getBottomDistance(container) > SCROLL_BUTTON_THRESHOLD
}

function getBottomDistance(container = chatMessages.value) {
  if (!container) return 0
  return Math.max(0, container.scrollHeight - container.scrollTop - container.clientHeight)
}

function isNearBottom(container = chatMessages.value, threshold = AUTO_SCROLL_THRESHOLD) {
  return getBottomDistance(container) <= threshold
}

function cancelAutoScroll() {
  if (autoScrollFrame) {
    cancelAnimationFrame(autoScrollFrame)
    autoScrollFrame = null
  }
}

function handleUserScrollIntent() {
  cancelAutoScroll()
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve)
  })
}

async function showConversationLoadingCard() {
  conversationLoadingCycle += 1
  const cycle = conversationLoadingCycle

  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
    conversationLoadingHideTimer = null
  }

  isConversationLoadingPainted = false
  isConversationLoadingHidePending = false
  showConversationLoading.value = true
  await nextTick()
  await waitForAnimationFrame()
  await waitForAnimationFrame()

  if (cycle !== conversationLoadingCycle || !showConversationLoading.value) {
    return
  }

  conversationLoadingVisibleAt = performance.now()
  isConversationLoadingPainted = true

  if (!wantsConversationLoading.value || isConversationLoadingHidePending) {
    isConversationLoadingHidePending = true
    scheduleConversationLoadingHide()
  }
}

function hideConversationLoadingCard() {
  if (!showConversationLoading.value) return

  isConversationLoadingHidePending = true
  if (!isConversationLoadingPainted) return

  scheduleConversationLoadingHide()
}

function scheduleConversationLoadingHide() {
  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
  }

  const visibleAt = conversationLoadingVisibleAt || performance.now()
  const elapsed = performance.now() - visibleAt
  const remaining = Math.max(0, CONVERSATION_LOADING_MIN_MS.value - elapsed)

  conversationLoadingHideTimer = window.setTimeout(() => {
    if (!wantsConversationLoading.value && isConversationLoadingHidePending) {
      showConversationLoading.value = false
      isConversationLoadingPainted = false
      isConversationLoadingHidePending = false
      conversationLoadingVisibleAt = 0
    }
    conversationLoadingHideTimer = null
  }, remaining)
}

async function scrollToBottom({ force = true, immediate = false } = {}) {
  const container = chatMessages.value
  if (!container) return
  if (!force && !isNearBottom(container)) {
    updateScrollButton(container)
    return
  }

  await nextTick()

  if (force) {
    cancelAutoScroll()
  }

  if (immediate) {
    await new Promise((resolve) => {
      const jumpToBottom = () => {
        const targetScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        container.scrollTop = targetScrollTop
        updateScrollButton(container)
      }

      jumpToBottom()
      requestAnimationFrame(() => {
        jumpToBottom()
        requestAnimationFrame(() => {
          jumpToBottom()
          resolve()
        })
      })
    })
    return
  }

  if (autoScrollFrame) return

  await new Promise((resolve) => {
    const getTargetScrollTop = () => Math.max(0, container.scrollHeight - container.clientHeight)
    const startScrollTop = container.scrollTop
    const startTime = performance.now()
    const initialDistance = Math.abs(getTargetScrollTop() - startScrollTop)
    const duration = Math.min(680, Math.max(260, initialDistance * 0.18))
    const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3)

    const animationStep = (now) => {
      const targetScrollTop = getTargetScrollTop()
      const progress = Math.min((now - startTime) / duration, 1)
      const easedProgress = easeOutCubic(progress)
      container.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * easedProgress
      lastAutoScrollAt = now
      updateScrollButton(container)

      if (progress >= 1 || Math.abs(targetScrollTop - container.scrollTop) <= 0.6) {
        container.scrollTop = targetScrollTop
        autoScrollFrame = null
        updateScrollButton(container)
        resolve()
        return
      }

      autoScrollFrame = requestAnimationFrame(animationStep)
    }

    if (initialDistance <= 0.6) {
      container.scrollTop = getTargetScrollTop()
      autoScrollFrame = null
      updateScrollButton(container)
      resolve()
      return
    }

    autoScrollFrame = requestAnimationFrame(animationStep)
  })
}

function adjustTextareaHeight() {
  const textarea = messageInput.value
  if (!textarea) return

  textarea.style.transition = 'none'
  textarea.style.height = 'auto'
  textarea.offsetHeight

  const lineHeight = 24
  const minLines = 1
  const maxLines = 6
  const minHeight = lineHeight * minLines
  const maxHeight = lineHeight * maxLines

  let newHeight = textarea.scrollHeight

  if (newHeight < minHeight) {
    newHeight = minHeight
  } else if (newHeight > maxHeight) {
    newHeight = maxHeight
    textarea.style.overflowY = 'auto'
  } else {
    textarea.style.overflowY = 'hidden'
  }

  textarea.style.height = `${newHeight}px`
  textarea.offsetHeight
  textarea.style.transition = ''
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

async function sendMessage() {
  if (!canSendMessage.value) return

  const query = newMessage.value
  newMessage.value = ''
  nextTick(() => {
    adjustTextareaHeight()
  })

  if (!hasActiveConversation.value) {
    chatRunState.value = CHAT_RUN_STATE.CREATING_CONVERSATION
    const newConv = await createConversation()
    if (!newConv) {
      chatRunState.value = CHAT_RUN_STATE.IDLE
      return
    }
    router.push(`/chat/${newConv.conversationId}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
    await nextTick()
  }

  emit('send-message', query)
  nextTick(() => {
    scrollToBottom({ force: true })
  })

  const modelAnswer = {
    sender: 'model',
    message: '',
    isStreaming: true,
    streamPulse: 'a',
    thinking: true,
    thinkingStartTime: Date.now(),
  }
  const conversation = getCurConv()
  conversation.conversationData.messages.push(modelAnswer)
  modelAnswerIndex.value = conversation.conversationData.messages.length - 1
  setCurConv(conversation)

  chatRunState.value = CHAT_RUN_STATE.STREAMING
  const abortController = new AbortController()

  try {
    const authToken = getAuthToken()

    await fetchEventSource(`${getServerUrl()}/conversation/runs`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.token}`,
      },
      body: JSON.stringify({
        query,
        conversation_id: getCurConv().conversationId,
      }),
      signal: abortController.signal,
      openWhenHidden: true,
      onopen: (response) => {
        if (response.ok) return

        if (response.status >= 400) {
          const errorMsg = `服务器响应异常（状态码: ${response.status}），请稍后重试。`
          const conv = getCurConv()
          conv.conversationData.messages[modelAnswerIndex.value].message = errorMsg
          setCurConv(conv)
          abortController.abort()
          throw new Error(errorMsg)
        }
      },
      onmessage: (event) => {
        try {
          if (!event.data) return
          const parsed = JSON.parse(event.data)
          const answerChunk = parsed.text

          if (answerChunk) {
            const shouldFollowOutput = isNearBottom()
            const conv = getCurConv()
            const modelMessage = conv.conversationData.messages[modelAnswerIndex.value]
            modelMessage.message += answerChunk
            modelMessage.streamPulse = modelMessage.streamPulse === 'a' ? 'b' : 'a'
            setCurConv(conv)
            scrollToBottom({ force: shouldFollowOutput })
          }
        } catch (err) {
          console.error('SSE 数据解析错误: ', err)
        }
      },
      onclose: () => {},
      onerror: (err) => {
        console.error('SSE 连接错误或中断: ', err)
        const conv = getCurConv()
        if (!conv.conversationData.messages[modelAnswerIndex.value].message) {
          conv.conversationData.messages[modelAnswerIndex.value].message = '连接中断或服务异常。'
          setCurConv(conv)
        }
        abortController.abort()
        throw err
      },
    })
  } catch (err) {
    chatRunState.value = CHAT_RUN_STATE.IDLE
    console.error('请求失败:', err)
  } finally {
    chatRunState.value = CHAT_RUN_STATE.IDLE
    if (
      modelAnswerIndex.value !== -1 &&
      getCurConv()?.conversationData?.messages[modelAnswerIndex.value]
    ) {
      const conv = getCurConv()
      const message = conv.conversationData.messages[modelAnswerIndex.value]
      message.isStreaming = false
      message.thinking = false
      const finishedTime = Date.now()
      message.thinkingFinishedTime = finishedTime
      if (message.thinkingStartTime) {
        message.thinkingDurationSeconds = Math.max(
          0,
          Math.ceil((finishedTime - Number(message.thinkingStartTime)) / 1000),
        )
      }
      setCurConv(conv)
      nextTick(() => {
        scrollToBottom({ force: true })
      })
    }
  }
}

defineExpose({
  scrollToBottom,
})
</script>

<style scoped>
.sidebar-controls {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(12px);
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--duration-base) ease 0s,
    visibility 0s linear var(--duration-base);
}

/* SideBar收起后才显示controls，延迟显示避免与SideBar重叠 */
.chat-container.collapsed .sidebar-controls {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity 0.25s ease 0.15s,
    visibility 0s linear 0s;
}

.expand-btn,
.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  transition:
    color var(--duration-base) ease,
    background var(--duration-base) ease,
    box-shadow var(--duration-base) ease,
    transform var(--duration-base) ease;
}

.expand-btn:hover,
.new-chat-btn:hover {
  color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.expand-btn:active,
.new-chat-btn:active {
  transform: translateY(0);
}

.chat-container {
  display: flex;
  position: absolute;
  left: 260px;
  right: 0;
  height: 100vh;
  background: var(--color-page-bg);
  transition: left var(--duration-panel) cubic-bezier(0.38, 0, 0.24, 1);
}

.chat-container.collapsed {
  left: 0;
  transition: left var(--duration-panel) cubic-bezier(0.38, 0, 0.24, 1);
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  background: transparent;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-xs);
}

/* 欢迎元素 */
.chat-window.welcome-mode {
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vh, 28px);
  padding: clamp(24px, 4vh, 48px) 24px;
  box-sizing: border-box;
}

.welcome-elements {
  position: absolute;
  top: clamp(132px, 34vh, 340px);
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(720px, calc(100vw - 48px));
  padding: 0 24px;
  box-sizing: border-box;
  z-index: 5;
}

.chat-window.welcome-mode .welcome-elements {
  position: relative;
  top: auto;
  left: auto;
  transform: none;
  flex: 0 0 auto;
  width: min(720px, 100%);
  padding: 0;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

@keyframes fadeInWelcome {
  from {
    opacity: 0;
    transform: translate(-50%, -40%); /* 初始状态稍微偏下一点 */
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%); /* 最终状态完美回到中心 */
  }
}

@keyframes fadeInWelcomeStack {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-leave-snapshot {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: none;
  animation: welcome-snapshot-leave 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.chat-header {
  height: 104px;
  min-height: 104px;
  box-sizing: border-box;
  position: relative;
  z-index: 7;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  text-align: center;
  padding: 16px 0 10px;
  background: var(--color-page-bg);
  color: black;
  overflow: visible;
}

.chat-title-shell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  max-width: min(760px, 72vw);
  min-height: 66px;
  padding: 0 18px 9px;
  box-sizing: border-box;
}

.chat-title-frame {
  width: var(--title-frame-width, 260px);
  max-width: min(560px, 62vw);
  min-height: 49px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 16px 5px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 16px;
  cursor: text;
  transition:
    width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.chat-title-frame:hover,
.chat-title-shell.is-title-editing .chat-title-frame {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(203, 213, 225, 0.72);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.chat-title-shell.is-title-editing .chat-title-frame {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92));
  border-color: rgba(59, 130, 246, 0.2);
  box-shadow:
    0 12px 32px rgba(37, 99, 235, 0.09),
    inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.chat-title {
  margin: 0;
  max-width: 100%;
  color: var(--color-text-primary);
  font-size: 30px;
  font-weight: 800;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-title-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 0 8px;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.35;
}

.chat-subtitle {
  margin-top: 2px;
  width: max-content;
  max-width: min(720px, 70vw);
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-masking {
  position: absolute;
  left: 0;
  right: 14px;
  pointer-events: none;
  z-index: 6;
}

.chat-header-masking {
  top: 88px;
  height: 58px;
  background: linear-gradient(
    to bottom,
    rgba(252, 252, 252, 0.98) 0%,
    rgba(252, 252, 252, 0.9) 28%,
    rgba(252, 252, 252, 0.58) 68%,
    rgba(252, 252, 252, 0) 100%
  );
}

.chat-footer-masking {
  bottom: 0;
  height: 18px;
  background: linear-gradient(
    to top,
    rgba(252, 252, 252, 0.92) 0%,
    rgba(252, 252, 252, 0.48) 54%,
    rgba(252, 252, 252, 0) 100%
  );
}

.scroll-to-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 15px;
  left: 50.44%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: var(--color-surface);
  color: black;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  margin-bottom: 10px;
}

.scroll-to-bottom:hover {
  background: var(--color-surface-hover);
}

.scroll-to-bottom svg {
  width: 20px;
  height: 20px;
}

.chat-messages {
  flex: 1;
  height: 77vh;
  padding: 34px 20px 18px;
  overflow-y: auto;
  background: transparent;
  overscroll-behavior: contain;
  scroll-padding: 34px 0 18px;
  scrollbar-gutter: stable; /* 始终预留滚动条空间，防止内容偏移 */
  scrollbar-width: thin; /* Firefox滚动条宽度 */
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent; /* Firefox滚动条颜色 */
}

/* Webkit浏览器自定义滚动条（Chrome, Edge, Safari） */
.chat-messages.is-preparing-conversation {
  visibility: hidden;
}

.conversation-loading-layer {
  position: absolute;
  top: 104px;
  left: 0;
  right: 14px;
  bottom: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 42%,
    rgba(239, 246, 255, 0.8),
    rgba(252, 252, 252, 0) 44%
  );
}

.conversation-loading-card {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  min-width: 299px;
  padding: 17px 21px;
  color: var(--color-text-secondary);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9)), #ffffff;
  border: 1px solid rgba(147, 197, 253, 0.32);
  border-radius: var(--radius-lg);
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.08),
    0 0 42px rgba(96, 165, 250, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  animation: conversation-card-float 2.6s ease-in-out infinite;
}

.conversation-loading-orbit {
  position: relative;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    var(--color-primary),
    var(--color-accent),
    #22c55e,
    var(--color-primary)
  );
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.22);
  animation: conversation-orbit-spin 1.35s linear infinite;
}

.conversation-loading-orbit::after {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: inset 0 0 0 1px rgba(219, 234, 254, 0.95);
}

.conversation-loading-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.conversation-loading-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  background: linear-gradient(90deg, #334155 0%, #2563eb 36%, #0ea5e9 62%, #334155 100%);
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: conversation-loading-shimmer 2.2s ease-in-out infinite;
}

.conversation-loading-subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.4;
}

.conversation-loading-fade-enter-active,
.conversation-loading-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    filter 0.22s ease;
}

.conversation-loading-fade-enter-from,
.conversation-loading-fade-leave-to {
  opacity: 0;
  filter: blur(4px);
  transform: translateY(8px);
}

.conversation-loading-fade-enter-to,
.conversation-loading-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0);
}

@keyframes conversation-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes conversation-loading-shimmer {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes conversation-card-float {
  0%,
  100% {
    transform: translateY(-42px);
  }
  50% {
    transform: translateY(-45px);
  }
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  transition: background 0.2s;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.chat-rendered-message {
  --message-width: 100%;
  --message-max-width: 50%;
  --message-margin: 0 auto 30px;
  --message-last-margin-bottom: 0;
  --message-last-thinking-margin-bottom: 24px;
  --user-message-content-max-width: 100%;
  --user-message-content-margin: 20px 10px 10px 0;
  --user-message-background: #f3f3f3;
  --model-message-content-padding: 8px 0 0;
  --message-link-color: #6e8efb;
}

/* =========================================
   欢迎界面的专属过渡 (避开全局 fade 污染)
   ========================================= */
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.welcome-fade-leave-active {
  pointer-events: none;
  animation: none !important;
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 0.22s ease;
}

.welcome-elements.is-leaving,
.welcome-fade-leave-active .welcome-content {
  animation: none !important;
}

/* 进入前和离开后的状态：透明，且稍微偏下 */
.welcome-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

/* 进入后和离开前的状态：不透明，且完美居中 */
.welcome-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 对话区 */
.welcome-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.welcome-fade-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(8px);
}

@keyframes welcome-snapshot-leave {
  from {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
  to {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(8px);
  }
}

.chat-area {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  width: 100%;
  opacity: 1;
  min-height: 0;
  transition:
    flex-grow 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    flex-basis 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.28s ease-in-out;
}
.chat-area.fade-out {
  opacity: 0;
  pointer-events: none;
}

.chat-window.welcome-mode .chat-area {
  flex: 0 1 0;
  width: 100%;
  height: 0;
  min-height: 0;
  overflow: hidden;
}

.chat-input {
  width: 50%;
  display: flex;
  position: relative;
  padding: 0 15px 15px;
  margin: 0 auto;
  margin-bottom: 25px;
  background: transparent;
  z-index: 10;
  /* 增加阻尼动画曲线 */
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: translateY(0);
}

/* 欢迎模式 */
.chat-window.welcome-mode .chat-input {
  width: clamp(320px, 50vw, 650px);
  max-width: min(650px, 100%);
  margin: 0 auto;
  transform: none;
}

.input-frame {
  flex: 1;
  display: flex;
  position: relative;
  border: 1px solid rgba(203, 213, 225, 0.95);
  border-radius: 22px;
  padding: 7px 15px 11px 15px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.92)), #ffffff;
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.input-frame:focus-within {
  border-color: rgba(37, 99, 235, 0.38);
  background: var(--color-surface);
  box-shadow:
    0 18px 40px rgba(37, 99, 235, 0.11),
    0 0 0 4px rgba(37, 99, 235, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.input-frame textarea {
  flex: 1;
  padding: 10px 44px 10px 10px;
  outline: none;
  border: none;
  background: transparent;
  resize: none;
  min-height: 24px;
  max-height: 144px;
  line-height: 24px;
  font-size: inherit;
  color: var(--color-text-primary);
  overflow-y: hidden;
  transition: height 0.1s ease;
}

.input-frame textarea::placeholder {
  color: var(--color-text-subtle);
}

.chat-window.welcome-mode .input-frame textarea {
  min-height: clamp(72px, 12vh, 110px);
  padding-top: clamp(10px, 1.6vh, 15px);
}

.send-button-wrap {
  position: absolute;
  right: 48px;
  bottom: 39px;
  display: flex;
}

.chat-input button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 36%),
    linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 10px 22px rgba(37, 99, 235, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    background 0.2s ease;
  align-self: flex-end;
}

.chat-input button:hover {
  filter: saturate(1.08);
  box-shadow:
    0 14px 28px rgba(37, 99, 235, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
  transform: translateY(-1px);
}

.chat-input button:active {
  transform: translateY(0);
  box-shadow:
    0 8px 18px rgba(37, 99, 235, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.chat-input button:disabled {
  background: var(--color-border-strong);
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

.chat-window.welcome-mode .chat-input button {
  position: relative;
}

.chat-window.welcome-mode .send-button-wrap {
  right: 36px;
  bottom: 31px;
}

.send-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 16px;
}

.input-frame textarea,
.chat-input button {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.copyright-text {
  position: absolute;
  bottom: 12px;
  left: 0;
  width: 100%;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
  margin: 0;
  pointer-events: none; /* 防止遮挡下方可能存在的点击事件 */
}

.welcome-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(52px, 7vw, 72px);
  height: clamp(52px, 7vw, 72px);
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: clamp(14px, 2.4vh, 24px);
}

.welcome-logo img {
  width: clamp(34px, 4.6vw, 48px);
  height: clamp(34px, 4.6vw, 48px);
  border-radius: 50%;
}

.welcome-title {
  position: relative;
  --welcome-shine-width: clamp(96px, 18vw, 176px);
  max-width: 100%;
  font-size: clamp(20px, 2.2vw, 28px);
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--color-text-primary);
}

.welcome-title::after {
  content: attr(data-title);
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: transparent;
  background: linear-gradient(
    105deg,
    rgba(37, 99, 235, 0) 0%,
    rgba(147, 197, 253, 0.46) 35%,
    rgba(255, 255, 255, 0.94) 49%,
    rgba(37, 99, 235, 0.88) 58%,
    rgba(37, 99, 235, 0) 100%
  );
  background-repeat: no-repeat;
  background-size: var(--welcome-shine-width) 100%;
  background-position: calc(-1 * var(--welcome-shine-width)) 0;
  background-clip: text;
  -webkit-background-clip: text;
  animation: welcome-title-shine 8s linear infinite;
}

@keyframes welcome-title-shine {
  0%,
  68% {
    background-position: calc(-1 * var(--welcome-shine-width)) 0;
  }
  88%,
  100% {
    background-position: calc(100% + var(--welcome-shine-width)) 0;
  }
}
</style>
