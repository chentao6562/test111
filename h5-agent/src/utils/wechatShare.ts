/**
 * 微信JSSDK分享工具
 * @since 2026-01-28
 */

import { get } from '../api'

// 微信JSSDK类型声明
declare global {
  interface Window {
    wx?: {
      config: (config: WxConfig) => void
      ready: (callback: () => void) => void
      error: (callback: (res: { errMsg: string }) => void) => void
      updateAppMessageShareData: (data: ShareData) => void
      updateTimelineShareData: (data: ShareData) => void
    }
  }
}

interface WxConfig {
  debug?: boolean
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
  jsApiList: string[]
}

interface ShareData {
  title: string
  desc?: string
  link: string
  imgUrl: string
  success?: () => void
  fail?: (res: { errMsg: string }) => void
}

interface JssdkConfigResponse {
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
}

// 是否已加载JSSDK
let sdkLoaded = false
let sdkLoading = false

/**
 * 加载微信JSSDK
 */
function loadWxSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded) {
      resolve()
      return
    }

    if (sdkLoading) {
      // 等待加载完成
      const checkInterval = setInterval(() => {
        if (sdkLoaded) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      return
    }

    sdkLoading = true
    const script = document.createElement('script')
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
    script.onload = () => {
      sdkLoaded = true
      sdkLoading = false
      resolve()
    }
    script.onerror = () => {
      sdkLoading = false
      reject(new Error('微信SDK加载失败'))
    }
    document.head.appendChild(script)
  })
}

/**
 * 获取JSSDK配置
 */
async function getJssdkConfig(url: string): Promise<JssdkConfigResponse | null> {
  try {
    const res = await get<JssdkConfigResponse>('/wechat/jssdk-config', { url })
    return res.data
  } catch (error) {
    console.warn('获取微信配置失败:', error)
    return null
  }
}

/**
 * 检测是否在微信浏览器中
 */
export function isWechatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('micromessenger')
}

/**
 * 配置微信分享
 * @param options 分享配置
 */
export async function setupWechatShare(options: {
  title: string
  desc: string
  link?: string
  imgUrl: string
}): Promise<boolean> {
  // 非微信浏览器不处理
  if (!isWechatBrowser()) {
    console.log('非微信浏览器，跳过分享配置')
    return false
  }

  try {
    // 加载SDK
    await loadWxSdk()

    if (!window.wx) {
      console.warn('微信SDK未加载')
      return false
    }

    // 获取签名配置（移除URL中的hash部分）
    const currentUrl: string = window.location.href.split('#')[0] || window.location.href
    const config = await getJssdkConfig(currentUrl)

    if (!config) {
      console.warn('获取微信配置失败')
      return false
    }

    // 初始化配置
    window.wx.config({
      debug: false,
      appId: config.appId,
      timestamp: config.timestamp,
      nonceStr: config.nonceStr,
      signature: config.signature,
      jsApiList: [
        'updateAppMessageShareData',
        'updateTimelineShareData'
      ]
    })

    // 配置分享内容
    window.wx.ready(() => {
      const shareData: ShareData = {
        title: options.title,
        desc: options.desc,
        link: options.link || window.location.href,
        imgUrl: options.imgUrl
      }

      // 分享给朋友
      window.wx?.updateAppMessageShareData(shareData)
      // 分享到朋友圈
      window.wx?.updateTimelineShareData(shareData)

      console.log('微信分享配置成功')
    })

    window.wx.error((res) => {
      console.warn('微信配置失败:', res.errMsg)
    })

    return true
  } catch (error) {
    console.warn('微信分享配置失败:', error)
    return false
  }
}
