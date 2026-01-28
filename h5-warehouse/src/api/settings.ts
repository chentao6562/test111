/**
 * 门店端设置API
 * 【2026-01-28 蓝牙打印】打印配置获取
 */

import { request } from './request'

/**
 * 打印配置接口
 */
export interface PrintConfig {
  enablePrint: boolean
  storeName: string
  storePhone: string
  storeAddress: string
  footerText: string
  showQRCode: boolean
  paperWidth: 58 | 80
}

/**
 * 获取打印配置
 */
export function getPrintConfig(): Promise<PrintConfig> {
  return request.get('/store/print-config')
}
