import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import TermsOfUse from '@/views/legal_pages/TermsOfUse.vue'
import PrivacyPolicy from '@/views/legal_pages/PrivacyPolicy.vue'
import ChatView from '@/views/ChatView.vue'
import SharedView from '@/views/SharedView.vue'
import { verifyToken } from '@/api/auth'
import { getAuthToken } from '@/utils/functions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'Login',
      component: LoginView,
      meta: { title: '宁青千问 - 登录' },
    },
    {
      path: '/register',
      name: 'Register',
      component: RegisterView,
      meta: { title: '宁青千问 - 注册' },
    },
    {
      path: '/terms',
      name: 'TermsOfUse',
      component: TermsOfUse,
      meta: { title: '宁青千问 - 用户协议' },
    },
    {
      path: '/privacy',
      name: 'PrivacyPolicy',
      component: PrivacyPolicy,
      meta: { title: '宁青千问 - 隐私政策' },
    },
    {
      path: '/chat',
      name: 'Chat',
      component: ChatView,
      meta: {
        requiresAuth: true,
        isAutoLogin: true,
        title: '宁青千问 - 主页',
      },
    },
    {
      path: '/chat/:id',
      name: 'ChatDetail',
      component: ChatView,
      meta: {
        requiresAuth: true,
        isAutoLogin: true,
        title: '宁青千问 - 主页',
      },
    },
    {
      path: '/shared/:id',
      name: 'SharedConversation',
      component: SharedView,
      meta: { title: '宁青千问 - 分享对话' },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  if (!to.matched.length) {
    next('/login')
    return
  }

  document.title = to.meta.title || '宁青千问'

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthPage = to.path === '/login' || to.path === '/register'

  if (requiresAuth) {
    const verifyResult = await verifyToken()

    if (!verifyResult.isAuthenticated) {
      localStorage.setItem('tokenStatus', verifyResult.status)
      next('/login')
      return
    }

    to.meta.isAutoLogin = true
    if (
      (from.path === '/login' || from.path === '/register') &&
      to.path.startsWith('/chat') &&
      getAuthToken()?.accessTime === 1
    ) {
      to.meta.isAutoLogin = false
    }

    next()
    return
  }

  if (isAuthPage && getAuthToken()) {
    const verifyResult = await verifyToken()
    if (verifyResult.isAuthenticated) {
      next('/chat')
      return
    }
  }

  next()
})

export default router
