<template>
  <Transition name="auth-loading-fade">
    <div v-if="visible" class="auth-loading-overlay">
      <div class="auth-loading-card" role="status" aria-live="polite">
        <div class="auth-loading-visual" aria-hidden="true">
          <span class="orbit orbit-one"></span>
          <span class="orbit orbit-two"></span>
          <span class="pulse-ring"></span>
          <span class="logo-shell">
            <img src="@/assets/logo.png" alt="" />
          </span>
        </div>
        <div class="auth-loading-copy">
          <div class="auth-loading-title">{{ title }}</div>
          <div class="auth-loading-subtitle">{{ subtitle }}</div>
        </div>
        <div class="auth-loading-track" aria-hidden="true">
          <span></span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '正在准备',
  },
  subtitle: {
    type: String,
    default: '请稍候片刻',
  },
})
</script>

<style scoped>
.auth-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: clamp(44px, 9vh, 86px);
  background:
    radial-gradient(circle at 50% 44%, rgba(239, 246, 255, 0.58), rgba(248, 250, 252, 0) 42%),
    rgba(248, 250, 252, 0.38);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.auth-loading-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 330px;
  padding: 20px 22px;
  overflow: hidden;
  color: var(--color-text-primary);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.88)),
    rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(191, 219, 254, 0.72);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 70px rgba(15, 23, 42, 0.14),
    0 0 54px rgba(96, 165, 250, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.auth-loading-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.86), transparent 30%),
    linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.52) 44%, transparent 58%);
  opacity: 0.72;
}

.auth-loading-visual,
.auth-loading-copy,
.auth-loading-track {
  position: relative;
  z-index: 1;
}

.auth-loading-visual {
  position: relative;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbit,
.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.orbit-one {
  border: 2px solid rgba(37, 99, 235, 0.16);
  border-top-color: var(--color-primary);
  animation: auth-orbit-spin 1.08s linear infinite;
}

.orbit-two {
  inset: 7px;
  border: 2px solid rgba(14, 165, 233, 0.14);
  border-right-color: var(--color-accent);
  animation: auth-orbit-spin 1.7s linear infinite reverse;
}

.pulse-ring {
  inset: 12px;
  background: rgba(239, 246, 255, 0.72);
  box-shadow: 0 0 24px rgba(37, 99, 235, 0.18);
  animation: auth-pulse 1.8s ease-in-out infinite;
}

.logo-shell {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--color-surface);
  border: 1px solid rgba(219, 234, 254, 0.9);
  border-radius: 50%;
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.logo-shell img {
  width: 25px;
  height: 25px;
  object-fit: contain;
}

.auth-loading-copy {
  min-width: 0;
  flex: 1;
}

.auth-loading-title {
  font-size: 18px;
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: 0;
}

.auth-loading-subtitle {
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.auth-loading-track {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 13px;
  height: 3px;
  overflow: hidden;
  background: rgba(219, 234, 254, 0.72);
  border-radius: var(--radius-pill);
}

.auth-loading-track span {
  display: block;
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: inherit;
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.28);
  animation: auth-track-flow 1.25s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}

.auth-loading-fade-enter-active,
.auth-loading-fade-leave-active {
  transition:
    opacity 0.22s ease,
    filter 0.22s ease;
}

.auth-loading-fade-enter-active .auth-loading-card,
.auth-loading-fade-leave-active .auth-loading-card {
  transition:
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.22s ease;
}

.auth-loading-fade-enter-from,
.auth-loading-fade-leave-to {
  opacity: 0;
  filter: blur(4px);
}

.auth-loading-fade-enter-from .auth-loading-card,
.auth-loading-fade-leave-to .auth-loading-card {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@keyframes auth-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes auth-pulse {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.82;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes auth-track-flow {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(260%);
  }
}
</style>
