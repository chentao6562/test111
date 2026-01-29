/**
 * 门店端设置API
 * 【2026-01-28 蓝牙打印】打印配置获取
 */

import { request } from './request'
import type { PrintConfig } from '@/services/bluetoothPrinter'

// 重新导出 PrintConfig 类型，保持向后兼容
export type { PrintConfig }

/**
 * 获取打印配置
 */
export function getPrintConfig(): Promise<PrintConfig> {
  return request.get('/store/print-config')
}
