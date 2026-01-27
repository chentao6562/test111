/**
 * 海报生成工具
 * 使用Canvas动态生成商品宣传海报
 */

export interface PosterProduct {
  name: string
  image: string
  price: number        // 推销员定价
  originalPrice?: number // 原价（用于显示划线价）
  unit: string
}

export interface PosterConfig {
  product: PosterProduct
  salesperson: {
    name: string
    avatar?: string
  }
  qrCodeDataUrl: string  // 二维码图片的DataURL
  template?: 'red' | 'gold' | 'simple'
}

// 海报尺寸
const POSTER_WIDTH = 750
const POSTER_HEIGHT = 1334

// 颜色主题
const THEMES = {
  red: {
    primary: '#E53935',
    secondary: '#FF6B6B',
    accent: '#FFF3E0',
    text: '#333333',
    background: '#FFFFFF',
    gradient: ['#E53935', '#FF6B6B'],
  },
  gold: {
    primary: '#FF8C00',
    secondary: '#FFD700',
    accent: '#FFF8E1',
    text: '#333333',
    background: '#FFFFFF',
    gradient: ['#FF8C00', '#FFD700'],
  },
  simple: {
    primary: '#1976D2',
    secondary: '#64B5F6',
    accent: '#E3F2FD',
    text: '#333333',
    background: '#FFFFFF',
    gradient: ['#1976D2', '#64B5F6'],
  },
}

/**
 * 加载图片
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    // 添加时间戳避免缓存问题
    img.src = src.includes('?') ? src : `${src}?t=${Date.now()}`
  })
}

/**
 * 绘制圆角矩形
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 绘制渐变背景
 */
function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  colors: string[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y)
  gradient.addColorStop(0, colors[0] || '#E53935')
  gradient.addColorStop(1, colors[1] || '#FF6B6B')
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, width, height)
}

/**
 * 文字自动换行
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split('')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine + word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * 生成商品海报
 */
export async function generateProductPoster(config: PosterConfig): Promise<string> {
  const { product, salesperson, qrCodeDataUrl, template = 'red' } = config
  const theme = THEMES[template]

  // 创建Canvas
  const canvas = document.createElement('canvas')
  canvas.width = POSTER_WIDTH
  canvas.height = POSTER_HEIGHT
  const ctx = canvas.getContext('2d')!

  // 1. 绘制白色背景
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  // 2. 绘制顶部Banner区域
  drawGradientBackground(ctx, theme.gradient, 0, 0, POSTER_WIDTH, 120)

  // 品牌文字
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('蒙庆烟花 · 春节特惠', POSTER_WIDTH / 2, 70)

  // 3. 绘制商品图片区域
  const imageAreaY = 140
  const imageAreaHeight = 450
  const imageSize = 400
  const imageX = (POSTER_WIDTH - imageSize) / 2
  const imageY = imageAreaY + (imageAreaHeight - imageSize) / 2

  // 绘制图片背景框
  ctx.fillStyle = '#F5F5F5'
  roundRect(ctx, imageX - 20, imageY - 20, imageSize + 40, imageSize + 40, 16)
  ctx.fill()

  // 加载并绘制商品图片
  try {
    const productImg = await loadImage(product.image)

    // 裁剪为圆角矩形
    ctx.save()
    roundRect(ctx, imageX, imageY, imageSize, imageSize, 12)
    ctx.clip()

    // 保持图片比例居中裁剪
    const imgRatio = productImg.width / productImg.height
    let sx = 0, sy = 0, sw = productImg.width, sh = productImg.height
    if (imgRatio > 1) {
      sw = productImg.height
      sx = (productImg.width - sw) / 2
    } else {
      sh = productImg.width
      sy = (productImg.height - sh) / 2
    }
    ctx.drawImage(productImg, sx, sy, sw, sh, imageX, imageY, imageSize, imageSize)
    ctx.restore()
  } catch (error) {
    // 图片加载失败，显示占位符
    ctx.fillStyle = '#E0E0E0'
    roundRect(ctx, imageX, imageY, imageSize, imageSize, 12)
    ctx.fill()
    ctx.fillStyle = '#999999'
    ctx.font = '24px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('商品图片', POSTER_WIDTH / 2, imageY + imageSize / 2)
  }

  // 4. 绘制商品信息区域
  const infoY = 620

  // 商品名称（最多显示两行）
  ctx.fillStyle = theme.text
  ctx.font = 'bold 40px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  const nameLines = wrapText(ctx, product.name, POSTER_WIDTH - 80)
  nameLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, POSTER_WIDTH / 2, infoY + index * 50)
  })

  // 价格区域
  const priceY = infoY + (nameLines.length > 1 ? 130 : 80)

  // 当前价格
  ctx.fillStyle = theme.primary
  ctx.font = 'bold 56px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  const priceText = `¥${product.price.toFixed(2)}`
  ctx.fillText(priceText, POSTER_WIDTH / 2, priceY)

  // 原价（划线价）
  if (product.originalPrice && product.originalPrice > product.price) {
    ctx.fillStyle = '#999999'
    ctx.font = '28px "PingFang SC", sans-serif'
    const originalText = `¥${product.originalPrice.toFixed(2)}`
    const originalWidth = ctx.measureText(originalText).width
    const originalX = POSTER_WIDTH / 2 - originalWidth / 2
    ctx.fillText(originalText, POSTER_WIDTH / 2, priceY + 45)
    // 划线
    ctx.strokeStyle = '#999999'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(originalX, priceY + 38)
    ctx.lineTo(originalX + originalWidth, priceY + 38)
    ctx.stroke()

    // 省钱提示
    const saveAmount = product.originalPrice - product.price
    ctx.fillStyle = theme.primary
    ctx.font = 'bold 24px "PingFang SC", sans-serif'
    ctx.fillText(`立省 ¥${saveAmount.toFixed(0)}`, POSTER_WIDTH / 2, priceY + 85)
  }

  // 单位
  ctx.fillStyle = '#666666'
  ctx.font = '24px "PingFang SC", sans-serif'
  ctx.fillText(`单位: ${product.unit}`, POSTER_WIDTH / 2, priceY + 120)

  // 5. 绘制底部区域
  const bottomY = 950

  // 分隔线
  ctx.strokeStyle = '#E0E0E0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, bottomY)
  ctx.lineTo(POSTER_WIDTH - 40, bottomY)
  ctx.stroke()

  // 底部信息区
  const qrSize = 180
  const qrX = POSTER_WIDTH - qrSize - 60
  const qrY = bottomY + 40

  // 绘制二维码
  try {
    const qrImg = await loadImage(qrCodeDataUrl)
    // 二维码背景
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 8)
    ctx.fill()
    ctx.strokeStyle = '#E0E0E0'
    ctx.lineWidth = 1
    ctx.stroke()
    // 二维码图片
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  } catch (error) {
    // 二维码加载失败
    ctx.fillStyle = '#F5F5F5'
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 8)
    ctx.fill()
  }

  // 左侧文案 【2026-01-23】修改为突出到店自提
  const textX = 60
  const textY = bottomY + 60

  ctx.fillStyle = theme.primary
  ctx.font = 'bold 32px "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('扫码预约 · 到店自提', textX, textY)

  ctx.fillStyle = '#666666'
  ctx.font = '26px "PingFang SC", sans-serif'
  ctx.fillText(`推销员: ${salesperson.name}`, textX, textY + 45)

  // 【2026-01-23】添加合规提示
  ctx.fillStyle = '#E65100'
  ctx.font = 'bold 22px "PingFang SC", sans-serif'
  ctx.fillText('⚠ 烟花爆竹仅限到店自提', textX, textY + 85)

  ctx.fillStyle = '#999999'
  ctx.font = '20px "PingFang SC", sans-serif'
  ctx.fillText('蒙庆烟花官方授权', textX, textY + 115)

  // 6. 底部品牌区域
  const footerY = POSTER_HEIGHT - 80

  drawGradientBackground(ctx, theme.gradient, 0, footerY - 20, POSTER_WIDTH, 100)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '24px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('呼和浩特市和林格尔县盛乐镇姑子板村', POSTER_WIDTH / 2, footerY + 10)
  ctx.font = '22px "PingFang SC", sans-serif'
  ctx.fillText('客服电话: 13190531439 / 15849390600', POSTER_WIDTH / 2, footerY + 45)

  // 返回DataURL
  return canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * 下载海报图片
 */
export function downloadPoster(dataUrl: string, filename: string = 'poster.jpg') {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
