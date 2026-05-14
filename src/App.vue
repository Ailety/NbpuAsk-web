<template>
  <div id="app">
    <ConfirmDialog :draggable="false">
      <template #message="slotProps">
        <div class="confirm-message-lines">
          <p v-for="(line, index) in getConfirmMessageLines(slotProps.message)" :key="index">
            {{ line }}
          </p>
        </div>
      </template>
    </ConfirmDialog>
    <router-view v-slot="{ Component, route }">
      <transition :name="transitionName">
        <component :is="Component" :key="route.path.split('/')[1]" />
      </transition>
    </router-view>
  </div>
</template>

<script>
import ConfirmDialog from 'primevue/confirmdialog'
import { RouterView } from 'vue-router'
export default {
  name: 'App',
  components: {
    RouterView,
    ConfirmDialog,
  },
  data() {
    return {
      transitionName: 'slide-left',
    }
  },
  watch: {
    $route(to, from) {
      // 定义路由顺序
      const routes = ['/login', '/register', '/chat']
      const toIndex = routes.indexOf(to.path)
      const fromIndex = routes.indexOf(from.path)
      const isAuthSwitch =
        (to.path === '/login' || to.path === '/register') &&
        (from.path === '/login' || from.path === '/register')

      if (isAuthSwitch) {
        this.transitionName = 'auth-fade'
        return
      }

      // 根据路由方向确定过渡动画
      if (toIndex > fromIndex) {
        this.transitionName = 'slide-left'
      } else if (toIndex < fromIndex) {
        this.transitionName = 'slide-right'
      } else {
        this.transitionName = 'fade'
      }
    },
  },
  methods: {
    getConfirmMessageLines(message) {
      return String(message?.message || '').split('\n')
    },
  },
}
</script>

<style>
/* 全局样式 */
html,
body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ant-design-vue a-spin 全局样式支持 - 突破transform限制 */
.ant-spin-nested-loading {
  width: 100%;
  height: 100%;
}

.ant-spin-container {
  width: 100%;
  height: 100%;
}

/* 让加载图标和文字突破transform限制，固定在视口中心 */
.ant-spin-spinning > .ant-spin {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  max-height: none !important;
  z-index: 1001;
}

/* 模糊遮罩层 - 统一颜色 */
.ant-spin-blur {
  opacity: 0.6;
  pointer-events: none;
}

.confirm-message-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #475569;
  font-size: 14px;
  line-height: 1.55;
}

.confirm-message-lines p {
  margin: 0;
}

.p-dialog-mask {
  box-sizing: border-box;
  padding-bottom: 6vh;
}

.p-dialog .p-dialog-header-close:focus,
.p-dialog .p-dialog-header-close:focus-visible,
.p-dialog .p-dialog-header-icon:focus,
.p-dialog .p-dialog-header-icon:focus-visible,
.p-dialog .p-dialog-close-button:focus,
.p-dialog .p-dialog-close-button:focus-visible {
  outline: none;
  box-shadow: none;
}

.ant-message {
  z-index: 3000 !important;
}

/* =========================================================
   页面过渡动画 (Modern Page Transitions)
   小尺寸横移 + 景深缩放 + 物理阻尼曲线
========================================================= */

/* 淡入淡出 (如未知层级跳转) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: absolute;
  width: 100%;
  height: 100%;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.auth-fade-enter-active,
.auth-fade-leave-active {
  position: absolute;
  width: 100%;
  height: 100%;
  transition:
    opacity 0.26s ease,
    filter 0.26s ease;
}

.auth-fade-enter-active {
  z-index: 2;
}

.auth-fade-leave-active {
  z-index: 1;
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
  filter: blur(3px);
}

/* 向左滑动 (前进：如 Login -> Register -> Chat) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); /* 丝滑阻尼曲线 */
  position: absolute;
  width: 100%;
  height: 100%;
}
.slide-left-enter-active {
  z-index: 2; /* 新页面在上层 */
}
.slide-left-leave-active {
  z-index: 1; /* 老页面在下层 */
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(40px); /* 减小位移量，避免晃眼 */
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.96); /* 老页面向左退出的同时微微缩小，产生纵深下沉的视觉差 */
}

/* 向右滑动 (后退：如 Chat -> Login) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: absolute;
  width: 100%;
  height: 100%;
}
.slide-right-enter-active {
  z-index: 2;
}
.slide-right-leave-active {
  z-index: 1;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.96); /* 离开时同样带一点纵深感 */
}
</style>

<style scoped>
#app {
  display: flex;
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #f8fbff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}
</style>
