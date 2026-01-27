/**
 * 格式化函数Hook
 * 统一所有页面的格式化逻辑
 * Phase 4 Task 4.1
 */

/**
 * 格式化金额
 * @param amount 金额（字符串或数字）
 * @param prefix 前缀，默认 '¥'
 * @returns 格式化后的金额字符串
 */
export function formatMoney(amount: string | number, prefix = '¥'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${prefix} 0.00`
  return `${prefix} ${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * 格式化金额（无前缀）
 * @param amount 金额
 * @returns 格式化后的数字字符串
 */
export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 格式化日期
 * @param dateStr 日期字符串
 * @returns YYYY-MM-DD 格式
 */
export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

/**
 * 格式化时间
 * @param dateStr 日期字符串
 * @returns HH:mm 格式
 */
export function formatTime(dateStr: string | Date): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 格式化日期时间
 * @param dateStr 日期字符串
 * @returns YYYY-MM-DD HH:mm 格式
 */
export function formatDateTime(dateStr: string | Date): string {
  if (!dateStr) return '-'
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

/**
 * 格式化手机号（带脱敏）
 * @param phone 手机号
 * @param mask 是否脱敏
 * @returns 格式化后的手机号
 */
export function formatPhone(phone: string, mask = false): string {
  if (!phone) return '-'
  if (phone.length !== 11) return phone
  if (mask) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`
  }
  return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
}

/**
 * 格式化百分比
 * @param value 数值
 * @param decimals 小数位数
 * @returns 百分比字符串
 */
export function formatPercent(value: number, decimals = 0): string {
  if (isNaN(value)) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 格式化数量
 * @param num 数量
 * @returns 带千分位的数字
 */
export function formatNumber(num: number): string {
  if (isNaN(num)) return '0'
  return num.toLocaleString('zh-CN')
}

/**
 * 组合Hook - 返回所有格式化函数
 */
export function useFormatter() {
  return {
    formatMoney,
    formatAmount,
    formatDate,
    formatTime,
    formatDateTime,
    formatPhone,
    formatPercent,
    formatNumber,
  }
}
