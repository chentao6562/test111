/**
 * 套餐缩略图生成工具
 * 将套餐内商品图片拼接成一张主图，并添加价格爆炸贴
 *
 * 创建时间：2026-01-27
 */

import { getOptimizedImageUrl } from '../api'

// 缩略图尺寸
const THUMBNAIL_SIZE = 400
// 爆炸贴尺寸
const BADGE_SIZE = 70

/**
 * 套餐缩略图配置
 */
export interface ThumbnailConfig {
  packageId: number
  productImages: string[]  // 商品图片URL数组
  price: number            // 显示价格
}

/**
 * 加载图片（带跨域处理和超时）
 */
function loadImage(src: string, timeout = 5000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    const timer = setTimeout(() => {
      reject(new Error('Image load timeout'))
    }, timeout)

    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Image load failed'))
    }

    // 添加时间戳避免缓存问题
    const url = getOptimizedImageUrl(src, 'medium')
    img.src = url.includes('?') ? url : `${url}?t=${Date.now()}`
  })
}

/**
 * 绘制单张图片到指定区域（居中裁剪）
 */
function drawImageCentered(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // 计算居中裁剪参数
  const imgRatio = img.width / img.height
  const targetRatio = width / height

  let sx = 0, sy = 0, sw = img.width, sh = img.height

  if (imgRatio > targetRatio) {
    // 图片更宽，裁剪左右
    sw = img.height * targetRatio
    sx = (img.width - sw) / 2
  } else {
    // 图片更高，裁剪上下
    sh = img.width / targetRatio
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height)
}

/**
 * 绘制价格爆炸贴
 */
function drawPriceBadge(
  ctx: CanvasRenderingContext2D,
  price: number,
  x: number,
  y: number,
  size: number
) {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = size / 2

  // 绘制爆炸形状背景（星形）
  ctx.save()
  ctx.fillStyle = '#FF5500'
  ctx.beginPath()

  const spikes = 12
  const outerRadius = radius
  const innerRadius = radius * 0.75

  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI * i) / spikes - Math.PI / 2
    const px = centerX + Math.cos(angle) * r
    const py = centerY + Math.sin(angle) * r

    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }

  ctx.closePath()
  ctx.fill()

  // 添加阴影效果
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  // 绘制价格文字
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 格式化价格（取整）
  const priceInt = Math.round(price)
  const priceText = `¥${priceInt}`

  // 根据价格位数调整字号
  let fontSize = 18
  if (priceInt >= 1000) {
    fontSize = 14
  } else if (priceInt >= 100) {
    fontSize = 16
  }

  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.fillText(priceText, centerX, centerY)

  ctx.restore()
}

/**
 * 绘制占位符
 */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.fillStyle = '#E8E8E8'
  ctx.fillRect(x, y, width, height)

  ctx.fillStyle = '#CCCCCC'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '14px "PingFang SC", sans-serif'
  ctx.fillText('暂无图片', x + width / 2, y + height / 2)
}

/**
 * 生成套餐缩略图
 *
 * @param config 配置参数
 * @returns DataURL 字符串
 */
export async function generatePackageThumbnail(config: ThumbnailConfig): Promise<string> {
  const { productImages, price } = config
  const size = THUMBNAIL_SIZE
  const gap = 4 // 图片间隔

  // 创建Canvas
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // 绘制白色背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, size, size)

  // 加载商品图片（最多4张）
  const imageUrls = productImages.slice(0, 4)
  const loadedImages: (HTMLImageElement | null)[] = []

  for (const url of imageUrls) {
    try {
      const img = await loadImage(url)
      loadedImages.push(img)
    } catch {
      loadedImages.push(null)
    }
  }

  // 有效图片数量（过滤掉null后转为非空数组）
  const validImages: HTMLImageElement[] = []
  for (const img of loadedImages) {
    if (img !== null) validImages.push(img)
  }
  const imageCount = validImages.length

  // 根据图片数量选择布局并绘制
  if (imageCount === 0) {
    // 无图片，绘制占位符
    drawPlaceholder(ctx, 0, 0, size, size)
  } else if (imageCount === 1) {
    // 单张图片，全幅显示
    drawImageCentered(ctx, validImages[0]!, 0, 0, size, size)
  } else if (imageCount === 2) {
    // 2张图片，左右布局
    const halfWidth = (size - gap) / 2
    drawImageCentered(ctx, validImages[0]!, 0, 0, halfWidth, size)
    drawImageCentered(ctx, validImages[1]!, halfWidth + gap, 0, halfWidth, size)
  } else if (imageCount === 3) {
    // 3张图片，上1大 + 下2小
    const topHeight = (size - gap) * 0.6
    const bottomHeight = size - gap - topHeight
    const halfWidth = (size - gap) / 2

    drawImageCentered(ctx, validImages[0]!, 0, 0, size, topHeight)
    drawImageCentered(ctx, validImages[1]!, 0, topHeight + gap, halfWidth, bottomHeight)
    drawImageCentered(ctx, validImages[2]!, halfWidth + gap, topHeight + gap, halfWidth, bottomHeight)
  } else {
    // 4张及以上，2x2网格
    const cellSize = (size - gap) / 2

    drawImageCentered(ctx, validImages[0]!, 0, 0, cellSize, cellSize)
    drawImageCentered(ctx, validImages[1]!, cellSize + gap, 0, cellSize, cellSize)
    drawImageCentered(ctx, validImages[2]!, 0, cellSize + gap, cellSize, cellSize)
    drawImageCentered(ctx, validImages[3]!, cellSize + gap, cellSize + gap, cellSize, cellSize)
  }

  // 绘制价格爆炸贴（右上角）
  if (price > 0) {
    const badgeX = size - BADGE_SIZE - 8
    const badgeY = 8
    drawPriceBadge(ctx, price, badgeX, badgeY, BADGE_SIZE)
  }

  // 导出为JPEG DataURL
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * 判断套餐是否需要生成拼接图
 */
export function shouldGenerateThumbnail(pkg: {
  images?: string[]
  name: string
}): boolean {
  // 1. 没有主图
  const hasNoImage = !pkg.images || pkg.images.length === 0 || !pkg.images[0]
  // 2. 不是马年套餐
  const isHorseYear = pkg.name.includes('马年')

  return hasNoImage && !isHorseYear
}

/**
 * 从套餐商品项中提取图片URL
 */
export function extractProductImages(items: Array<{
  product?: {
    images?: string[]
  }
  productImage?: string
}>): string[] {
  const images: string[] = []

  for (const item of items) {
    // 优先使用 product.images
    const productImg = item.product?.images?.[0]
    if (productImg) {
      images.push(productImg)
    } else if (item.productImage) {
      images.push(item.productImage)
    }

    // 最多取4张
    if (images.length >= 4) break
  }

  return images
}
