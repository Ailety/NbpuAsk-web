<template>
  <article
    class="conversation-message"
    :class="[
      message?.sender,
      { 'is-thinking-message': isPendingThinking },
      { 'is-readonly': readonly },
    ]"
  >
    <div v-if="isModelMessage" class="model-avatar">
      <img :src="logoUrl" alt="Logo" />
    </div>

    <div
      class="message-content"
      :class="{ 'has-text': hasText }"
      :data-streaming="message?.isStreaming"
    >
      <div
        v-if="isPendingThinking"
        class="thinking-box"
        :class="{ 'is-stale': !message?.isStreaming }"
      >
        <span class="thinking-pulse" aria-hidden="true"></span>
        <div class="thinking-copy">
          <div class="thinking-line">
            <span class="thinking-text">{{ thinkingTitle }}</span>
            <span v-if="showStreamingElapsed && message?.isStreaming" class="thinking-elapsed">
              用时 {{ thinkingSeconds ?? 0 }} 秒
            </span>
          </div>
          <div v-if="!message?.isStreaming" class="thinking-note">{{ staleThinkingNote }}</div>
        </div>
      </div>

      <template v-else>
        <div class="text-wrapper" :class="textWrapperClasses" v-html="renderedMessage"></div>
        <div v-if="showThinkingDuration" class="thinking-duration">
          本次思考用时 {{ thinkingSeconds }} 秒
        </div>
      </template>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import logoUrl from '@/assets/logo.png'
import {
  getThinkingSeconds,
  getThinkingTitle,
  isThinkingMessage,
  renderMessage,
} from '@/utils/messageRendering'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  elapsedNow: {
    type: Number,
    default: () => Date.now(),
  },
  enableStreamingTail: {
    type: Boolean,
    default: false,
  },
  showStreamingElapsed: {
    type: Boolean,
    default: true,
  },
  staleThinkingNote: {
    type: String,
    default: '请稍后刷新页面或切换对话以更新数据。',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const isModelMessage = computed(() => props.message?.sender === 'model')
const isPendingThinking = computed(
  () => isThinkingMessage(props.message) && !props.message?.message,
)
const hasText = computed(() => Boolean(props.message?.message))
const renderedMessage = computed(() => renderMessage(props.message))
const thinkingSeconds = computed(() => getThinkingSeconds(props.message, props.elapsedNow))
const thinkingTitle = computed(() => getThinkingTitle(props.message))
const showThinkingDuration = computed(
  () =>
    props.message?.sender === 'model' &&
    !isThinkingMessage(props.message) &&
    thinkingSeconds.value !== null,
)
const textWrapperClasses = computed(() => {
  const isStreaming = props.message?.sender === 'model' && props.message?.isStreaming
  return {
    'is-streaming': props.enableStreamingTail && isStreaming,
    'stream-pulse-a':
      props.enableStreamingTail && isStreaming && props.message?.streamPulse !== 'b',
    'stream-pulse-b':
      props.enableStreamingTail && isStreaming && props.message?.streamPulse === 'b',
  }
})
</script>

<style scoped>
.conversation-message {
  display: flex;
  width: var(--message-width, min(760px, 100%));
  max-width: var(--message-max-width, 100%);
  margin: var(--message-margin, 0 auto 30px);
}

.conversation-message:last-child {
  margin-bottom: var(--message-last-margin-bottom, 0);
}

.conversation-message:last-child.is-thinking-message {
  margin-bottom: var(--message-last-thinking-margin-bottom, 24px);
}

.conversation-message.user {
  align-items: flex-end;
  flex-direction: column;
  justify-content: flex-end;
  animation: message-appear 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.conversation-message.model {
  align-items: flex-start;
  flex-direction: row;
  gap: var(--model-message-gap, 16px);
  animation: message-appear 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.conversation-message.model.is-thinking-message {
  align-items: center;
}

.model-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--model-avatar-size, 40px);
  height: var(--model-avatar-size, 40px);
  flex: 0 0 var(--model-avatar-size, 40px);
  margin-top: var(--model-avatar-margin-top, 2px);
  border: 1px solid #dce2e8;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.conversation-message.model.is-thinking-message .model-avatar {
  margin-top: 0;
}

.model-avatar img {
  width: var(--model-avatar-image-size, 26px);
  height: var(--model-avatar-image-size, 26px);
  margin: 0;
  border-radius: 50%;
}

.message-content {
  max-width: var(--message-content-max-width, 50%);
  min-width: 0;
  margin-bottom: var(--message-content-margin-bottom, 5px);
  padding: var(--message-content-padding, 10px 15px);
  border-radius: var(--message-content-radius, 18px);
  color: #1f2937;
  font-size: var(--message-font-size, 15px);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.conversation-message:last-child .message-content {
  margin-bottom: 0;
}

.conversation-message.model.is-thinking-message .message-content {
  padding-top: 0;
}

.conversation-message.user .message-content {
  display: inline-block;
  max-width: var(--user-message-content-max-width, min(560px, 78%));
  margin: var(--user-message-content-margin, 0);
  padding: var(--user-message-content-padding, 12px 18px);
  border-radius: var(--user-message-radius, 18px 4px 18px 18px);
  background: var(--user-message-background, #f3f4f6);
  color: #262626;
  text-align: left;
  white-space: break-spaces;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
}

.conversation-message.model .message-content {
  display: block;
  flex: 1;
  max-width: 100%;
  margin: 0;
  padding: var(--model-message-content-padding, 8px 0 0);
  border-radius: 0;
  background: transparent;
  color: #1a1a1a;
  text-align: left;
  white-space: normal;
}

.message-content[data-streaming='true'].has-text {
  animation: chunk-reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  will-change: transform, opacity, filter;
}

.thinking-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(239, 246, 255, 0.76));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  color: #334155;
}

.thinking-box.is-stale {
  align-items: flex-start;
  border-color: rgba(100, 116, 139, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
}

.thinking-pulse {
  position: relative;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  margin-top: 1px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #6e8efb, #38bdf8, #22c55e, #6e8efb);
  animation: thinking-spin 1.8s linear infinite;
}

.thinking-pulse::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: #ffffff;
}

.thinking-box.is-stale .thinking-pulse {
  background: linear-gradient(135deg, #94a3b8, #cbd5e1);
  animation: thinking-breathe 1.9s ease-in-out infinite;
}

.thinking-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.thinking-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.35;
}

.thinking-text {
  margin: 0;
  background: linear-gradient(90deg, #475569 0%, #2563eb 32%, #0ea5e9 56%, #475569 100%);
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 15px;
  font-weight: 650;
  animation:
    thinking-gradient 2.3s ease-in-out infinite,
    thinking-float 2.6s ease-in-out infinite;
}

.thinking-elapsed {
  color: #64748b;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.thinking-note {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.thinking-duration {
  margin-top: 8px;
  color: #8a8f98;
  font-size: 12px;
  line-height: 1.4;
}

.text-wrapper {
  position: relative;
  white-space: normal;
}

.text-wrapper.is-streaming {
  overflow: visible;
}

.text-wrapper.is-streaming::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -4px;
  left: 0;
  min-height: 42px;
  height: min(7.2em, 46%);
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(252, 252, 252, 0) 0%,
    rgba(252, 252, 252, 0.74) 58%,
    rgba(252, 252, 252, 0.98) 100%
  );
  filter: blur(0.2px);
  opacity: 0;
  transform: translateY(10px);
}

.text-wrapper.is-streaming.stream-pulse-a::after {
  animation: stream-tail-reveal-a 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.text-wrapper.is-streaming.stream-pulse-b::after {
  animation: stream-tail-reveal-b 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.message-content :deep(p) {
  display: block;
  margin: 0 0 0.6em;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(strong),
.message-content :deep(b) {
  color: #1a1a1a;
  font-weight: 600;
}

.message-content :deep(em),
.message-content :deep(i) {
  font-style: italic;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 0.45em 0 0.75em;
  padding-left: 24px;
}

.message-content :deep(li) {
  margin: 0.18em 0;
  line-height: 1.6;
}

.message-content :deep(li > p) {
  margin: 0.15em 0;
}

.message-content :deep(ul) {
  list-style-type: disc;
}

.message-content :deep(ol) {
  list-style-type: decimal;
}

.message-content :deep(pre) {
  margin: 12px 0;
  padding: 12px 16px;
  overflow-x: auto;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  background: #f6f8fa;
}

.message-content :deep(code) {
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  color: #e83e8c;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.message-content :deep(pre code) {
  padding: 0;
  background: none;
}

.message-content :deep(a) {
  border-bottom: 1px solid transparent;
  color: var(--message-link-color, #2563eb);
  text-decoration: none;
  transition: border-color 0.2s;
}

.message-content :deep(a:hover) {
  border-bottom-color: var(--message-link-color, #2563eb);
}

.message-content :deep(.footnote-ref) {
  margin-left: 2px;
  color: var(--message-link-color, #2563eb);
  cursor: default;
  font-size: 0.85em;
  font-weight: 500;
}

.message-content :deep(br) {
  display: initial;
}

@keyframes chunk-reveal {
  0% {
    opacity: 0;
    transform: translateY(8px);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes message-appear {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes thinking-gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes thinking-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
  }
}

@keyframes thinking-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes thinking-breathe {
  0%,
  100% {
    opacity: 0.62;
    transform: scale(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes stream-tail-reveal-a {
  0% {
    opacity: 0.96;
    transform: translateY(12px);
  }
  100% {
    opacity: 0;
    transform: translateY(-2px);
  }
}

@keyframes stream-tail-reveal-b {
  0% {
    opacity: 0.96;
    transform: translateY(12px);
  }
  100% {
    opacity: 0;
    transform: translateY(-2px);
  }
}
</style>
