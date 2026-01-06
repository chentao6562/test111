import { defineStore } from 'pinia'
import { ref } from 'vue'

interface EmployeeInfo {
  id: number
  name: string
  phone: string
  role: string
}

export const useEmployeeStore = defineStore('employee', () => {
  const token = ref<string>('')
  const employeeInfo = ref<EmployeeInfo | null>(null)

  // 初始化时从本地存储读取
  const initFromStorage = () => {
    try {
      const storedToken = uni.getStorageSync('employee_token')
      const storedInfo = uni.getStorageSync('employee_info')
      if (storedToken) {
        token.value = storedToken
      }
      if (storedInfo) {
        employeeInfo.value = JSON.parse(storedInfo)
      }
    } catch (e) {
      console.error('读取员工信息失败:', e)
    }
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    uni.setStorageSync('employee_token', newToken)
  }

  const setEmployeeInfo = (info: EmployeeInfo) => {
    employeeInfo.value = info
    uni.setStorageSync('employee_info', JSON.stringify(info))
  }

  const clearEmployee = () => {
    token.value = ''
    employeeInfo.value = null
    uni.removeStorageSync('employee_token')
    uni.removeStorageSync('employee_info')
  }

  const isLoggedIn = () => {
    return !!token.value
  }

  // 自动初始化
  initFromStorage()

  return {
    token,
    employeeInfo,
    setToken,
    setEmployeeInfo,
    clearEmployee,
    isLoggedIn,
    initFromStorage,
  }
})
