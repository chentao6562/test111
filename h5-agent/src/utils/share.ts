import { Toast } from 'tdesign-mobile-vue'

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 方案1: 现代API（优先）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 方案2: 兼容方案（fallback）
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)

    textarea.select()
    textarea.setSelectionRange(0, text.length)

    const success = document.execCommand('copy')
    document.body.removeChild(textarea)

    return success
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 分享商品
 * @param product 商品信息
 */
export const shareProduct = async (product: any) => {
  if (!product) {
    Toast.error('商品信息不存在')
    return
  }

  // 构建分享URL
  const shareUrl = `${window.location.origin}/product/${product.id}`

  // 构建分享文案
  const shareText = `【${product.name}】\n代理价 ¥${product.agentPrice}\n查看详情：${shareUrl}`

  // 复制到剪贴板
  const success = await copyToClipboard(shareText)

  if (success) {
    Toast.success('链接已复制，可分享给好友')
  } else {
    Toast.error('复制失败，请手动复制')
  }
}

/**
 * 生成商品分享文本（不自动复制）
 * @param product 商品信息
 * @returns 分享文本
 */
export const generateShareText = (product: any): string => {
  if (!product) return ''

  const shareUrl = `${window.location.origin}/product/${product.id}`
  return `【${product.name}】\n代理价 ¥${product.agentPrice}\n查看详情：${shareUrl}`
}

/**
 * 创建带品牌信息的二维码图片
 * 【2026-01-17 新增】用于推销员分享二维码
 * @param qrCanvas 二维码canvas元素
 * @param title 底部标题文字
 * @returns 图片Data URL
 */
export const createBrandedQRCode = (
  qrCanvas: HTMLCanvasElement,
  title: string = '蒙庆烟花·专属优惠'
): string => {
  // 创建新画布
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const padding = 24
  const titleHeight = 50
  const qrSize = qrCanvas.width

  canvas.width = qrSize + padding * 2
  canvas.height = qrSize + padding * 2 + titleHeight

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 绘制二维码
  ctx.drawImage(qrCanvas, padding, padding)

  // 绘制分隔线
  ctx.strokeStyle = '#eeeeee'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, qrSize + padding + 15)
  ctx.lineTo(canvas.width - padding, qrSize + padding + 15)
  ctx.stroke()

  // 绘制标题
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, canvas.width / 2, qrSize + padding + 40)

  return canvas.toDataURL('image/png')
}

/**
 * 下载图片到本地
 * 【2026-01-17 新增】用于保存推销员二维码
 * @param dataUrl 图片的Data URL
 * @param filename 文件名
 * @returns 是否成功
 */
export const downloadImage = (dataUrl: string, filename: string = 'qrcode.png'): boolean => {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (error) {
    console.error('下载图片失败:', error)
    return false
  }
}
