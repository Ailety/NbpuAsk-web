<template>
  <div class="animated-background-container" @mousemove="handleMouseMove" :class="themeClass">
    <!-- 动态视差背景层 -->
    <div
      class="parallax-layer"
      :style="{ transform: `translate(${mouseX * -0.05}px, ${mouseY * -0.05}px)` }"
    >
      <div class="bg-shape shape-1"></div>
    </div>
    <div
      class="parallax-layer"
      :style="{ transform: `translate(${mouseX * 0.05}px, ${mouseY * 0.05}px)` }"
    >
      <div class="bg-shape shape-2"></div>
    </div>
    <div
      class="parallax-layer"
      :style="{ transform: `translate(${mouseX * -0.08}px, ${mouseY * 0.08}px)` }"
    >
      <div class="bg-shape shape-3"></div>
    </div>

    <!-- 存放内容的插槽 -->
    <div class="content-wrapper">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  theme: {
    type: String,
    default: 'login', // 支持 'login' 或 'register'
  },
})

const mouseX = ref(0)
const mouseY = ref(0)

const handleMouseMove = (e) => {
  mouseX.value = e.clientX - window.innerWidth / 2
  mouseY.value = e.clientY - window.innerHeight / 2
}

const themeClass = computed(() => {
  return props.theme === 'register' ? 'theme-register' : 'theme-login'
})
</script>

<style scoped>
.animated-background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 登录主题色：高贵优雅的紫蓝过渡 (Vibrant Purple-Blue) */
.theme-login {
  background:
    radial-gradient(circle at 18% 14%, rgba(191, 219, 254, 0.78), transparent 34%),
    radial-gradient(circle at 86% 80%, rgba(199, 210, 254, 0.28), transparent 32%),
    linear-gradient(135deg, #f8fbff 0%, #eef5ff 48%, #f7f9fc 100%);
}

/* 注册主题色：纯净深邃的明亮海洋蓝 (Vibrant Deep Ocean) */
.theme-register {
  background:
    radial-gradient(circle at 82% 18%, rgba(153, 246, 228, 0.52), transparent 34%),
    radial-gradient(circle at 12% 84%, rgba(186, 230, 253, 0.34), transparent 34%),
    linear-gradient(135deg, #f7fffd 0%, #edf8f6 52%, #f8fafc 100%);
}

.parallax-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(96px);
  opacity: 0.28;
}

/* 形状一 */
.shape-1 {
  top: -10%;
  left: -10%;
  width: 60vw;
  height: 60vw;
  animation: float 18s infinite alternate ease-in-out;
}
.theme-login .shape-1 {
  background: rgba(96, 165, 250, 0.42);
}
.theme-register .shape-1 {
  background: rgba(45, 212, 191, 0.34);
}

/* 形状二 */
.shape-2 {
  bottom: -10%;
  right: -10%;
  width: 50vw;
  height: 50vw;
  animation: float 22s infinite alternate-reverse ease-in-out;
}
.theme-login .shape-2 {
  background: rgba(129, 140, 248, 0.28);
}
.theme-register .shape-2 {
  background: rgba(14, 165, 233, 0.22);
}

/* 形状三 (通用亮色光斑) */
.shape-3 {
  top: 30%;
  left: 40%;
  width: 40vw;
  height: 40vw;
  background: rgba(255, 255, 255, 0.44);
  animation: float 24s infinite alternate ease-in-out;
}

@keyframes float {
  0% {
    transform: translateY(0) scale(1);
  }
  100% {
    transform: translateY(-18px) scale(1.03);
  }
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
