/**
 * 精确数学工具 - 解决JavaScript浮点数精度问题
 *
 * 使用整数运算（以分为单位）来避免浮点数计算误差
 * 例如: 0.1 + 0.2 = 0.30000000000000004 (错误)
 *       使用本工具: add(0.1, 0.2) = 0.3 (正确)
 */

/**
 * 保留指定小数位
 * @param num 数字
 * @param precision 小数位数（默认2位）
 * @returns 四舍五入后的数字
 */
export const toFixed = (num: number, precision: number = 2): number => {
  const multiplier = Math.pow(10, precision)
  return Math.round(num * multiplier) / multiplier
}

/**
 * 精确加法
 * @param nums 要相加的数字数组
 * @returns 总和
 */
export const add = (...nums: number[]): number => {
  // 转换为整数（以分为单位）求和
  const sum = nums.reduce((acc, n) => {
    const cents = Math.round((n || 0) * 100)
    return acc + cents
  }, 0)
  return sum / 100
}

/**
 * 精确减法
 * @param a 被减数
 * @param b 减数
 * @returns 差
 */
export const subtract = (a: number, b: number): number => {
  const centsA = Math.round(a * 100)
  const centsB = Math.round(b * 100)
  return (centsA - centsB) / 100
}

/**
 * 精确乘法
 * @param a 乘数1
 * @param b 乘数2
 * @returns 积
 */
export const multiply = (a: number, b: number): number => {
  const centsA = Math.round(a * 100)
  const centsB = Math.round(b * 100)
  // 两个整数相乘，结果除以10000（因为都乘了100）
  return (centsA * centsB) / 10000
}

/**
 * 精确除法
 * @param a 被除数
 * @param b 除数
 * @returns 商
 */
export const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw new Error('除数不能为0')
  }
  const centsA = Math.round(a * 100)
  const centsB = Math.round(b * 100)
  return centsA / centsB
}

/**
 * 计算商品总价（单价 × 数量）
 * @param price 单价
 * @param quantity 数量
 * @returns 总价
 */
export const calculateItemTotal = (price: number, quantity: number): number => {
  return multiply(price, quantity)
}

/**
 * 计算订单总金额（商品金额 + 移库费）
 * @param itemsTotal 商品总金额
 * @param transferFee 移库费
 * @returns 订单总金额
 */
export const calculateOrderTotal = (itemsTotal: number, transferFee: number = 0): number => {
  return add(itemsTotal, transferFee)
}

/**
 * 计算待付金额（总金额 - 已付金额）
 * @param totalAmount 总金额
 * @param paidAmount 已付金额
 * @returns 待付金额
 */
export const calculateRemaining = (totalAmount: number, paidAmount: number): number => {
  return subtract(totalAmount, paidAmount)
}

/**
 * 格式化为货币字符串（带千分位）
 * @param amount 金额
 * @param showSymbol 是否显示货币符号
 * @returns 格式化后的字符串
 */
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const fixed = toFixed(amount, 2)
  const parts = fixed.toString().split('.')
  const intPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimalPart = parts[1] || '00'
  const formatted = `${intPart}.${decimalPart}`
  return showSymbol ? `¥${formatted}` : formatted
}
