import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface StaffInfo {
  id: string
  username: string
  name: string
  role: string
  staffNo?: string     // 工号
  employeeNo?: string  // 员工编号（备用字段）
  phone?: string       // 手机号
}

const TOKEN_KEY = 'warehouse_token'
const STAFF_KEY = 'warehouse_staff'

// 【2026-01-22】检查JWT token是否过期（与h5-agent保持一致）
const isTokenExpired = (tokenStr: string | null): boolean => {
  if (!tokenStr) return true
  try {
    // JWT格式: header.payload.signature
    const payload = tokenStr.split('.')[1]
    if (!payload) return true
    // base64解码payload
    const decoded = JSON.parse(atob(payload))
    // exp是Unix时间戳（秒），转换为毫秒比较
    const exp = decoded.exp * 1000
    // 提前5分钟视为过期，避免边界情况
    return Date.now() > (exp - 5 * 60 * 1000)
  } catch {
    // 解码失败，视为过期
    return true
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')

  // 【2026-01-22】初始化时检查token是否过期
  if (token.value && isTokenExpired(token.value)) {
    console.log('[门店端] Token已过期，清除登录状态')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STAFF_KEY)
    token.value = ''
  }

  const staffInfo = ref<StaffInfo | null>(null)

  // 设置Token
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  // 设置员工信息
  function setStaffInfo(info: StaffInfo) {
    staffInfo.value = info
    localStorage.setItem(STAFF_KEY, JSON.stringify(info))
  }

  // 登录
  function login(newToken: string, staff: StaffInfo) {
    setToken(newToken)
    setStaffInfo(staff)
  }

  // 退出登录
  function logout() {
    token.value = ''
    staffInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STAFF_KEY)
  }

  // 初始化（从localStorage恢复）
  function init() {
    const savedStaff = localStorage.getItem(STAFF_KEY)
    if (savedStaff) {
      try {
        staffInfo.value = JSON.parse(savedStaff)
      } catch (e) {
        console.error('解析员工信息失败', e)
        localStorage.removeItem(STAFF_KEY)
      }
    }
  }

  // 【2026-01-22修复】检查是否已登录 - 纯状态检查，不执行副作用
  // 清除登录状态由以下情况触发：401响应处理 或 手动调用 logout()
  const isLoggedIn = computed(() => {
    if (!token.value) return false
    // 只检查token是否过期，不自动清除（避免竞态条件）
    return !isTokenExpired(token.value)
  })

  return {
    token,
    staffInfo,
    setToken,
    setStaffInfo,
    login,
    logout,
    init,
    isLoggedIn
  }
})
