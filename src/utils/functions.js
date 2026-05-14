import store from '@/store/store'

export function getServerUrl() {
  return store.state.serverUrl
}

export function getNowFormatDate(splitChar) {
  let date = new Date(),
    year = date.getFullYear(),
    month = date.getMonth() + 1,
    strDate = date.getDate()
  if (month < 10) month = `0${month}`
  if (strDate < 10) strDate = `0${strDate}`

  return `${year}${splitChar}${month}${splitChar}${strDate}`
}

export function formatDate(timestamp, splitChar = '-') {
  const date = new Date(Number(timestamp))
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${splitChar}${month}${splitChar}${day}`
}

export function getConvStatusByTimestamp(timestamp) {
  if (!timestamp) return ''

  const time = Number(timestamp)
  if (!Number.isFinite(time)) return ''

  const timediff = Math.max((Date.now() - time) / 1000, 0)

  if (timediff > 2592000) return `${(timediff / 2592000).toFixed()}月前`
  if (timediff > 604800) return `${(timediff / 604800).toFixed()}周前`
  if (timediff > 86400) return `${(timediff / 86400).toFixed()}天前`
  if (timediff > 3600) return `${(timediff / 3600).toFixed()}小时前`
  if (timediff > 60) return `${(timediff / 60).toFixed()}分钟前`
  return `${timediff.toFixed()}秒前`
}

export function getConvStatus(conversation) {
  return getConvStatusByTimestamp(conversation?.conversationData?.timestamp)
}

export function getConversationShare(conversation) {
  const conversationId = conversation?.conversationId
  if (!conversationId) return null

  return (
    store.state.conversationShares.find(
      (share) =>
        share?.conversationId === conversationId && share.shareId && share.shareAvailable !== false,
    ) || null
  )
}

export function getAuthToken() {
  const rawAuthToken = localStorage.getItem('authToken')
  if (!rawAuthToken) return null

  try {
    const authToken = JSON.parse(rawAuthToken)
    if (!authToken || typeof authToken !== 'object' || !authToken.token) {
      removeAuthToken()
      return null
    }

    return authToken
  } catch (error) {
    console.warn('authToken 解析失败，已清除本地登录状态:', error)
    removeAuthToken()
    return null
  }
}

export function setAuthToken(authToken) {
  if (!authToken) {
    removeAuthToken()
    return
  }

  localStorage.setItem('authToken', JSON.stringify(authToken))
}

export function removeAuthToken() {
  localStorage.removeItem('authToken')
}

export function getTokenStatus() {
  let tokenStatus = localStorage.getItem('tokenStatus')
  return tokenStatus
}

export function setTokenStatus(tokenStatus) {
  localStorage.setItem('tokenStatus', tokenStatus)
}

export function removeTokenStatus() {
  localStorage.removeItem('tokenStatus')
}

export function incrementAccessTime() {
  const authToken = getAuthToken()
  if (!authToken) return

  authToken.accessTime = Number(authToken.accessTime || 0) + 1
  setAuthToken(authToken)
}

export function toggleSidebar() {
  store.commit('toggleSidebar')
}

export function getCurConvIndex() {
  return store.state.curConvIndex
}

export function setCurConvIndex(index) {
  store.commit('setCurConvIndex', index)
}

export function getCurConvTitle() {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()
  return conversations[curConvIndex].conversationData.title
}

export function setConvTitle(index, title) {
  const conversations = getLocalConvs()
  conversations[index].conversationData.title = title
  setLocalConvs(conversations)
}

export function setCurConvTitle(title) {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()
  conversations[curConvIndex].conversationData.title = title
  setLocalConvs(conversations)
}

export function getCurConv() {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()
  return conversations[curConvIndex]
}

export function setCurConv(conversation) {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()
  conversations[curConvIndex] = conversation
  setLocalConvs(conversations)
}

export function getLocalConvs() {
  return store.state.conversations
}

export function setLocalConvs(conversations) {
  store.commit('setConversations', conversations)
}

export function getConversationShares() {
  return store.state.conversationShares
}

export function setConversationShares(conversationShares) {
  store.commit('setConversationShares', conversationShares || [])
}

export function upsertConversationShare(share) {
  if (!share?.conversationId || !share.shareId) return

  const conversationShares = [...getConversationShares()]
  const index = conversationShares.findIndex((item) => item.conversationId === share.conversationId)

  if (index === -1) {
    conversationShares.push(share)
  } else {
    conversationShares[index] = share
  }

  setConversationShares(conversationShares)
}

export function removeConversationShare(conversationId) {
  if (!conversationId) return

  setConversationShares(
    getConversationShares().filter((share) => share.conversationId !== conversationId),
  )
}

export function findLocalConvIndexById(conversationId) {
  if (!conversationId) return -1

  return getLocalConvs().findIndex((conversation) => conversation.conversationId === conversationId)
}

export function updateLocalConvById(conversation) {
  const index = findLocalConvIndexById(conversation?.conversationId)
  if (index === -1) return false

  const conversations = [...getLocalConvs()]
  conversations[index] = conversation
  setLocalConvs(conversations)
  return true
}

export function addLocalConv(conversation) {
  const conversations = getLocalConvs()
  conversations.push(conversation)
  setLocalConvs(conversations)
}

export function getRnDialogVisible() {
  return store.state.rnDialogVisible
}

export function setRnDialogVisible(visible) {
  store.commit('setRnDialogVisible', visible)
}

export function getRnConvIndex() {
  return store.state.rnConvIndex
}

export function setRnConvIndex(index) {
  store.commit('setRnConvIndex', index)
}
