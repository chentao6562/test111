/**
 * 小票ESC/POS指令构建器
 * 适配 DL-5801PW 58mm热敏打印机
 */

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { ReceiptData, ReceiptItem } from './types'
import { PAYMENT_LABELS, PRINTER_CONFIG } from './types'

export class ReceiptBuilder {
  /**
   * 构建完整的小票ESC/POS指令
   */
  static build(data: ReceiptData): Uint8Array {
    const encoder = new ReceiptPrinterEncoder({
      language: 'esc-pos',
      width: PRINTER_CONFIG.WIDTH,
      codepageMapping: 'cp936'  // 中文GBK编码
    })

    // 初始化打印机
    encoder.initialize()

    // ========== 店铺信息 ==========
    encoder
      .codepage('cp936')
      .align('center')
      .bold(true)
      .width(2)
      .height(2)
      .line(data.storeName)
      .width(1)
      .height(1)
      .bold(false)
      .line('提货凭证')
      .line(PRINTER_CONFIG.DIVIDER)

    // ========== 预约信息 ==========
    encoder
      .align('left')
      .line(`预约号: ${data.reservationNo}`)
      .line(`客  户: ${data.customerName}`)
      .line(`电  话: ${this.maskPhone(data.customerPhone)}`)
      .line(PRINTER_CONFIG.DIVIDER)

    // ========== 商品明细 ==========
    encoder
      .bold(true)
      .line('【商品明细】')
      .bold(false)

    // 打印每个商品
    data.items.forEach(item => {
      this.printItem(encoder, item)
    })

    encoder.line(PRINTER_CONFIG.DIVIDER)

    // ========== 赠品信息 ==========
    if (data.gift && data.gift.name) {
      encoder
        .bold(true)
        .line('【赠品】')
        .bold(false)
        .line(`${data.gift.name}${data.gift.delivered ? '    [已发放]' : '    [待发放]'}`)
        .line(PRINTER_CONFIG.DIVIDER)
    }

    // ========== 金额信息 ==========
    encoder.line(this.formatAmountLine('订单金额:', data.totalAmount))

    if (data.couponDeduction && data.couponDeduction > 0) {
      encoder.line(this.formatAmountLine('代金券抵扣:', -data.couponDeduction))
    }

    encoder
      .line(PRINTER_CONFIG.DOUBLE_DIVIDER)
      .bold(true)
      .width(1)
      .height(2)
      .line(this.formatAmountLine('实付金额:', data.actualPayment))
      .width(1)
      .height(1)
      .bold(false)
      .line(PRINTER_CONFIG.DOUBLE_DIVIDER)

    // ========== 支付方式 ==========
    const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod
    encoder.line(`支付方式: ${paymentLabel}`)
    encoder.line(PRINTER_CONFIG.DIVIDER)

    // ========== 底部信息 ==========
    encoder
      .align('center')
      .line(this.formatDateTime(data.printTime))
      .newline()
      .line('感谢光临，欢迎再来！')
      .line(`客服电话: ${data.storePhone}`)
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
  private static printItem(encoder: ReceiptPrinterEncoder, item: ReceiptItem): void {
    // 商品名称（可能需要截断）
    const name = this.truncateName(item.name, 20)
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
  private static formatAmountLine(label: string, amount: number): string {
    const amountStr = amount >= 0 ? `${this.formatPrice(amount)}` : `-${this.formatPrice(Math.abs(amount))}`
    const spaces = PRINTER_CONFIG.WIDTH - this.getStringWidth(label) - amountStr.length
    return label + ' '.repeat(Math.max(1, spaces)) + amountStr
  }

  /**
   * 格式化价格
   */
  private static formatPrice(amount: number): string {
    return `¥${amount.toFixed(2)}`
  }

  /**
   * 格式化日期时间
   */
  private static formatDateTime(date: Date): string {
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
  private static maskPhone(phone: string): string {
    if (!phone || phone.length !== 11) return phone
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  /**
   * 获取字符串显示宽度（中文算2，英文数字算1）
   */
  private static getStringWidth(str: string): number {
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
  private static truncateName(name: string, maxWidth: number): string {
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
