import axios from 'axios'
import { showMessage } from '@/utils/message'
import { getAuthToken, getServerUrl } from '@/utils/functions'

export function getApiUrl(path) {
  return `${getServerUrl()}${path}`
}

export function getRequiredAuthToken() {
  const authToken = getAuthToken()
  if (!authToken?.token) {
    throw new Error('登录状态已失效，请重新登录')
  }

  return authToken
}

export function getAuthHeaders() {
  const authToken = getRequiredAuthToken()
  return {
    Authorization: `Bearer ${authToken.token}`,
  }
}

export function getAuthConfig() {
  return {
    headers: getAuthHeaders(),
  }
}

export function handleError(error) {
  if (error.message === 'Request failed with status code 500') {
    showMessage('请求出错: 服务器处理异常！', 'error')
  } else if (error.message === 'Network Error') {
    showMessage('请求出错: 网络连接失败！', 'error')
  } else {
    showMessage(`请求出错: ${error.message}`, 'error')
  }
}

export { axios }
