<template>
  <Dialog
    v-if="rnDialogVisible"
    v-model:visible="rnDialogVisible"
    modal
    :draggable="false"
    :focus-on-show="false"
    header="编辑对话名称"
    :style="{ width: '17rem' }"
  >
    <div class="input-container">
      <InputText
        id="newConvName"
        ref="renameInputRef"
        v-model="renameValue"
        class="flex-auto"
        size="large"
        @keydown.enter="confirmRename"
      />
    </div>
    <div class="button-group">
      <Button type="button" label="取消" severity="secondary" @click="cancelRename" />
      <Button type="button" label="确定" @click="confirmRename" />
    </div>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { getLocalConvs, getRnConvIndex } from '@/utils/functions'
import { renameConversation } from '@/api/conversation'
import { showMessage } from '@/utils/message'

defineOptions({ name: 'RenameDialog' })

const store = useStore()
const renameValue = ref('')
const renameInputRef = ref(null)

const rnDialogVisible = computed({
  get: () => store.state.rnDialogVisible,
  set: (visible) => {
    store.commit('setRnDialogVisible', visible)
  },
})

function getCurrentTitle() {
  return getLocalConvs()[getRnConvIndex()]?.conversationData?.title || ''
}

async function confirmRename() {
  const nextTitle = renameValue.value.trim()
  const currentTitle = getCurrentTitle()

  if (nextTitle === '') {
    showMessage('请输入对话名称！', 'error', 2)
    return
  }

  if (nextTitle === currentTitle) {
    showMessage('对话名称未改变！', 'info', 2)
    rnDialogVisible.value = false
    return
  }

  if (nextTitle.length > 10) {
    showMessage('对话名称不能超过10个字符！', 'error', 2)
    return
  }

  await renameConversation(getRnConvIndex(), nextTitle)
  rnDialogVisible.value = false
}

function cancelRename() {
  rnDialogVisible.value = false
  showMessage('已取消重命名。', 'info', 2)
}

watch(
  rnDialogVisible,
  (visible) => {
    if (visible) {
      renameValue.value = getCurrentTitle()
      nextTick(() => {
        const inputEl = renameInputRef.value?.$el || renameInputRef.value
        inputEl?.focus?.()
        inputEl?.select?.()
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.input-container {
  display: flex;
  align-items: center;
  justify-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.flex-input {
  flex: 1 1 auto;
  border: 1px solid #ccc;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
