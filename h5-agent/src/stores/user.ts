import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 用户信息接口（匹配后端返回的完整结构）
interface UserInfo {
  id: number
  name: string
  phone: string
  avatar: string | null
  type: 'LEVEL1' | 'LEVEL2' | 'LEVEL3' | 'WHOLESALE'
  status: string
  balance: string  // 后端返回字符串类型
  totalCommission: string
  commissionMethod: string
  inviteCode: string
  createdAt: string
  parent: {
    id: number
    name: string
    phone: string
  } | null
}

// 推销员信息（访客模式）
interface SalespersonInfo {
  id: number
  name: string
  phone: string      // 【2026-01-23】添加phone用于联系推销员
  avatar: string | null
  type: string
  typeLabel: string
}

// 本地存储键
const TOKEN_KEY = 'h5_agent_token'
const USER_KEY = 'h5_agent_user'
const SALESPERSON_KEY = 'h5_salesperson' // 访客模式下的推销员ID

// 【2026-01-22】检查JWT token是否过期（纯前端检查，避免发送无效请求）
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
  // 状态
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  // 【2026-01-22】初始化时检查token是否过期
  if (token.value && isTokenExpired(token.value)) {
    console.log('[UserStore] Token已过期，清除登录状态')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    token.value = null
  }

  // 安全地解析用户信息，如果解析失败则清空
  const getUserInfo = (): UserInfo | null => {
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr || userStr === 'undefined') {
        return null
      }
      return JSON.parse(userStr)
    } catch (error) {
      console.error('Failed to parse user info:', error)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
  }

  const userInfo = ref<UserInfo | null>(getUserInfo())

  // 如果 token 存在但 userInfo 为空，说明数据不完整，清除登录状态
  if (token.value && !userInfo.value) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    token.value = null
  }

  // 计算属性 - 必须同时有 token 和 userInfo 且token未过期才算已登录
  // 【2026-01-22修复】纯状态检查，不执行任何副作用
  // 清除登录状态由以下情况触发：401响应处理 或 手动调用 clearLogin()
  const isLoggedIn = computed(() => {
    if (!token.value || !userInfo.value) return false
    // 只检查token是否过期，不自动清除（避免竞态条件）
    return !isTokenExpired(token.value)
  })

  const userTypeLabel = computed(() => {
    const labels: Record<string, string> = {
      LEVEL1: '一级推销员',
      LEVEL2: '二级推销员',
      LEVEL3: '三级推销员',
      WHOLESALE: '' // 普通用户不显示标签
    }
    return userInfo.value?.type ? labels[userInfo.value.type] : ''
  })

  // 方法
  function setLogin(newToken: string, newUserInfo: UserInfo) {
    token.value = newToken
    userInfo.value = newUserInfo
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUserInfo))
  }

  function clearLogin() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function updateBalance(newBalance: string | number) {
    if (userInfo.value) {
      userInfo.value.balance = String(newBalance)
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo.value))
    }
  }

  // 刷新用户信息（从服务器获取最新数据）
  // 用于检测用户类型变更（如二级晋升一级后）
  async function refreshUserInfo(): Promise<boolean> {
    if (!token.value) return false

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      if (!response.ok) {
        // Token失效或其他错误
        if (response.status === 401) {
          clearLogin()
        }
        return false
      }

      const result = await response.json()
      if (result.code === 0 && result.data) {
        // 检查类型是否变化
        const oldType = userInfo.value?.type
        const newType = result.data.type

        // 更新用户信息
        userInfo.value = result.data
        localStorage.setItem(USER_KEY, JSON.stringify(result.data))

        // 如果类型变化了，返回true表示有变化
        if (oldType && newType && oldType !== newType) {
          console.log(`[用户类型变更] ${oldType} -> ${newType}`)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      return false
    }
  }

  // 更新用户信息（直接传入新数据）
  function updateUserInfo(newUserInfo: Partial<UserInfo>) {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...newUserInfo }
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo.value))
    }
  }

  // ============ 访客模式（推销员专属链接）============

  // 获取推销员信息
  const getSalespersonInfo = (): SalespersonInfo | null => {
    try {
      const str = localStorage.getItem(SALESPERSON_KEY)
      if (!str) return null
      return JSON.parse(str)
    } catch {
      return null
    }
  }

  const salespersonInfo = ref<SalespersonInfo | null>(getSalespersonInfo())

  // 是否是访客模式（有推销员ID但未登录）
  const isGuestMode = computed(() => !!salespersonInfo.value && !isLoggedIn.value)

  // 当前推销员ID（确定价格和业绩归属）
  // 【2026-01-19修复】优先级：扫码绑定 > 上级 > null
  const currentSalespersonId = computed(() => {
    // 1. 优先使用扫码绑定的推销员ID（无论是否登录）
    if (salespersonInfo.value?.id) {
      return salespersonInfo.value.id
    }

    if (isLoggedIn.value && userInfo.value) {
      // 2. 登录用户且是推销员，使用自己的ID
      if (['LEVEL1', 'LEVEL2'].includes(userInfo.value.type)) {
        return userInfo.value.id
      }
      // 3. 普通用户(WHOLESALE)：使用其上级（开发者）的ID
      if (userInfo.value.type === 'WHOLESALE' && userInfo.value.parent?.id) {
        return userInfo.value.parent.id
      }
    }
    return null
  })

  // 【2026-01-20新增】是否是推销员自己在浏览（非访客模式）
  // 条件：已登录 + 是推销员 + 没有扫码绑定其他推销员（或绑定的是自己/上级）
  // 用途：推销员自己浏览时显示拿货价，而非零售价
  const isSelfBrowsing = computed(() => {
    if (!isLoggedIn.value || !userInfo.value) return false

    // 必须是推销员类型
    if (!['LEVEL1', 'LEVEL2'].includes(userInfo.value.type)) return false

    // 没有扫码绑定其他推销员
    if (!salespersonInfo.value) return true

    // 绑定的是自己（推销员点击了自己的分享链接）
    if (salespersonInfo.value.id === userInfo.value.id) return true

    // 【2026-01-20新增】绑定的是自己的上级，也算自己浏览
    // 因为推销员不能向上级购买，应该看到自己的拿货价
    if (userInfo.value.parent && salespersonInfo.value.id === userInfo.value.parent.id) return true

    return false
  })

  // 设置推销员信息（访客模式）
  function setSalesperson(info: SalespersonInfo) {
    salespersonInfo.value = info
    localStorage.setItem(SALESPERSON_KEY, JSON.stringify(info))
  }

  // 清除推销员信息
  function clearSalesperson() {
    salespersonInfo.value = null
    localStorage.removeItem(SALESPERSON_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userTypeLabel,
    setLogin,
    clearLogin,
    updateBalance,
    refreshUserInfo,
    updateUserInfo,
    // 访客模式
    salespersonInfo,
    isGuestMode,
    currentSalespersonId,
    isSelfBrowsing,
    setSalesperson,
    clearSalesperson
  }
})
