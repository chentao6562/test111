/**
 * 格式化工具函数（从小程序miniprogram-warehouse/utils/format.js移植）
 */

// 格式化金额（千分位）
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化价格（带货币符号）
export function formatPrice(price: number | string): string {
  return `¥${formatAmount(price)}`
}

// 智能时间格式化（今天、昨天、日期）
export function formatSmartTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  if (targetDate.getTime() === today.getTime()) {
    return `今天 ${timeStr}`
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `昨天 ${timeStr}`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
  }
}

// 格式化日期时间（YYYY-MM-DD HH:mm:ss）
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化日期（YYYY-MM-DD）
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化相对时间（刚刚、X分钟前、X小时前）
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(dateString)
}

// 格式化手机号（脱敏）
export function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化提货码（XXXXXX）
export function formatPickupCode(code: string): string {
  if (!code) return ''
  return code.toUpperCase()
}

/**
 * 对文件名中的特殊字符进行URL编码
 * 保留路径分隔符，只编码文件名部分的特殊字符
 * 【2026-01-17】修复：文件名包含&、=等特殊字符导致URL被截断
 */
export function encodeImageFilename(url: string): string {
  if (!url) return ''

  // 已经是完整URL（http开头）不处理
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 分离路径和文件名
  const lastSlash = url.lastIndexOf('/')
  if (lastSlash === -1) {
    // 没有路径分隔符，整个就是文件名
    return encodeURIComponent(url)
  }

  const path = url.substring(0, lastSlash + 1)
  const filename = url.substring(lastSlash + 1)

  // 只编码文件名部分（如果文件名包含特殊字符）
  // 注意：如果已经编码过，不要重复编码
  if (filename.includes('%')) {
    return url
  }

  return path + encodeURIComponent(filename)
}

// 解析图片字段（支持JSON数组、逗号分隔、单个路径）
export function parseImages(imageField: string | null | undefined): string[] {
  if (!imageField) return []

  let urls: string[] = []

  // 尝试JSON解析
  try {
    const parsed = JSON.parse(imageField)
    if (Array.isArray(parsed)) {
      urls = parsed
    } else if (typeof parsed === 'string' && parsed.length > 0) {
      urls = [parsed]
    }
  } catch (e) {
    // 不是JSON，尝试其他解析方式
    // 检查是否是路径（可能包含逗号作为文件名的一部分）
    if (imageField.startsWith('http') || imageField.startsWith('/') || imageField.startsWith('uploads/')) {
      urls = [imageField]
    } else if (imageField.includes(',') && !imageField.includes('&')) {
      // 只有当不包含&时才按逗号分割（因为文件名可能是 u=xxx,xxx&... 格式）
      urls = imageField.split(',').map(url => url.trim()).filter(Boolean)
    } else {
      urls = [imageField]
    }
  }

  // 对所有URL进行编码处理
  return urls.map(url => encodeImageFilename(url))
}

// 【2026-01-28修复】微信分享图片不显示 - 将硬编码IP替换为当前域名
const HARDCODED_IP = 'http://39.104.113.121'

// 图片URL完整化（处理相对路径）
export function getImageUrl(url: string): string {
  if (!url) return ''
  // 先进行编码处理
  const encodedUrl = encodeImageFilename(url)

  // 【2026-01-28修复】处理硬编码IP地址的URL
  // 微信内置浏览器从域名页面加载IP地址图片会被阻止
  if (encodedUrl.startsWith(HARDCODED_IP)) {
    const path = encodedUrl.replace(HARDCODED_IP, '')
    return `${window.location.origin}${path}`
  }

  // 其他完整URL则直接返回
  if (encodedUrl.startsWith('http://') || encodedUrl.startsWith('https://')) return encodedUrl
  // 相对路径：确保以 / 开头（由当前域名提供服务）
  return encodedUrl.startsWith('/') ? encodedUrl : `/${encodedUrl}`
}

// 获取第一张图片
export function getFirstImage(imageField: string | null | undefined, defaultImage = ''): string {
  const images = parseImages(imageField)
  const firstImage = images[0] || defaultImage
  // 对图片URL进行完整化处理
  return getImageUrl(firstImage)
}

// 格式化订单状态
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending_payment: '待付款',
    pending_accept: '待接单',
    preparing: '备货中',
    pending_transfer: '待移库',
    transferring: '移库中',
    pending_pickup: '待提货',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

// 格式化支付状态
export function formatPaymentStatus(fullPaid: boolean, paidAmount: number, totalAmount: number): string {
  if (fullPaid || paidAmount >= totalAmount) return '已付款'
  return '未付款'
}

// 验证提货码格式（6位或8位数字）
export function isValidPickupCode(code: string): boolean {
  return /^\d{6}$/.test(code) || /^\d{8}$/.test(code)
}

// 格式化数量
export function formatQuantity(quantity: number): string {
  return quantity.toString()
}

/**
 * 从二维码数据中提取纯提货码
 * 支持格式: orderNo|pickupCode|timestamp|signature 或 纯数字
 */
export function extractPickupCode(data: string): string {
  if (!data) return ''

  // 如果包含分隔符，提取第二部分
  if (data.includes('|')) {
    const parts = data.split('|')
    return parts[1] || ''
  }

  // 否则返回原始数据
  return data.trim()
}
