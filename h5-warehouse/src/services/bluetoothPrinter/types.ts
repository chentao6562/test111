/**
 * 蓝牙打印机服务类型定义
 * DL-5801PW 热敏票据打印机
 */

// 打印机连接状态
export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error'

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
  // 店铺信息
  storeName: string
  storePhone: string

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

// 58mm打印机配置常量
export const PRINTER_CONFIG = {
  // 打印宽度（字符数，中文算2个）
  WIDTH: 32,
  // 分割线
  DIVIDER: '--------------------------------',
  // 双线分割
  DOUBLE_DIVIDER: '================================'
}
