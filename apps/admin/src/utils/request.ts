import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// API响应格式
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页响应格式
export interface PageResult<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://39.104.58.26:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data

    // code为0表示成功
    if (res.code === 0) {
      return res as any
    }

    // 处理错误
    if (res.code === 401) {
      // 未授权，跳转登录
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    console.error('响应错误:', error)

    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        window.location.href = '/login'
      } else if (status === 403) {
        ElMessage.error('没有权限访问')
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在')
      } else if (status >= 500) {
        ElMessage.error('服务器错误')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }

    return Promise.reject(error)
  }
)

// 封装GET请求
export function get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service.get(url, { params, ...config })
}

// 封装POST请求
export function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service.post(url, data, config)
}

// 封装PUT请求
export function put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service.put(url, data, config)
}

// 封装DELETE请求
export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service.delete(url, config)
}

export default service
