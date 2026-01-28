import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useUserStore } from '../stores/user'
import { Toast } from 'tdesign-mobile-vue'
import router from '../router'

// 检测Capacitor原生环境
const isCapacitor = typeof window !== 'undefined' &&
                    (window as any).Capacitor?.isNativePlatform?.();

// API基础URL - APK内置使用绝对地址，Web端使用相对路径
const BASE_URL = isCapacitor
  ? 'http://39.104.113.121/api'
  : (import.meta.env.VITE_API_URL || '/api');

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
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
      // 【2026-01-22】记录请求时的token，用于401响应时比对
      ;(config as any)._requestToken = userStore.token
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
    const data = response.data

    // 业务状态码处理
    if (data.code === 0) {
      return data
    }

    // Token失效（业务层401）
    if (data.code === 401) {
      const userStore = useUserStore()
      const requestToken = (response.config as any)?._requestToken

      // 【2026-01-22修复】防止登录后被旧请求的401清除状态
      if (userStore.token) {
        if (!requestToken) {
          console.log('[API] 业务401响应被忽略：请求在登录前发起')
          return Promise.reject(new Error('Token expired (ignored)'))
        }
        if (requestToken !== userStore.token) {
          console.log('[API] 业务401响应被忽略：token已更新')
          return Promise.reject(new Error('Token expired (ignored)'))
        }
      }

      userStore.clearLogin()
      userStore.clearSalesperson()
      Toast({
        message: '登录已过期，请重新登录',
        theme: 'error'
      })
      router.push('/login')
      return Promise.reject(new Error('Token expired'))
    }

    // 【2026-01-23】特殊错误码不自动显示Toast（由调用方处理）
    const silentCodes = [40001] // 40001 = 已有进行中的砍价
    if (!silentCodes.includes(data.code)) {
      Toast({
        message: data.message || '请求失败',
        theme: 'error'
      })
    }

    // 创建包含完整响应数据的错误对象
    const error = new Error(data.message) as Error & { response?: { data: any } }
    error.response = { data }
    return Promise.reject(error)
  },
  (error) => {
    // HTTP 401 错误 - Token失效或未登录
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      const requestToken = (error.config as any)?._requestToken

      // 【2026-01-22修复】防止登录后被旧请求的401清除状态
      // 情况1: 请求有token，但与当前token不同 → 用户已重新登录，忽略
      // 情况2: 请求没有token，但当前有token → 请求在登录前发起，忽略
      if (userStore.token) {
        if (!requestToken) {
          // 请求在登录前发起（没有token），现在用户已登录，忽略这个401
          console.log('[API] 401响应被忽略：请求在登录前发起，用户已登录')
          return Promise.reject(new Error('Token expired (ignored - request was unauthenticated)'))
        }
        if (requestToken !== userStore.token) {
          // 请求的token与当前token不同，说明用户已重新登录
          console.log('[API] 401响应被忽略：token已更新（用户已重新登录）')
          return Promise.reject(new Error('Token expired (ignored - new token exists)'))
        }
      }

      // 只有在用户已登录状态下才清除登录信息并提示
      // 未登录状态下的401是正常的（如访客访问需要认证的API）
      if (userStore.isLoggedIn) {
        userStore.clearLogin()
        userStore.clearSalesperson()
        Toast({
          message: '登录已过期，请重新登录',
          theme: 'error'
        })
        const currentPath = router.currentRoute.value.fullPath
        if (currentPath !== '/login') {
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        }
      }
      return Promise.reject(new Error('Token expired'))
    }

    // HTTP 429 错误 - 请求频率限制
    if (error.response?.status === 429) {
      const message = error.response?.data?.message || '操作太频繁，请稍后再试'
      Toast({
        message,
        theme: 'warning'
      })
      return Promise.reject(new Error(message))
    }

    // HTTP 400 错误 - 参数错误
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || '请求参数错误'
      Toast({
        message,
        theme: 'error'
      })
      return Promise.reject(new Error(message))
    }

    // 其他HTTP错误 - 读取后端返回的中文消息
    if (error.response?.data?.message) {
      Toast({
        message: error.response.data.message,
        theme: 'error'
      })
      return Promise.reject(new Error(error.response.data.message))
    }

    // 网络错误
    Toast({
      message: '网络连接失败，请检查网络',
      theme: 'error'
    })
    return Promise.reject(error)
  }
)

// 封装请求方法
export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) => {
  return instance.get<any, { code: number; message: string; data: T }>(url, { params, ...config })
}

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return instance.post<any, { code: number; message: string; data: T }>(url, data, config)
}

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return instance.put<any, { code: number; message: string; data: T }>(url, data, config)
}

export const del = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) => {
  return instance.delete<any, { code: number; message: string; data: T }>(url, { params, ...config })
}

// 图片URL处理
// 【2026-01-28修复】微信分享图片不显示 - 将硬编码IP替换为当前域名
const HARDCODED_IP = 'http://39.104.113.121'

export const getImageUrl = (url: string | undefined): string => {
  if (!url) return ''

  // 检测Capacitor原生环境
  const isNative = (window as any).Capacitor?.isNativePlatform?.()

  // 【2026-01-28修复】处理硬编码IP地址的URL
  // 微信内置浏览器从域名页面加载IP地址图片会被阻止
  if (url.startsWith(HARDCODED_IP)) {
    // 提取路径部分
    const path = url.replace(HARDCODED_IP, '')
    if (isNative) {
      return url // 原生APP保持IP地址
    }
    // 浏览器环境：使用当前域名
    return `${window.location.origin}${path}`
  }

  // 其他完整URL直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  if (url.startsWith('/images/')) {
    // APK环境下使用绝对地址
    if (isNative) {
      return `${HARDCODED_IP}${url}`
    }
    return url
  }

  // 使用当前域名或固定服务器地址
  const apiUrl = import.meta.env.VITE_API_URL || ''
  const baseUrl = isNative
    ? HARDCODED_IP
    : (apiUrl.replace('/api', '') || window.location.origin)
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * 解析图片字段（支持新旧格式）
 * @param imageField 图片字段（可能是字符串、对象或数组）
 * @returns 解析后的图片对象或字符串
 */
function parseImageField(imageField: any): any {
  if (!imageField) return null

  // 如果已经是对象格式（包含processed字段）
  if (typeof imageField === 'object' && !Array.isArray(imageField)) {
    return imageField
  }

  // 如果是字符串（旧格式）
  if (typeof imageField === 'string') {
    // 尝试解析JSON
    try {
      const parsed = JSON.parse(imageField)
      if (typeof parsed === 'object') {
        return parsed
      }
    } catch {
      // 不是JSON，直接返回字符串
    }
    return imageField
  }

  // 如果是数组，取第一个
  if (Array.isArray(imageField) && imageField.length > 0) {
    return parseImageField(imageField[0])
  }

  return imageField
}

/**
 * 获取WebP优化图片URL
 * @param imageField 图片字段（支持字符串、对象、数组）
 * @param size 尺寸（small/medium/large）
 * @returns WebP格式图片URL
 */
export const getOptimizedImageUrl = (
  imageField: any,
  size: 'small' | 'medium' | 'large' = 'medium'
): string => {
  const parsed = parseImageField(imageField)
  if (!parsed) return ''

  // 如果是新格式（包含processed字段）
  if (typeof parsed === 'object' && parsed.processed) {
    const sizeKey = `${size}Webp` as keyof typeof parsed.processed
    const webpUrl = parsed.processed[sizeKey]
    if (webpUrl) {
      return getImageUrl(webpUrl)
    }
    // 降级到JPEG
    const jpegKey = `${size}Jpeg` as keyof typeof parsed.processed
    const jpegUrl = parsed.processed[jpegKey]
    if (jpegUrl) {
      return getImageUrl(jpegUrl)
    }
    // 最后降级到原图
    return getImageUrl(parsed.processed.original || parsed.url)
  }

  // 旧格式，直接返回原图URL
  const urlStr = typeof parsed === 'string' ? parsed : parsed.url || ''
  return getImageUrl(urlStr)
}

/**
 * 获取JPEG降级图片URL
 * @param imageField 图片字段
 * @param size 尺寸
 * @returns JPEG格式图片URL
 */
export const getJpegFallbackUrl = (
  imageField: any,
  size: 'small' | 'medium' | 'large' = 'medium'
): string => {
  const parsed = parseImageField(imageField)
  if (!parsed) return ''

  // 如果是新格式
  if (typeof parsed === 'object' && parsed.processed) {
    const jpegKey = `${size}Jpeg` as keyof typeof parsed.processed
    const jpegUrl = parsed.processed[jpegKey]
    if (jpegUrl) {
      return getImageUrl(jpegUrl)
    }
    return getImageUrl(parsed.processed.original || parsed.url)
  }

  // 旧格式
  const urlStr = typeof parsed === 'string' ? parsed : parsed.url || ''
  return getImageUrl(urlStr)
}

/**
 * 获取原图URL（用于详情页大图等）
 * @param imageField 图片字段
 * @returns 原图URL
 */
export const getOriginalImageUrl = (imageField: any): string => {
  const parsed = parseImageField(imageField)
  if (!parsed) return ''

  if (typeof parsed === 'object') {
    if (parsed.processed?.original) {
      return getImageUrl(parsed.processed.original)
    }
    if (parsed.url) {
      return getImageUrl(parsed.url)
    }
  }

  return getImageUrl(parsed)
}

export default instance
