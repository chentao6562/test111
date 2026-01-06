import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getProfile } from '@/api/auth'
import type { LoginParams, LoginResult } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref<LoginResult['admin'] | null>(
    JSON.parse(localStorage.getItem('admin_info') || 'null')
  )

  // 登录
  async function login(params: LoginParams) {
    const res = await loginApi(params)
    if (res.code === 0) {
      token.value = res.data.token
      userInfo.value = res.data.admin
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_info', JSON.stringify(res.data.admin))
      return res
    } else {
      throw new Error(res.message || '登录失败')
    }
  }

  // 获取用户信息
  async function fetchUserInfo() {
    try {
      const res = await getProfile()
      if (res.code === 0) {
        userInfo.value = res.data
        localStorage.setItem('admin_info', JSON.stringify(res.data))
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  // 退出登录
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
  }

  return {
    token,
    userInfo,
    login,
    fetchUserInfo,
    logout
  }
})
