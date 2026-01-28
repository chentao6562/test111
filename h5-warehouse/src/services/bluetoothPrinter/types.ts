/**
 * 蓝牙打印机服务类型定义
 * DL-5801PW 热敏票据打印机
 * 【2026-01-28 更新】支持后台动态配置
 */

// 打印机连接状态
export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error'

// 打印配置（从后台获取）
export interface PrintConfig {
  enablePrint: boolean
  storeName: string
  storePhone: string
  storeAddress: string
  footerText: string
  showQRCode: boolean
  paperWidth: 58 | 80
}

// 已保存的打印机设备信息
export interface SavedPrinterDevice {
  id: string              // 设备ID
  name: string            // 设备名称
  lastConnected: number   // 最后连接时间戳
}

// 蓝牙支持检测结果
export interface BluetoothSupport {
  supported: boolean
  reason?: 'no-api' | 'no-https' | 'wechat' | 'safari' | 'unknown'
}

// 打印结果
export interface PrintResult {
  success: boolean
  method: 'bluetooth' | 'html'
  error?: string
}

// 商品项
export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  subtotal: number
}

// 赠品项
export interface ReceiptGift {
  name: string
  delivered: boolean
}

// 小票打印数据
export interface ReceiptData {
  // 店铺信息（可选，如不传则使用PrintConfig中的值）
  storeName?: string
  storePhone?: string

  // 预约信息
  reservationNo: string
  customerName: string
  customerPhone: string

  // 商品列表
  items: ReceiptItem[]

  // 赠品信息
  gift?: ReceiptGift

  // 金额信息
  totalAmount: number
  couponDeduction?: number
  actualPayment: number

  // 支付信息
  paymentMethod: string

  // 打印时间
  printTime: Date
}

// 支付方式标签映射
export const PAYMENT_LABELS: Record<string, string> = {
  cash: '现金',
  wechat: '微信支付',
  alipay: '支付宝'
}

// 打印机配置常量
export const PRINTER_CONFIG = {
  // 58mm纸宽配置
  WIDTH_58: 32,
  DIVIDER_58: '--------------------------------',
  DOUBLE_DIVIDER_58: '================================',
  // 80mm纸宽配置
  WIDTH_80: 48,
  DIVIDER_80: '------------------------------------------------',
  DOUBLE_DIVIDER_80: '================================================'
}

// 根据纸宽获取配置
export function getPrinterConfig(paperWidth: 58 | 80 = 58) {
  if (paperWidth === 80) {
    return {
      WIDTH: PRINTER_CONFIG.WIDTH_80,
      DIVIDER: PRINTER_CONFIG.DIVIDER_80,
      DOUBLE_DIVIDER: PRINTER_CONFIG.DOUBLE_DIVIDER_80
    }
  }
  return {
    WIDTH: PRINTER_CONFIG.WIDTH_58,
    DIVIDER: PRINTER_CONFIG.DIVIDER_58,
    DOUBLE_DIVIDER: PRINTER_CONFIG.DOUBLE_DIVIDER_58
  }
}
