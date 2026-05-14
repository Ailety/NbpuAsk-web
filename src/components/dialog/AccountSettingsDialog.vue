<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :focus-on-show="false"
    :show-header="false"
    :style="{ width: '50rem' }"
    class="account-settings-dialog"
    @update:visible="closeDialog"
  >
    <div class="account-settings">
      <div class="settings-header">
        <button v-if="isShareManager" class="icon-button" @click="backToSettings">
          <i class="pi pi-angle-left"></i>
        </button>
        <h2>{{ isShareManager ? '我分享的链接' : '账号设置' }}</h2>
        <button class="icon-button close-button" @click="closeDialog(false)">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div v-if="!isShareManager" class="settings-body">
        <nav class="settings-nav">
          <button
            class="settings-nav-item"
            :class="{ active: activeSection === 'account' }"
            @click="activeSection = 'account'"
          >
            <i class="pi pi-user"></i>
            <span>账号管理</span>
          </button>
          <button
            class="settings-nav-item"
            :class="{ active: activeSection === 'data' }"
            @click="activeSection = 'data'"
          >
            <i class="pi pi-database"></i>
            <span>数据管理</span>
          </button>
        </nav>

        <section v-if="activeSection === 'account'" class="settings-panel">
          <div class="profile-row">
            <div>
              <div class="profile-label">用户名</div>
              <div class="profile-value">{{ authToken.username || '-' }}</div>
            </div>
          </div>

          <div class="profile-row">
            <div>
              <div class="profile-label">昵称</div>
              <div v-if="editingField !== 'nickname'" class="profile-value">
                {{ draftUserData.nickname || authToken.username || '-' }}
              </div>
              <div v-else class="profile-edit-control">
                <input
                  v-model="nicknameDraft"
                  class="profile-input"
                  maxlength="16"
                  @keydown.enter="saveNickname"
                  @keydown.esc="cancelEdit"
                />
                <div class="profile-edit-actions">
                  <button class="link-button" @click="saveNickname">保存</button>
                  <button class="link-button muted" @click="cancelEdit">取消</button>
                </div>
              </div>
            </div>
            <div v-if="editingField !== 'nickname'" class="profile-actions">
              <button class="link-button" @click="startNicknameEdit">修改</button>
            </div>
          </div>

          <div class="profile-row align-start">
            <div>
              <div class="profile-label">简介</div>
              <div v-if="editingField !== 'intro'" class="profile-value profile-intro">
                {{ introText }}
              </div>
              <div v-else class="profile-edit-control textarea-control">
                <textarea
                  v-model="introDraft"
                  class="profile-textarea"
                  maxlength="80"
                  rows="3"
                  @keydown.esc="cancelEdit"
                ></textarea>
                <div class="profile-edit-actions">
                  <button class="link-button" @click="saveIntro">保存</button>
                  <button class="link-button muted" @click="cancelEdit">取消</button>
                </div>
              </div>
            </div>
            <div v-if="editingField !== 'intro'" class="profile-actions">
              <button v-if="editingField !== 'intro'" class="link-button" @click="startIntroEdit">
                修改
              </button>
            </div>
          </div>

          <div class="profile-row">
            <div>
              <div class="profile-label">注册日期</div>
              <div class="profile-value">{{ registrationDateText }}</div>
            </div>
          </div>
        </section>

        <section v-else class="settings-panel">
          <div class="data-row">
            <div>
              <div class="data-title">我分享的链接</div>
              <div class="data-desc">查看、复制或取消已经公开分享的对话链接。</div>
            </div>
            <button class="pill-button" @click="openShareManager">管理</button>
          </div>
          <div class="data-row danger-row">
            <div>
              <div class="data-title">删除所有对话</div>
              <div class="data-desc">清空当前账号下的全部历史对话，该操作无法撤回。</div>
            </div>
            <button class="pill-button danger" @click="confirmDeleteAllConversations">删除</button>
          </div>
        </section>
      </div>

      <section v-else class="shared-links-panel">
        <div v-if="sharedConversations.length === 0" class="shared-empty">
          <div class="shared-empty-icon">
            <i class="pi pi-link"></i>
          </div>
          <div>目前没有任何对话被分享</div>
        </div>
        <div v-else class="shared-link-list">
          <div
            v-for="conversation in sharedConversations"
            :key="conversation.conversationId"
            class="shared-link-item"
          >
            <div class="shared-link-copy">
              <div class="shared-link-title">对话ID: {{ conversation.conversationId }}</div>
              <div class="shared-link-subtitle">分享于 {{ getShareDate(conversation) }}</div>
            </div>
            <div class="shared-link-actions">
              <button
                class="icon-action custom-tooltip"
                @mouseenter="showTooltip($event, '复制链接')"
                @mouseleave="hideTooltip"
                @click="copySharedLink(conversation)"
              >
                <i class="pi pi-copy"></i>
              </button>
              <button
                class="icon-action danger custom-tooltip"
                @mouseenter="showTooltip($event, '删除分享')"
                @mouseleave="hideTooltip"
                @click="removeSharedLink(conversation)"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div class="floating-tooltip" v-if="tooltip.visible" :style="tooltipStyle">
      {{ tooltip.text }}
    </div>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Dialog from 'primevue/dialog'
import {
  formatDate,
  getAuthToken,
  getConversationShare,
  getLocalConvs,
  removeConversationShare,
  setAuthToken,
  setCurConvIndex,
  setLocalConvs,
} from '@/utils/functions'
import { cancelConversationShare } from '@/api/share'
import { deleteAllConversations } from '@/api/conversation'
import { getUserData, updateUserData } from '@/api/user'
import { showMessage } from '@/utils/message'
import { useFloatingTooltip } from '@/composables/useFloatingTooltip'

defineOptions({ name: 'AccountSettingsDialog' })

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'profile-updated', 'conversations-cleared'])

const router = useRouter()
const confirm = useConfirm()
const activeSection = ref('account')
const viewMode = ref('settings')
const editingField = ref(null)
const authToken = ref(getAuthToken() || {})
const draftUserData = ref(
  createNormalizedUserData(authToken.value.userData, authToken.value.username),
)
const nicknameDraft = ref('')
const introDraft = ref('')
const DEFAULT_INTRO_TEXT = '该用户暂无简介。'
const { tooltip, tooltipStyle, showTooltip, hideTooltip } = useFloatingTooltip()

const isShareManager = computed(() => viewMode.value === 'shares')
const introText = computed(() => draftUserData.value.settings?.text || DEFAULT_INTRO_TEXT)
const registrationDateText = computed(() => normalizeDateText(draftUserData.value.registrationDate))
const sharedConversations = computed(() =>
  getLocalConvs().filter((conversation) => Boolean(getConversationShare(conversation))),
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      refreshUserData()
      activeSection.value = 'account'
      viewMode.value = 'settings'
      editingField.value = null
    }
  },
)

function closeDialog(visible) {
  emit('update:visible', Boolean(visible))
}

function backToSettings() {
  viewMode.value = 'settings'
  activeSection.value = 'data'
}

function openShareManager() {
  viewMode.value = 'shares'
}

function refreshUserData() {
  authToken.value = getAuthToken() || {}
  draftUserData.value = createNormalizedUserData(authToken.value.userData, authToken.value.username)
  if (!authToken.value.userData) {
    getUserData().then((userData) => {
      if (!userData) return
      authToken.value = getAuthToken() || {}
      draftUserData.value = createNormalizedUserData(userData, authToken.value.username)
      emit('profile-updated')
    })
  }
}

function createNormalizedUserData(userData = {}, username = '') {
  return {
    ...userData,
    nickname: userData?.nickname || username || '',
    registrationDate: userData?.registrationDate || '',
    settings: {
      ...(userData?.settings || {}),
      text: userData?.settings?.text || DEFAULT_INTRO_TEXT,
    },
  }
}

function normalizeDateText(dateText) {
  if (!dateText) return '-'
  const parts = String(dateText).split(/[/-]/)
  if (parts.length >= 3) {
    const year = parts[0]
    const month = String(Number(parts[1])).padStart(2, '0')
    const day = String(Number(parts[2])).padStart(2, '0')
    if (year && month !== 'NaN' && day !== 'NaN') {
      return `${year}-${month}-${day}`
    }
  }

  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return String(dateText).replace(/\//g, '-')

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function persistUserData(nextUserData, successMessage) {
  const normalizedData = createNormalizedUserData(nextUserData, authToken.value.username)
  const saved = await updateUserData(normalizedData)
  if (!saved) return false

  const nextAuthToken = {
    ...getAuthToken(),
    userData: normalizedData,
  }
  setAuthToken(nextAuthToken)
  authToken.value = nextAuthToken
  draftUserData.value = normalizedData
  editingField.value = null
  emit('profile-updated')
  showMessage(successMessage, 'success', 2)
  return true
}

function startNicknameEdit() {
  nicknameDraft.value = draftUserData.value.nickname || authToken.value.username || ''
  editingField.value = 'nickname'
}

async function saveNickname() {
  const nextNickname = nicknameDraft.value.trim()
  if (!nextNickname) {
    showMessage('昵称不能为空。', 'error', 2)
    return
  }

  await persistUserData(
    {
      ...draftUserData.value,
      nickname: nextNickname,
    },
    '昵称修改成功！',
  )
}

function startIntroEdit() {
  introDraft.value = introText.value === DEFAULT_INTRO_TEXT ? '' : introText.value
  editingField.value = 'intro'
}

async function saveIntro() {
  const nextIntro = introDraft.value.trim() || DEFAULT_INTRO_TEXT
  await persistUserData(
    {
      ...draftUserData.value,
      settings: {
        ...(draftUserData.value.settings || {}),
        text: nextIntro,
      },
    },
    '简介修改成功！',
  )
}

function cancelEdit() {
  editingField.value = null
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

async function copySharedLink(conversation) {
  const share = getConversationShare(conversation)
  if (!share) return

  try {
    await copyText(getSharedUrl(share.shareId))
    showMessage('分享链接已复制。', 'success', 2)
  } catch (error) {
    console.error('复制分享链接失败:', error)
    showMessage('分享链接复制失败，请稍后重试。', 'error', 2)
  }
}

function getShareDate(conversation) {
  const share = getConversationShare(conversation)
  return formatDate(share?.shareCreatedTime) || '-'
}

async function removeSharedLink(conversation) {
  const conversations = getLocalConvs()
  const index = conversations.findIndex(
    (item) => item.conversationId === conversation.conversationId,
  )
  if (index === -1) return
  const removed = await cancelConversationShare(conversations[index])
  if (!removed) return

  removeConversationShare(conversation.conversationId)

  showMessage('分享链接已删除。', 'success', 2)
}

function confirmDeleteAllConversations() {
  confirm.require({
    message: '删除后，所有对话都将被清空且无法找回！\n由对话生成的分享链接也都将失效。',
    header: '确认删除所有对话',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '确认删除',
      severity: 'danger',
    },
    accept: async () => {
      const deleted = await deleteAllConversations()
      if (!deleted) return

      setLocalConvs([])
      setCurConvIndex(-1)
      emit('conversations-cleared')
      showMessage('所有对话已删除。', 'success', 2)
      router.push('/chat')
      closeDialog(false)
    },
  })
}
</script>

<style scoped>
.account-settings {
  min-height: 430px;
  color: var(--color-text-primary);
}

:global(.account-settings-dialog) {
  border-radius: var(--radius-xl);
}

:global(.account-settings-dialog .p-dialog-content) {
  padding: 28px 30px 32px;
  border-radius: var(--radius-xl);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  margin-bottom: 24px;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 760;
  line-height: 1.25;
}

.close-button {
  margin-left: auto;
}

.icon-button,
.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color var(--duration-fast) ease,
    background var(--duration-fast) ease;
}

.icon-button:hover,
.icon-action:hover {
  color: var(--color-primary);
  background: var(--color-surface-hover);
}

.settings-body {
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 38px;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 13px;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition:
    color var(--duration-fast) ease,
    background var(--duration-fast) ease;
}

.settings-nav-item:hover,
.settings-nav-item.active {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.settings-panel {
  min-width: 0;
}

.profile-row,
.data-row {
  display: grid;
  align-items: center;
  grid-template-columns: 1fr auto;
  gap: 20px;
  min-height: 66px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}

.profile-row > div:first-child {
  display: grid;
  align-items: center;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
}

.profile-row:has(.profile-edit-control) {
  grid-template-columns: 1fr;
  gap: 0;
}

.profile-row:has(.profile-edit-control) > div:first-child {
  grid-template-columns: 132px minmax(0, 1fr);
}

.profile-row:first-child,
.data-row:first-child {
  padding-top: 2px;
}

.profile-row:last-child,
.data-row:last-child {
  border-bottom: none;
}

.profile-row.align-start {
  align-items: center;
}

.profile-row.align-start > div:first-child {
  align-items: start;
}

.profile-label,
.data-desc,
.shared-link-subtitle {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.profile-value,
.data-title,
.shared-link-title {
  margin-top: 0;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 560;
  line-height: 1.45;
}

.profile-intro {
  max-width: 420px;
}

.profile-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.profile-edit-control {
  display: flex;
  align-items: center;
  width: min(410px, 100%);
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  transition:
    border-color var(--duration-fast) ease,
    box-shadow var(--duration-fast) ease;
}

.profile-edit-control:focus-within {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}

.profile-edit-control.textarea-control {
  align-items: flex-start;
}

.profile-edit-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 0 13px 0 12px;
}

.textarea-control .profile-edit-actions {
  padding-top: 10px;
}

.link-button {
  padding: 0;
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.link-button:hover {
  color: var(--color-primary-hover);
}

.link-button.muted {
  color: var(--color-text-muted);
}

.profile-input,
.profile-textarea {
  width: 100%;
  min-width: 0;
  padding: 9px 0 9px 12px;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  font-size: 14px;
  outline: none;
}

.profile-textarea {
  resize: none;
}

.profile-input:focus,
.profile-textarea:focus {
  box-shadow: none;
}

.data-title {
  margin-top: 0;
  font-weight: 600;
}

.data-desc {
  max-width: 420px;
  margin-top: 6px;
}

.pill-button {
  min-width: 76px;
  padding: 10px 18px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 14px;
  transition:
    color var(--duration-fast) ease,
    background var(--duration-fast) ease,
    border-color var(--duration-fast) ease;
}

.pill-button:hover {
  color: var(--color-primary);
  background: var(--color-surface-soft);
  border-color: var(--color-border-strong);
}

.pill-button.danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.pill-button.danger:hover {
  background: var(--color-danger-soft);
}

.shared-links-panel {
  min-height: 330px;
}

.shared-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 280px;
  color: var(--color-text-muted);
  font-size: 17px;
  font-weight: 560;
}

.shared-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  color: var(--color-primary);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.78));
  border: 1px solid rgba(147, 197, 253, 0.42);
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.1);
}

.shared-empty-icon i {
  font-size: 22px;
}

.shared-link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shared-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--color-border);
}

.shared-link-copy {
  min-width: 0;
}

.shared-link-title {
  overflow: hidden;
  margin-top: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-link-subtitle {
  margin-top: 4px;
}

.shared-link-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.icon-action.danger {
  color: var(--color-danger);
}

.icon-action.danger:hover {
  background: var(--color-danger-soft);
}

.custom-tooltip {
  position: relative;
}

@media (max-width: 720px) {
  .settings-body {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .settings-nav {
    flex-direction: row;
  }

  .settings-nav-item {
    justify-content: center;
  }
}
</style>
