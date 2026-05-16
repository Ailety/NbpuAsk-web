import { createStore } from 'vuex'

// 创建一个新的 store 实例
const store = createStore({
  state() {
    return {
      curConvIndex: -1,
      conversations: [],
      conversationShares: [],
      sidebarCollapsed: false, // 侧边栏是否折叠
      rnDialogVisible: false, // 重命名对话框是否显示
      rnConvIndex: -1, // 重命名的对话索引
      copyrightText: 'Copyright 2025-2026 NBPU-陈敬幸 版权所有', // 版权信息
      CONVERSATION_LOADING_MIN_MS: 700, // 对话加载最短时长
      serverUrl: '/api', // 后端url 本地http://localhost:8088 云端/api
    }
  },
  mutations: {
    setCurConvIndex(state, index) {
      state.curConvIndex = index
    },
    setConversations(state, conversations) {
      state.conversations = conversations
    },
    setConversationShares(state, conversationShares) {
      state.conversationShares = conversationShares
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setRnDialogVisible(state, visible) {
      state.rnDialogVisible = visible
    },
    setRnConvIndex(state, index) {
      state.rnConvIndex = index
    },
  },
})

export default store
