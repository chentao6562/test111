/**
 * 性能优化工具函数（从小程序miniprogram-warehouse/utils/performance.js移植）
 */

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId)

    timeoutId = setTimeout(() => {
      func.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      func.apply(this, args)
      lastTime = now
    }
  }
}

// 内存缓存（用于统计数据）
class MemoryCache {
  private cache: Map<string, { data: any; expireAt: number }> = new Map()

  set(key: string, data: any, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      expireAt: Date.now() + ttl
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expireAt) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expireAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

export const memoryCache = new MemoryCache()

// 请求去重队列
class RequestQueue {
  private pending: Map<string, Promise<any>> = new Map()

  async add<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 如果已有相同请求在进行中，返回该请求的Promise
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>
    }

    // 创建新请求
    const promise = requestFn()
      .finally(() => {
        // 请求完成后从队列移除
        this.pending.delete(key)
      })

    this.pending.set(key, promise)
    return promise
  }

  clear(key?: string): void {
    if (key) {
      this.pending.delete(key)
    } else {
      this.pending.clear()
    }
  }
}

export const requestQueue = new RequestQueue()
