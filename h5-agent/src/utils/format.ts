/**
 * 通用格式化工具函数
 * 用于H5推销员端的数据格式化
 */

/**
 * 格式化金额显示
 * @param amount 金额（数字或字符串）
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的金额字符串（不带货币符号）
 * @example formatAmount(1234.567) => '1,234.57'
 */
export const formatAmount = (amount: number | string, decimals: number = 2): string => {
  if (amount === null || amount === undefined) return '0.00'

  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'

  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化价格显示（带货币符号）
 * @param price 价格
 * @param symbol 货币符号，默认'¥'
 * @returns 格式化后的价格字符串
 * @example formatPrice(1234.56) => '¥1,234.56'
 */
export const formatPrice = (price: number | string, symbol: string = '¥'): string => {
  return symbol + formatAmount(price, 2)
}

/**
 * 格式化时间显示
 * @param dateStr 日期字符串或Date对象
 * @param format 格式类型：'datetime' | 'date' | 'time' | 'relative'
 * @returns 格式化后的时间字符串
 */
export const formatTime = (
  dateStr: string | Date,
  format: 'datetime' | 'date' | 'time' | 'relative' = 'datetime'
): string => {
  if (!dateStr) return ''

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hour}:${minute}:${second}`
    case 'datetime':
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    case 'relative':
      return formatRelativeTime(date)
    default:
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
}

/**
 * 格式化相对时间（如"3分钟前"、"昨天"）
 * @param date 日期对象
 * @returns 相对时间字符串
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  // 超过7天显示具体日期
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

/**
 * 格式化手机号显示（脱敏）
 * @param phone 手机号
 * @returns 脱敏后的手机号
 * @example formatPhone('13800138000') => '138****8000'
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return ''
  if (phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 格式化预约号显示
 * @param reservationNo 预约号
 * @returns 格式化后的预约号（每4位加空格）
 * @example formatReservationNo('MQ20260111123456') => 'MQ20 2601 1112 3456'
 */
export const formatReservationNo = (reservationNo: string): string => {
  if (!reservationNo) return ''
  return reservationNo.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * 格式化提货码显示
 * @param code 提货码（6位或8位）
 * @returns 格式化后的提货码（中间加空格）
 * @example formatPickupCode('123456') => '123 456'
 */
export const formatPickupCode = (code: string): string => {
  if (!code) return ''
  if (code.length === 6) {
    return code.replace(/(\d{3})(\d{3})/, '$1 $2')
  }
  if (code.length === 8) {
    return code.replace(/(\d{4})(\d{4})/, '$1 $2')
  }
  return code
}

/**
 * 解析图片字段（支持JSON数组、逗号分隔字符串、单个路径）
 * @param images 图片字段
 * @returns 图片URL数组
 */
export const parseImages = (images: string | string[] | null | undefined): string[] => {
  if (!images) return []

  // 已经是数组
  if (Array.isArray(images)) {
    return images.filter(Boolean)
  }

  // 字符串处理
  if (typeof images === 'string') {
    // JSON数组
    if (images.startsWith('[')) {
      try {
        const parsed = JSON.parse(images)
        return Array.isArray(parsed) ? parsed.filter(Boolean) : []
      } catch {
        // JSON解析失败，继续尝试其他方式
      }
    }

    // 逗号分隔
    if (images.includes(',')) {
      return images.split(',').map(s => s.trim()).filter(Boolean)
    }

    // 单个路径
    return [images]
  }

  return []
}

/**
 * 获取第一张图片
 * @param images 图片字段
 * @returns 第一张图片URL或空字符串
 */
export const getFirstImage = (images: string | string[] | null | undefined): string => {
  const imageList = parseImages(images)
  return imageList.length > 0 ? imageList[0]! : ''
}

/**
 * 格式化预约状态显示文本
 * @param status 预约状态数字
 * @returns 中文状态文本
 */
export const formatReservationStatus = (status: number): string => {
  const statusMap: Record<number, string> = {
    0: '待确认',
    1: '确认中',
    2: '已确认',
    3: '已完成',
    4: '已取消',
    5: '已过期',
    6: '确认失败',
    7: '待备货',
    8: '备货中',
    9: '待提货'
  }
  return statusMap[status] || '未知'
}

/**
 * 格式化支付状态显示文本
 * @param fullPaid 是否全款
 * @param depositPaid 是否付定金
 * @returns 中文状态文本
 */
export const formatPaymentStatus = (fullPaid: boolean, depositPaid?: boolean): string => {
  if (fullPaid) return '已付款'
  if (depositPaid) return '已付定金'
  return '未付款'
}

/**
 * 格式化推销员类型
 * @param type 推销员类型
 * @returns 中文类型文本
 */
export const formatAgentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'LEVEL1': '一级推销员',
    'LEVEL2': '二级推销员',
    'LEVEL3': '三级推销员',
    'WHOLESALE': '普通用户'
  }
  return typeMap[type] || type
}

/**
 * 格式化分润类型
 * @param type 分润类型
 * @returns 中文类型文本
 */
export const formatCommissionType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'DIRECT': '直接分润',
    'INDIRECT': '间接分润'
  }
  return typeMap[type] || type
}

/**
 * 格式化分润状态
 * @param status 分润状态
 * @returns 中文状态文本
 */
export const formatCommissionStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PENDING': '待结算',
    'SETTLED': '已结算',
    'CANCELLED': '已取消'
  }
  return statusMap[status] || status
}

/**
 * 验证手机号格式
 * @param phone 手机号
 * @returns 是否有效
 */
export const isValidPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 验证金额格式
 * @param amount 金额字符串
 * @returns 是否有效
 */
export const isValidAmount = (amount: string): boolean => {
  return /^\d+(\.\d{1,2})?$/.test(amount)
}

/**
 * 千分位格式化（不带小数）
 * @param num 数字
 * @returns 格式化后的字符串
 * @example formatThousand(1234567) => '1,234,567'
 */
export const formatThousand = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return '0'
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化日期显示（简化版本）
 * 【2026-01-16 预约模式升级】
 * @param dateStr 日期字符串
 * @param showTime 是否显示时间
 * @returns 格式化后的日期字符串
 * @example formatDate('2026-01-16') => '2026-01-16'
 * @example formatDate('2026-01-16T10:30:00', true) => '2026-01-16 10:30'
 */
export const formatDate = (dateStr: string | Date | null | undefined, showTime: boolean = false): string => {
  if (!dateStr) return '-'

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return '-'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  if (!showTime) {
    return `${year}-${month}-${day}`
  }

  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
