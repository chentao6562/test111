/**
 * @point-of-sale/receipt-printer-encoder 类型声明
 */

declare module '@point-of-sale/receipt-printer-encoder' {
  interface ReceiptPrinterEncoderOptions {
    language?: 'esc-pos' | 'star-prnt' | 'star-line'
    width?: number
    codepageMapping?: string
    createCanvas?: unknown
  }

  class ReceiptPrinterEncoder {
    constructor(options?: ReceiptPrinterEncoderOptions)

    initialize(): this
    codepage(codepage: string): this
    align(alignment: 'left' | 'center' | 'right'): this
    bold(enabled: boolean): this
    underline(enabled: boolean): this
    width(width: number): this
    height(height: number): this
    size(size: 'small' | 'normal' | 'large'): this
    line(text: string): this
    text(text: string): this
    newline(): this
    cut(type?: 'full' | 'partial'): this
    raw(data: Uint8Array): this
    encode(): Uint8Array
  }

  export default ReceiptPrinterEncoder
  export { ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions }
}
