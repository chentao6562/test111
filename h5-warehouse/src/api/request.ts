import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useUserStore } from '@/stores/user'
import { Toast } from 'tdesign-mobile-vue'
import router from '@/router'

// 创建Axios实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response

    // 业务成功 - 兼容两种格式：{ success: true } 或 { code: 200 }
    if (data.success === true || data.code === 200 || data.code === 0) {
      return data.data
    }

    // 业务失败
    const errorMsg = data.message || '操作失败'
    Toast({
      message: errorMsg,
      theme: 'error'
    })
    return Promise.reject(new Error(errorMsg))
  },
  (error) => {
    // HTTP错误
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          // 【2026-01-22修复】Token过期处理 - 防止循环跳转
          {
            const userStore = useUserStore()
            // 只有在登录状态下才处理
            if (userStore.isLoggedIn) {
              userStore.logout()
              Toast({
                message: '登录已过期，请重新登录',
                theme: 'error'
              })
              // 检查当前路径，避免在登录页循环跳转
              const currentPath = router.currentRoute.value.fullPath
              if (currentPath !== '/login') {
                router.push({
                  path: '/login',
                  query: { redirect: currentPath }
                })
              }
            }
          }
          break

        case 429:
          Toast({
            message: '操作过于频繁，请稍后再试',
            theme: 'warning'
          })
          break

        case 400:
        case 500:
          Toast({
            message: data?.message || '服务器错误',
            theme: 'error'
          })
          break

        default:
          Toast({
            message: '网络错误，请稍后再试',
            theme: 'error'
          })
      }
    } else if (error.request) {
      // 请求已发出但没收到响应
      Toast({
        message: '网络连接失败',
        theme: 'error'
      })
    } else {
      // 请求配置错误
      Toast({
        message: error.message || '请求失败',
        theme: 'error'
      })
    }

    return Promise.reject(error)
  }
)

// 封装请求方法
export const request = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config)
  }
}

export default instance
