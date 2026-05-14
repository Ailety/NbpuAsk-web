import { axios, getApiUrl, getAuthConfig, handleError } from './http'
import { getConversationShares } from './share'
import {
  addLocalConv,
  getLocalConvs,
  removeConversationShare,
  setConversationShares,
  setCurConvIndex,
  setLocalConvs,
} from '@/utils/functions'
import { showMessage } from '@/utils/message'

function getConversationPayload(conversation) {
  return {
    conversationId: conversation.conversationId,
  }
}

function getConversationSavePayload(conversation) {
  return {
    conversationId: conversation.conversationId,
    conversationAvailable: conversation.conversationAvailable ?? true,
    conversationData: conversation.conversationData,
  }
}

export async function getConversations() {
  try {
    const [response] = await Promise.all([
      axios.post(getApiUrl('/conversation/get-all'), null, getAuthConfig()),
      getConversationShares(),
    ])

    if (response.data.success) {
      const conversations = response.data.data
      conversations.sort((a, b) => {
        return Number(b.conversationData.timestamp) - Number(a.conversationData.timestamp)
      })
      setLocalConvs(conversations)
      return conversations
    }

    showMessage('获取对话列表失败！', 'error')
    return []
  } catch (error) {
    handleError(error)
    return []
  }
}

export async function getConversation(conversation) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/get'),
      getConversationPayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      return response.data.data
    }

    showMessage('获取对话数据失败！', 'error')
    return null
  } catch (error) {
    handleError(error)
    return null
  }
}

export async function setConversation(conversation) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/set'),
      getConversationSavePayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      return true
    }

    showMessage('同步对话数据失败！', 'error')
    return false
  } catch (error) {
    handleError(error)
    return false
  }
}

export async function createConversation() {
  try {
    const response = await axios.post(getApiUrl('/conversation/create'), null, getAuthConfig())
    if (response.data.success) {
      const newConversation = response.data.data
      addLocalConv(newConversation)
      setCurConvIndex(getLocalConvs().length - 1)
      return newConversation
    }

    showMessage('创建对话失败！', 'error')
    return null
  } catch (error) {
    handleError(error)
    return null
  }
}

export async function renameConversation(index, newTitle) {
  try {
    const conversation = getLocalConvs()[index]
    conversation.conversationData.title = newTitle
    const response = await axios.post(
      getApiUrl('/conversation/set'),
      getConversationSavePayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      const conversations = getLocalConvs()
      conversations[index].conversationData.title = newTitle
      setLocalConvs(conversations)
      showMessage('重命名对话成功！', 'success')
    } else {
      showMessage('重命名对话失败！', 'error')
    }
  } catch (error) {
    handleError(error)
  }
}

export async function deleteConversation(index) {
  try {
    const conversation = getLocalConvs()[index]
    const response = await axios.post(
      getApiUrl('/conversation/delete'),
      getConversationPayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      const conversations = getLocalConvs()
      conversations.splice(index, 1)
      setLocalConvs(conversations)
      removeConversationShare(conversation.conversationId)
      setCurConvIndex(-1)
      showMessage('删除成功！', 'success')
    } else {
      showMessage('删除对话失败！', 'error')
    }
  } catch (error) {
    handleError(error)
  }
}

export async function deleteAllConversations() {
  try {
    const response = await axios.post(getApiUrl('/conversation/delete-all'), null, getAuthConfig())
    if (response.data.success) {
      setConversationShares([])
      setLocalConvs([])
      setCurConvIndex(-1)
      return true
    }

    showMessage('删除所有对话失败！', 'error')
    return false
  } catch (error) {
    handleError(error)
    return false
  }
}
