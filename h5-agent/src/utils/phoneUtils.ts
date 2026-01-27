/**
 * 手机号工具函数
 * @description 统一处理手机号掩码和匹配逻辑
 * @since 2026-01-28
 */

/**
 * 对手机号进行掩码处理
 * @param phone 原始手机号（11位）
 * @returns 掩码后的手机号，格式：138****8001
 */
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 比较两个手机号是否匹配（支持掩码格式）
 * @param input 用户输入的手机号（原始格式）
 * @param masked 后端返回的掩码手机号
 * @returns 是否匹配
 *
 * 支持的匹配场景：
 * 1. input=13800138001, masked=138****8001 -> true
 * 2. input=13800138001, masked=13800138001 -> true (未脱敏)
 * 3. input=138****8001, masked=138****8001 -> true (都是脱敏)
 */
export const matchMaskedPhone = (input: string, masked: string): boolean => {
  if (!input || !masked) return false

  // 情况1：完全匹配
  if (input === masked) return true

  // 情况2：输入是原始手机号，后端是掩码格式
  const inputMasked = maskPhone(input)
  if (inputMasked === masked) return true

  // 情况3：提取非*字符进行模糊匹配（兼容不同掩码格式）
  // 例如：138****8001 和 138***8001 都应该匹配 13800138001
  const inputDigits = input.replace(/\D/g, '')
  const maskedDigits = masked.replace(/\D/g, '')

  if (inputDigits.length === 11 && maskedDigits.length === 7) {
    // 后端掩码格式：前3位+后4位
    return inputDigits.startsWith(maskedDigits.slice(0, 3)) &&
           inputDigits.endsWith(maskedDigits.slice(3))
  }

  return false
}

/**
 * 检查手机号格式是否有效
 * @param phone 手机号
 * @returns 是否为有效的11位手机号
 */
export const isValidPhone = (phone: string): boolean => {
  return /^1\d{10}$/.test(phone)
}
