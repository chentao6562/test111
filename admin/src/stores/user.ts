import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, LoginParams, LoginResponse, UserInfo } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string>(localStorage.getItem('admin_token') || '')

  /**
   * 安全解析 localStorage 中的用户信息
   * 【2026-01-22修复】增加必要字段验证
   */
  const parseUserInfo = (): UserInfo | null => {
    try {
      const stored = localStorage.getItem('admin_user')
      if (!stored || stored === 'undefined' || stored === 'null') {
        return null
      }
      const parsed = JSON.parse(stored)

      // 验证必要字段
      if (!parsed || typeof parsed !== 'object') {
        console.warn('[UserStore] Invalid user info format, clearing...')
        localStorage.removeItem('admin_user')
        return null
      }

      // 验证关键字段存在
      if (!parsed.id || !parsed.username) {
        console.warn('[UserStore] Missing required fields, clearing...')
        localStorage.removeItem('admin_user')
        return null
      }

      return parsed as UserInfo
    } catch (e) {
      console.error('[UserStore] Failed to parse user info:', e)
      // 清理损坏的数据
      localStorage.removeItem('admin_user')
      return null
    }
  }

  const userInfo = ref<UserInfo | null>(parseUserInfo())

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.name || userInfo.value?.username || '')
  const role = computed(() => userInfo.value?.role || '')

  // 登录
  async function login(params: LoginParams): Promise<LoginResponse> {
    const res = await loginApi(params)
    const { token: newToken, user } = res.data

    // 保存token
    token.value = newToken
    localStorage.setItem('admin_token', newToken)

    // 保存用户信息
    userInfo.value = user as UserInfo
    localStorage.setItem('admin_user', JSON.stringify(user))

    return res.data
  }

  // 退出登录
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  // 更新用户信息
  function setUserInfo(info: UserInfo) {
    userInfo.value = info
    localStorage.setItem('admin_user', JSON.stringify(info))
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    role,
    login,
    logout,
    setUserInfo,
  }
})
