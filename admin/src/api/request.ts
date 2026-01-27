import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { MessagePlugin } from 'tdesign-vue-next'
import router from '@/router'

// API响应格式
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp?: string
}

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 处理登录过期
function handleUnauthorized() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  // 使用 router.push 代替 window.location.href，避免页面完全刷新导致状态丢失
  const currentPath = router.currentRoute.value.fullPath
  if (currentPath !== '/login') {
    router.push({ path: '/login', query: { redirect: currentPath } })
  }
}

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 业务错误处理
    if (data.code !== 0) {
      MessagePlugin.error(data.message || '请求失败')

      // Token失效，跳转登录
      if (data.code === 401) {
        handleUnauthorized()
      }

      return Promise.reject(new Error(data.message))
    }

    return data
  },
  (error) => {
    // 网络错误处理
    if (error.response) {
      const status = error.response.status
      const responseData = error.response.data

      // 优先使用后端返回的错误消息
      let errorMessage = responseData?.message

      // 如果没有具体消息，使用默认消息
      if (!errorMessage) {
        const defaultMessages: Record<number, string> = {
          400: '请求参数错误',
          401: '登录已过期，请重新登录',
          403: '没有权限访问',
          404: '请求的资源不存在',
          500: '服务器内部错误',
        }
        errorMessage = defaultMessages[status] || `请求失败 (${status})`
      }

      MessagePlugin.error(errorMessage)

      if (status === 401) {
        handleUnauthorized()
      }
    } else if (error.request) {
      MessagePlugin.error('网络连接失败，请检查网络')
    } else {
      MessagePlugin.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

// 封装请求方法
export const request = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.put(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.delete(url, config)
  },
}

export default request
