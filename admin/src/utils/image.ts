/**
 * 图片URL处理工具
 * 用于处理后端返回的相对路径，转换为完整URL
 */

// 【2026-01-22修复】从环境变量获取服务器基础URL，避免硬编码
const SERVER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://39.104.58.26'

// 默认商品占位图（Base64 SVG显示"无图片"）
export const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNFNUU1RTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='

/**
 * 获取完整的图片URL
 * @param url 相对路径或完整URL
 * @returns 完整的图片URL
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  // 已经是完整URL或base64
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }

  // 相对路径，添加服务器基础URL
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * 解析图片字段，支持JSON数组、逗号分隔字符串、单个路径
 * @param images 图片数据
 * @returns 图片URL数组
 */
export function parseImages(images: string | string[] | undefined | null): string[] {
  if (!images) return []

  // 已经是数组
  if (Array.isArray(images)) {
    return images.filter(Boolean).map(url => getImageUrl(url))
  }

  // 字符串处理
  if (typeof images === 'string') {
    // 尝试解析JSON
    if (images.startsWith('[')) {
      try {
        const parsed = JSON.parse(images)
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(url => getImageUrl(url))
        }
      } catch {
        // JSON解析失败，继续其他处理
      }
    }

    // 逗号分隔
    if (images.includes(',')) {
      return images.split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(url => getImageUrl(url))
    }

    // 单个路径
    const url = getImageUrl(images)
    return url ? [url] : []
  }

  return []
}

/**
 * 获取第一张图片URL
 * @param images 图片数据
 * @param fallback 默认占位图
 * @returns 第一张图片的完整URL
 */
export function getFirstImage(images: string | string[] | undefined | null, fallback: string = DEFAULT_PRODUCT_IMAGE): string {
  const imageList = parseImages(images)
  return imageList[0] || fallback
}
