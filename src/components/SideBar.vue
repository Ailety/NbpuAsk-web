<template>
  <div class="conversation-list" :class="{ collapsed: isSidebarCollapsed }">
    <div class="conversation-header">
      <div class="brand-row">
        <div class="brand-mark">
          <img src="@/assets/logo.png" alt="宁青千问" />
        </div>
        <div class="brand-copy">
          <h1>宁青千问</h1>
          <span>智 能 校 园 助 手</span>
        </div>
        <div
          class="collapse-btn has-tooltip"
          @click="toggleCollapse"
          tabindex="0"
          @mouseenter="showTooltip($event, '收起侧边栏', { placement: 'below' })"
          @mouseleave="hideTooltip"
        >
          <CollapsedBtn />
        </div>
      </div>
      <button class="new-chat-btn" @click="emit('create-new-conversation')">
        <span class="new-chat-icon">
          <NewChatBtn />
        </span>
        <span>开启新对话</span>
      </button>
    </div>
    <div class="conversation-items">
      <div v-if="updateConversations.length === 0" class="conversation-empty">
        <i class="pi pi-comments"></i>
        <span>暂无对话</span>
      </div>
      <div
        v-for="(conv, index) in updateConversations"
        :key="index"
        class="conversation-item"
        :class="{ active: curConvIndex === index, 'menu-open': activeMenu === index }"
        @click="selectConversation(index)"
      >
        <div class="conversation-text">
          <span class="conversation-title">{{ conv.conversationData.title }}</span>
          <span class="conversation-time">{{ getConvStatus(conv) }}</span>
        </div>
        <div class="conversation-actions">
          <button
            class="action-btn has-tooltip"
            @click.stop="toggleActionMenu(index, $event)"
            @mouseenter="showTooltip($event, '更多操作')"
            @mouseleave="hideTooltip"
          >
            <ActionBtn />
          </button>
        </div>
      </div>
      <RenameDialog />
    </div>

    <div
      ref="actionMenuRef"
      class="action-menu floating-menu"
      v-if="activeMenu !== null"
      :style="actionMenuStyle"
    >
      <button @click.stop="showRnDialog(activeMenu)">
        <i class="pi pi-pen-to-square"></i>
        <span>编辑</span>
      </button>
      <button v-if="!isConversationShared(activeMenu)" @click.stop="shareConversation(activeMenu)">
        <i class="pi pi-share-alt"></i>
        <span>分享</span>
      </button>
      <button v-else class="is-danger" @click.stop="cancelShareConversation(activeMenu)">
        <i class="pi pi-link"></i>
        <span>取消分享</span>
      </button>
      <button @click.stop="deleteConversation(activeMenu)">
        <i class="pi pi-trash"></i>
        <span>删除</span>
      </button>
    </div>

    <!-- 用户信息区域 -->
    <div class="user-info">
      <div class="user-profile">
        <div class="user-avatar">
          <img
            src="https://xj-psd-1258344703.cos.ap-guangzhou.myqcloud.com/image/hunyuan/logo/anno.png"
            alt="用户头像"
          />
        </div>
        <div class="user-copy">
          <div class="user-name">{{ getUsername }}</div>
          <div class="user-role">已登录</div>
        </div>
      </div>
      <button
        class="settings-icon has-tooltip"
        @click.stop="toggleSettingMenu($event)"
        @mouseenter="showTooltip($event, '账户管理')"
        @mouseleave="hideTooltip"
      >
        <el-icon :size="20"><Setting /></el-icon>
      </button>
    </div>
    <AccountSettingsDialog
      v-model:visible="accountSettingsVisible"
      @profile-updated="handleProfileUpdated"
      @conversations-cleared="handleConversationsCleared"
    />

    <div
      ref="settingMenuRef"
      class="setting-menu floating-menu"
      v-if="settingMenu"
      :style="settingMenuStyle"
    >
      <button class="settings-menu-button" @click.stop="openAccountSettings">
        <i class="pi pi-user"></i>
        <span>账号设置</span>
      </button>
      <button @click.stop="logout()">
        <i class="pi pi-sign-out"></i>
        <span>退出登录</span>
      </button>
    </div>

    <div class="floating-tooltip" v-if="tooltip.visible" :style="tooltipStyle">
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import ActionBtn from '@/components/icons/SideBar/actionBtn.vue'
import NewChatBtn from '@/components/icons/SideBar/newChatBtnL.vue'
import CollapsedBtn from '@/components/icons/SideBar/collapsedBtn.vue'
import RenameDialog from '@/components/dialog/RenameDialog.vue'
import AccountSettingsDialog from '@/components/dialog/AccountSettingsDialog.vue'
import {
  getAuthToken,
  getLocalConvs,
  removeAuthToken,
  removeTokenStatus,
  setLocalConvs,
  setConversationShares,
  setCurConvIndex,
  setRnConvIndex,
  setRnDialogVisible,
  getConvStatus,
  getConversationShare,
  removeConversationShare,
  upsertConversationShare,
} from '@/utils/functions'
import { showMessage } from '@/utils/message'
import {
  cancelConversationShare as cancelConversationShareRequest,
  createConversationShare,
} from '@/api/share'
import { useFloatingMenu } from '@/composables/useFloatingMenu'
import { useFloatingTooltip } from '@/composables/useFloatingTooltip'
import { useConfirm } from 'primevue/useconfirm'

defineOptions({ name: 'SideBar' })

const emit = defineEmits([
  'toggle-collapse',
  'create-new-conversation',
  'select-conversation',
  'delete-conversation',
])

const router = useRouter()
const store = useStore()
const confirm = useConfirm()

const accountSettingsVisible = ref(false)
const userProfile = ref(getAuthToken())
const actionFloatingMenu = useFloatingMenu()
const settingFloatingMenu = useFloatingMenu()
const activeMenu = actionFloatingMenu.activeKey
const settingMenu = settingFloatingMenu.isOpen
const actionMenuRef = actionFloatingMenu.floatingRef
const settingMenuRef = settingFloatingMenu.floatingRef
const actionMenuStyle = actionFloatingMenu.floatingStyle
const settingMenuStyle = settingFloatingMenu.floatingStyle
const { tooltip, tooltipStyle, showTooltip, hideTooltip } = useFloatingTooltip()

const isSidebarCollapsed = computed(() => store.state.sidebarCollapsed)
const curConvIndex = computed(() => store.state.curConvIndex)
const getUsername = computed(() => {
  const authToken = userProfile.value
  return authToken?.userData?.nickname || authToken?.username || ''
})
const updateConversations = computed(() => getLocalConvs())

function toggleCollapse() {
  emit('toggle-collapse')
}

function selectConversation(index) {
  emit('select-conversation', index)
}

function toggleActionMenu(index, event) {
  if (activeMenu.value === index) {
    closeActionMenu()
    return
  }

  hideTooltip()
  closeSettingMenu()
  actionFloatingMenu.open(index, event, {
    preferred: 'auto',
    align: 'left',
  })
}

function toggleSettingMenu(event) {
  if (settingMenu.value) {
    closeSettingMenu()
    return
  }

  hideTooltip()
  closeActionMenu()
  settingFloatingMenu.open(true, event, {
    preferred: 'above',
    align: 'left',
  })
}

function closeActionMenu() {
  actionFloatingMenu.close()
}

function closeSettingMenu() {
  settingFloatingMenu.close()
}

function openAccountSettings() {
  closeSettingMenu()
  accountSettingsVisible.value = true
}

function handleProfileUpdated() {
  userProfile.value = getAuthToken()
}

function handleConversationsCleared() {
  userProfile.value = getAuthToken()
}

function showRnDialog(index) {
  setRnConvIndex(index)
  setRnDialogVisible(true)
}

function generateShareId() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(18)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
}

function isConversationShared(index) {
  return Boolean(getConversationShare(getLocalConvs()[index]))
}

function getSharedUrl(shareId) {
  const sharedRoute = router.resolve({
    name: 'SharedConversation',
    params: { id: shareId },
  })
  return `${window.location.origin}${sharedRoute.href}`
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function shareConversation(index) {
  const conversation = getLocalConvs()[index]
  if (!conversation?.conversationId) {
    showMessage('分享链接生成失败。', 'error', 2)
    return
  }

  const previousShare = getConversationShare(conversation)
  const shareId = previousShare?.shareId || generateShareId()
  const sharedUrl = getSharedUrl(shareId)
  if (!sharedUrl) return

  confirm.require({
    message: `是否将这个对话进行分享？\n这意味着该对话将允许被公开访问。\n访问链接将在确认后自动复制。`,
    header: '确认分享对话',
    icon: 'pi pi-share-alt',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '确认分享',
      severity: 'success',
    },
    accept: async () => {
      let share = previousShare

      if (!share) {
        share = await createConversationShare(conversation, shareId)
        if (!share) return

        upsertConversationShare(share)
      }

      try {
        await copyText(getSharedUrl(share.shareId))
        showMessage('对话分享成功！', 'success', 2)
        showMessage('分享链接已复制。', 'success', 2)
        closeActionMenu()
      } catch (error) {
        console.error('复制分享链接失败:', error)
        showMessage('对话分享成功！', 'success', 2)
        showMessage('分享链接复制失败，请稍后重试。', 'error', 2)
      }
    },
    reject: () => {
      showMessage('已取消分享。', 'info', 2)
    },
  })
}

function cancelShareConversation(index) {
  const conversation = getLocalConvs()[index]
  const share = getConversationShare(conversation)

  if (!share) {
    closeActionMenu()
    return
  }

  confirm.require({
    message: '是否取消分享这个对话？\n这意味着该对话将不再允许被公开访问。',
    header: '确认取消分享',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '取消分享',
      severity: 'danger',
    },
    accept: async () => {
      const cancelled = await cancelConversationShareRequest(conversation)
      if (!cancelled) return

      removeConversationShare(conversation.conversationId)

      showMessage('对话取消分享成功！', 'success', 2)
      closeActionMenu()
    },
    reject: () => {
      showMessage('取消分享未执行。', 'info', 2)
    },
  })
}

function deleteConversation(index) {
  confirm.require({
    message: '确认要删除这个对话吗？该操作无法撤回！\n这个对话的分享链接也将自动失效。',
    header: '确认删除对话',
    icon: 'pi pi-info-circle',
    acceptProps: {
      label: '确认删除',
      severity: 'danger',
    },
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    accept: () => {
      emit('delete-conversation', index)
    },
    reject: () => {
      showMessage('已取消删除。', 'info', 2)
    },
  })
}

function logout() {
  confirm.require({
    message: '确定要退出登录吗？',
    header: '确认登出',
    icon: 'pi pi-info-circle',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '确认登出',
      severity: 'danger',
    },
    accept: () => {
      removeAuthToken()
      removeTokenStatus()
      setLocalConvs([])
      setConversationShares([])
      setCurConvIndex(-1)

      showMessage('登出成功！已为你返回登录页面。', 'success', 2)
      router.push('/login')
    },
    reject: () => {},
  })
}
</script>

<style scoped>
* {
  font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  margin-left: auto;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    color var(--duration-base) ease,
    background var(--duration-base) ease,
    box-shadow var(--duration-base) ease,
    transform var(--duration-base) ease;
}

.collapse-btn:hover {
  color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
  transform: translateY(-1px);
}

.conversation-list {
  display: flex;
  position: absolute;
  left: 0;
  width: 260px;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.96) 100%), #f8fafc;
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  flex-direction: column;
  z-index: 20;
  box-shadow: 12px 0 28px rgba(15, 23, 42, 0.04);
  overflow: visible;
  transition: transform 0.28s cubic-bezier(0.38, 0, 0.24, 1);
}

.conversation-list.collapsed {
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.28s cubic-bezier(0.38, 0, 0.24, 1);
}

.conversation-header {
  position: relative;
  padding: 18px 14px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.76);
}

.brand-row {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 4px 2px;
  gap: 12px;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 14px;
  background: var(--color-surface);
  border: 1px solid rgba(219, 234, 254, 0.9);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.13);
}

.brand-mark img {
  width: 34px;
  height: 34px;
  display: block;
  object-fit: contain;
}

.brand-copy {
  min-width: 0;
  flex: 1;
}

.brand-copy h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 26px;
  line-height: 1.1;
  font-weight: 800;
}

.brand-copy span {
  display: block;
  margin-top: 5px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.1;
  letter-spacing: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  margin-top: 18px;
  color: white;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 32%),
    linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  font-size: 15px;
  font-weight: 650;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  gap: 9px;
  box-shadow:
    0 12px 24px rgba(37, 99, 235, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.new-chat-icon {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
}

.new-chat-icon :deep(svg) {
  width: 21px;
  height: 21px;
}

.new-chat-btn:hover {
  filter: saturate(1.08);
  box-shadow:
    0 16px 30px rgba(37, 99, 235, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  transform: translateY(-1px);
}

.new-chat-btn:active {
  transform: translateY(0);
  box-shadow:
    0 8px 18px rgba(37, 99, 235, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.conversation-items {
  flex: 1;
  height: 75%;
  overflow-y: auto;
  overflow-x: visible;
  padding: 12px 8px 12px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.conversation-items::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.conversation-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 130px;
  margin: 8px 6px;
  color: var(--color-text-subtle);
  gap: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.48);
}

.conversation-empty i {
  color: var(--color-accent);
  font-size: 22px;
}

.conversation-empty span {
  font-size: 13px;
}

.conversation-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  margin: 8px 0;
  padding: 10px 7px 10px 12px;
  color: var(--color-text-secondary);
  font-size: 14px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.48);
  cursor: pointer;
  z-index: 1;
  transition:
    background var(--duration-base) ease,
    border-color var(--duration-base) ease,
    box-shadow var(--duration-base) ease,
    transform var(--duration-base) ease;
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(148, 163, 184, 0.34);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
  z-index: 2;
}

.conversation-item.active {
  color: var(--color-text-primary);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.82));
  border-color: rgba(37, 99, 235, 0.16);
  box-shadow:
    inset 3px 0 0 var(--color-primary),
    0 10px 22px rgba(37, 99, 235, 0.08);
}

.conversation-item.menu-open {
  z-index: 30;
}

.conversation-item.menu-open:hover {
  z-index: 30;
}

.conversation-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.conversation-title {
  overflow: hidden;
  color: inherit;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  color: var(--color-text-subtle);
  font-size: 12px;
  line-height: 1.2;
}

.conversation-actions {
  position: relative;
  display: flex;
  margin-left: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-subtle);
  opacity: 0;
  transition:
    opacity var(--duration-base) ease,
    color var(--duration-base) ease,
    background var(--duration-base) ease;
}

.conversation-item:hover .action-btn,
.conversation-item.active .action-btn,
.conversation-item.menu-open .action-btn {
  opacity: 1;
}

.action-btn:hover {
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.08);
}

.action-menu {
  position: fixed;
  min-width: 112px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-floating);
  z-index: 1000;
}

.action-menu button {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 9px;
  text-align: left;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--duration-base) ease;
}
.action-menu button:hover {
  background: var(--color-surface-hover);
}

.action-menu button i {
  width: 16px;
  padding-right: 0;
}

.action-menu button:last-child {
  color: var(--color-danger);
}

.action-menu button.is-danger {
  color: var(--color-danger);
}

.action-menu button:last-child:hover,
.action-menu button.is-danger:hover {
  background: var(--color-danger-soft);
}

:global(.p-confirm-dialog-message) {
  white-space: pre-line;
}

/* 新增用户信息区域样式 */
.user-info {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-top: auto;
  border-top: 1px solid rgba(226, 232, 240, 0.76);
  background: rgba(255, 255, 255, 0.62);
}

.user-profile {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.user-avatar {
  flex: 0 0 38px;
}

.user-avatar img {
  display: block;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-surface);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.user-copy {
  min-width: 0;
}

.user-name {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.2;
}

.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    color var(--duration-base) ease,
    background var(--duration-base) ease;
}

.settings-icon :deep(.el-icon) {
  transition: transform var(--duration-base) ease;
}

.settings-icon:hover {
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.08);
}

.settings-icon:hover :deep(.el-icon) {
  transform: rotate(18deg);
}

.setting-menu {
  position: fixed;
  min-width: 128px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-floating);
  z-index: 1000;
}
.setting-menu button {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 10px;
  border-radius: 9px;
  text-align: left;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--duration-base) ease;
}
.setting-menu button:hover {
  background: var(--color-surface-hover);
}

.setting-menu button i {
  padding-right: 10px;
}

.setting-menu button:last-child {
  color: var(--color-danger);
}

.setting-menu button:last-child:hover {
  background: var(--color-danger-soft);
}
</style>
