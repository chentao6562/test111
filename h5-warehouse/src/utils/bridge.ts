/**
 * JS Bridge - 原生能力调用（Android WebView）
 * 支持双环境：Android App + H5浏览器
 */

// 检查是否在App内
export function isInApp(): boolean {
  return !!(window as any).AndroidBridge
}

// 扫码结果接口
export interface ScanResult {
  success: boolean
  result?: string
  error?: string
}

// 扫码功能（优先调用原生，降级到H5）
export async function scan(): Promise<ScanResult> {
  return new Promise((resolve) => {
    if (isInApp()) {
      // Android原生扫码
      try {
        const result = (window as any).AndroidBridge.scan()
        resolve({ success: true, result })
      } catch (error) {
        resolve({ success: false, error: '扫码失败' })
      }
    } else {
      // H5环境：由调用方使用html5-qrcode库实现
      resolve({ success: false, error: '请使用扫码组件' })
    }
  })
}

// 震动反馈
export function vibrate(duration: number = 200): void {
  if (isInApp()) {
    // Android原生震动
    try {
      (window as any).AndroidBridge.vibrate(duration)
    } catch (error) {
      console.warn('震动失败:', error)
    }
  } else {
    // H5环境：使用Vibration API（部分浏览器支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(duration)
    }
  }
}

// Toast提示（调用原生Toast）
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  if (isInApp()) {
    try {
      (window as any).AndroidBridge.showToast(message, type)
    } catch (error) {
      // 降级到alert
      alert(message)
    }
  } else {
    // H5环境：由调用方使用TDesign的Toast组件
    console.log(`Toast: ${message}`)
  }
}

// 关闭WebView（返回）
export function closeWebView(): void {
  if (isInApp()) {
    try {
      (window as any).AndroidBridge.close()
    } catch (error) {
      console.warn('关闭失败:', error)
    }
  } else {
    window.history.back()
  }
}

// 获取App版本号
export function getAppVersion(): string {
  if (isInApp()) {
    try {
      return (window as any).AndroidBridge.getVersion()
    } catch (error) {
      return ''
    }
  }
  return ''
}

/**
 * 拨打电话
 * 兼容多种环境：普通浏览器、微信、Android WebView
 * 必须在用户点击事件中同步调用，否则可能被浏览器拦截
 * @param phone 电话号码
 */
export function callPhone(phone: string): void {
  // 优先使用 Android 原生桥接
  if (isInApp()) {
    try {
      (window as any).AndroidBridge.call(phone)
      return
    } catch (error) {
      console.warn('原生拨号失败，降级到H5方式:', error)
    }
  }

  // 尝试通过 intent 方式拨号（Android WebView 兼容）
  const intentUrl = `intent://dial/${phone}#Intent;scheme=tel;package=com.android.dialer;end`

  // 创建隐藏的 iframe 来触发拨号，避免页面跳转
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = `tel:${phone}`
  document.body.appendChild(iframe)

  // 延迟移除 iframe
  setTimeout(() => {
    document.body.removeChild(iframe)
  }, 100)
}
