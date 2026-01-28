/**
 * 小票ESC/POS指令构建器
 * 适配 DL-5801PW 58mm/80mm热敏打印机
 * 【2026-01-28 更新】支持后台动态配置
 */

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { ReceiptData, ReceiptItem, PrintConfig } from './types'
import { PAYMENT_LABELS, getPrinterConfig } from './types'

export class ReceiptBuilder {
  private config: PrintConfig
  private printerConfig: ReturnType<typeof getPrinterConfig>

  constructor(config: PrintConfig) {
    this.config = config
    this.printerConfig = getPrinterConfig(config.paperWidth)
  }

  /**
   * 构建完整的小票ESC/POS指令
   */
  build(data: ReceiptData): Uint8Array {
    const encoder = new ReceiptPrinterEncoder({
      language: 'esc-pos',
      width: this.printerConfig.WIDTH,
      codepageMapping: 'cp936'  // 中文GBK编码
    })

    // 初始化打印机 - 发送ESC @指令重置所有设置
    encoder.initialize()

    // 发送原始ESC/POS指令确保打印机正确初始化
    // ESC @ = 初始化打印机
    // GS ! 0x00 = 取消放大模式
    encoder.raw(new Uint8Array([0x1B, 0x40]))  // ESC @ 初始化
    encoder.raw(new Uint8Array([0x1D, 0x21, 0x00]))  // GS ! 0 取消放大

    // ========== 店铺信息 ==========
    // 优先使用data中的店铺名称，fallback到config
    const storeName = data.storeName || this.config.storeName
    encoder
      .codepage('cp936')
      .align('center')
      .bold(true)

    // 使用原始指令放大字体 GS ! n (n=0x11表示宽高各2倍)
    encoder.raw(new Uint8Array([0x1D, 0x21, 0x11]))
    encoder.line(storeName)
    // 恢复正常字体
    encoder.raw(new Uint8Array([0x1D, 0x21, 0x00]))

    encoder
      .bold(false)
      .line('提货凭证')
      .line(this.printerConfig.DIVIDER)

    // ========== 提货码（醒目显示）==========
    if (data.pickupCode) {
      encoder
        .align('center')
        .bold(true)
      // 使用原始指令放大字体 GS ! n (n=0x11表示宽高各2倍)
      encoder.raw(new Uint8Array([0x1D, 0x21, 0x11]))
      encoder.line(`提货码: ${data.pickupCode}`)
      // 恢复正常字体
      encoder.raw(new Uint8Array([0x1D, 0x21, 0x00]))
      encoder
        .bold(false)
        .line(this.printerConfig.DIVIDER)
    }

    // ========== 预约信息 ==========
    encoder
      .align('left')
      .line(`预约号: ${data.reservationNo}`)
      .line(`客  户: ${data.customerName}`)
      .line(`电  话: ${this.maskPhone(data.customerPhone)}`)
      .line(this.printerConfig.DIVIDER)

    // ========== 商品明细 ==========
    encoder
      .bold(true)
      .line('【商品明细】')
      .bold(false)

    // 打印每个商品
    data.items.forEach(item => {
      this.printItem(encoder, item)
    })

    encoder.line(this.printerConfig.DIVIDER)

    // ========== 赠品信息 ==========
    if (data.gift && data.gift.name) {
      encoder
        .bold(true)
        .line('【赠品】')
        .bold(false)
        .line(`${data.gift.name}${data.gift.delivered ? '    [已发放]' : '    [待发放]'}`)
        .line(this.printerConfig.DIVIDER)
    }

    // ========== 金额信息 ==========
    encoder.line(this.formatAmountLine('订单金额:', data.totalAmount))

    if (data.couponDeduction && data.couponDeduction > 0) {
      encoder.line(this.formatAmountLine('代金券抵扣:', -data.couponDeduction))
    }

    encoder
      .line(this.printerConfig.DOUBLE_DIVIDER)
      .bold(true)
    // 使用原始指令放大高度 GS ! n (n=0x01表示高度2倍)
    encoder.raw(new Uint8Array([0x1D, 0x21, 0x01]))
    encoder.line(this.formatAmountLine('实付金额:', data.actualPayment))
    // 恢复正常字体
    encoder.raw(new Uint8Array([0x1D, 0x21, 0x00]))
    encoder
      .bold(false)
      .line(this.printerConfig.DOUBLE_DIVIDER)

    // ========== 支付方式 ==========
    const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod
    encoder.line(`支付方式: ${paymentLabel}`)
    encoder.line(this.printerConfig.DIVIDER)

    // ========== 底部信息 ==========
    // 优先使用data中的店铺电话，fallback到config
    const storePhone = data.storePhone || this.config.storePhone
    encoder
      .align('center')
      .line(this.formatDateTime(data.printTime))
      .newline()
      .line(this.config.footerText)
      .line(`客服电话: ${storePhone}`)
      .newline()
      .newline()
      .newline()

    // 切纸
    encoder.cut()

    return encoder.encode()
  }

  /**
   * 打印单个商品项
   */
  private printItem(encoder: ReceiptPrinterEncoder, item: ReceiptItem): void {
    // 商品名称（可能需要截断）
    const maxNameWidth = this.config.paperWidth === 80 ? 30 : 20
    const name = this.truncateName(item.name, maxNameWidth)
    encoder.line(name)

    // 数量、单价、小计（右对齐）
    const detail = `x${item.quantity}  单价${this.formatPrice(item.price)}  ${this.formatPrice(item.subtotal)}`
    encoder
      .align('right')
      .line(detail)
      .align('left')
  }

  /**
   * 格式化金额行
   */
  private formatAmountLine(label: string, amount: number): string {
    const amountStr = amount >= 0 ? `${this.formatPrice(amount)}` : `-${this.formatPrice(Math.abs(amount))}`
    const spaces = this.printerConfig.WIDTH - this.getStringWidth(label) - amountStr.length
    return label + ' '.repeat(Math.max(1, spaces)) + amountStr
  }

  /**
   * 格式化价格
   */
  private formatPrice(amount: number): string {
    return `¥${amount.toFixed(2)}`
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  /**
   * 手机号脱敏
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length !== 11) return phone
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  /**
   * 获取字符串显示宽度（中文算2，英文数字算1）
   */
  private getStringWidth(str: string): number {
    let width = 0
    for (const char of str) {
      // 中文字符范围
      if (/[\u4e00-\u9fa5]/.test(char)) {
        width += 2
      } else {
        width += 1
      }
    }
    return width
  }

  /**
   * 截断字符串（按显示宽度）
   */
  private truncateName(name: string, maxWidth: number): string {
    let width = 0
    let result = ''
    for (const char of name) {
      const charWidth = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1
      if (width + charWidth > maxWidth - 2) {
        return result + '..'
      }
      result += char
      width += charWidth
    }
    return result
  }
}
