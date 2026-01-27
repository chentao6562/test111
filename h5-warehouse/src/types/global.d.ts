/**
 * 全局类型声明
 * 【2026-01-17】添加微信JSSDK类型
 */

interface WxScanQRCodeOptions {
  needResult: 0 | 1
  scanType: Array<'qrCode' | 'barCode'>
  success?: (res: { resultStr: string }) => void
  fail?: (err: { errMsg: string }) => void
  cancel?: () => void
}

interface WxJSSDK {
  scanQRCode: (options: WxScanQRCodeOptions) => void
  config: (options: any) => void
  ready: (callback: () => void) => void
  error: (callback: (err: any) => void) => void
}

declare global {
  interface Window {
    wx?: WxJSSDK
  }
}

export {}
