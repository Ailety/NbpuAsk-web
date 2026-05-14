import { axios, getApiUrl, getAuthConfig, getRequiredAuthToken, handleError } from './http'
import { setAuthToken } from '@/utils/functions'
import { showMessage } from '@/utils/message'

export async function updateUserData(userData) {
  try {
    const authToken = getRequiredAuthToken()
    const response = await axios.post(
      getApiUrl('/user/set-data'),
      {
        userData,
      },
      getAuthConfig(),
    )

    if (response.data.success) {
      setAuthToken({
        ...authToken,
        userData: response.data.data || userData,
      })
      return true
    }

    showMessage('更新账号资料失败！', 'error')
    return false
  } catch (error) {
    handleError(error)
    return false
  }
}

export async function getUserData() {
  try {
    const authToken = getRequiredAuthToken()
    const response = await axios.post(getApiUrl('/user/get-data'), null, getAuthConfig())

    if (response.data.success) {
      setAuthToken({
        ...authToken,
        userData: response.data.data,
      })
      return response.data.data
    }

    return null
  } catch (error) {
    handleError(error)
    return null
  }
}
