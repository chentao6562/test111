import { useEmployeeStore } from '@/stores/employee'

const BASE_URL = 'http://39.104.58.26:3000/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

const request = <T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> => {
  return new Promise((resolve, reject) => {
    const employeeStore = useEmployeeStore()
    const token = employeeStore.token

    const header: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.header,
    }

    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }

    uni.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res: any) => {
        const data = res.data as ApiResponse<T>
        if (data.code === 0 || data.code === 200) {
          resolve(data)
        } else if (data.code === 401) {
          employeeStore.clearEmployee()
          uni.redirectTo({ url: '/pages/login/index' })
          reject(new Error(data.message || '请先登录'))
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(new Error(data.message))
        }
      },
      fail: (err) => {
        console.error('请求失败:', err)
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

export const get = <T = any>(url: string, params?: Record<string, any>) => {
  let queryUrl = url
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    if (query) queryUrl += `?${query}`
  }
  return request<T>(queryUrl, { method: 'GET' })
}

export const post = <T = any>(url: string, data?: Record<string, any>) => {
  return request<T>(url, { method: 'POST', data })
}

export const put = <T = any>(url: string, data?: Record<string, any>) => {
  return request<T>(url, { method: 'PUT', data })
}

export const del = <T = any>(url: string) => {
  return request<T>(url, { method: 'DELETE' })
}

export default request
