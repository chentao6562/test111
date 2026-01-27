/**
 * 通用验证工具函数
 * 用于H5代理商端的表单验证和数据校验
 */

/**
 * 验证手机号
 * @param phone 手机号
 * @returns 验证结果
 */
export const validatePhone = (phone: string): { valid: boolean; message: string } => {
  if (!phone) {
    return { valid: false, message: '请输入手机号' }
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { valid: false, message: '请输入正确的手机号' }
  }
  return { valid: true, message: '' }
}

/**
 * 验证验证码
 * @param code 验证码
 * @returns 验证结果
 */
export const validateCode = (code: string): { valid: boolean; message: string } => {
  if (!code) {
    return { valid: false, message: '请输入验证码' }
  }
  if (!/^\d{6}$/.test(code)) {
    return { valid: false, message: '验证码为6位数字' }
  }
  return { valid: true, message: '' }
}

/**
 * 验证邀请码
 * @param inviteCode 邀请码
 * @param required 是否必填
 * @returns 验证结果
 */
export const validateInviteCode = (
  inviteCode: string,
  required: boolean = false
): { valid: boolean; message: string } => {
  if (!inviteCode) {
    if (required) {
      return { valid: false, message: '请输入邀请码' }
    }
    return { valid: true, message: '' }
  }
  if (inviteCode.length < 6 || inviteCode.length > 12) {
    return { valid: false, message: '邀请码长度为6-12位' }
  }
  return { valid: true, message: '' }
}

/**
 * 验证姓名
 * @param name 姓名
 * @returns 验证结果
 */
export const validateName = (name: string): { valid: boolean; message: string } => {
  if (!name) {
    return { valid: false, message: '请输入姓名' }
  }
  if (name.length < 2 || name.length > 20) {
    return { valid: false, message: '姓名长度为2-20个字符' }
  }
  return { valid: true, message: '' }
}

/**
 * 验证提现金额
 * @param amount 金额字符串
 * @param balance 可用余额
 * @param minAmount 最低提现金额，默认100
 * @returns 验证结果
 */
export const validateWithdrawAmount = (
  amount: string,
  balance: number,
  minAmount: number = 100
): { valid: boolean; message: string } => {
  if (!amount) {
    return { valid: false, message: '请输入提现金额' }
  }

  const num = parseFloat(amount)

  if (isNaN(num) || num <= 0) {
    return { valid: false, message: '请输入有效的金额' }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return { valid: false, message: '金额最多保留两位小数' }
  }

  if (num < minAmount) {
    return { valid: false, message: `最低提现金额为${minAmount}元` }
  }

  if (num > balance) {
    return { valid: false, message: '提现金额不能超过可用余额' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证商品数量
 * @param quantity 数量
 * @param stock 库存
 * @param max 最大数量，默认999
 * @returns 验证结果
 */
export const validateQuantity = (
  quantity: number,
  stock: number,
  max: number = 999
): { valid: boolean; message: string } => {
  if (quantity < 1) {
    return { valid: false, message: '数量不能小于1' }
  }

  if (quantity > max) {
    return { valid: false, message: `数量不能超过${max}` }
  }

  if (quantity > stock) {
    return { valid: false, message: `库存不足，仅剩${stock}件` }
  }

  return { valid: true, message: '' }
}

/**
 * 验证备注内容
 * @param remark 备注
 * @param maxLength 最大长度，默认200
 * @returns 验证结果
 */
export const validateRemark = (
  remark: string,
  maxLength: number = 200
): { valid: boolean; message: string } => {
  if (remark.length > maxLength) {
    return { valid: false, message: `备注不能超过${maxLength}个字符` }
  }
  return { valid: true, message: '' }
}

/**
 * 验证地址
 * @param address 地址
 * @param required 是否必填
 * @returns 验证结果
 */
export const validateAddress = (
  address: string,
  required: boolean = false
): { valid: boolean; message: string } => {
  if (!address) {
    if (required) {
      return { valid: false, message: '请输入地址' }
    }
    return { valid: true, message: '' }
  }

  if (address.length < 5) {
    return { valid: false, message: '地址长度不能少于5个字符' }
  }

  if (address.length > 200) {
    return { valid: false, message: '地址长度不能超过200个字符' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证日期（提货日期等）
 * @param date 日期字符串（YYYY-MM-DD格式）
 * @param minDate 最小日期
 * @param maxDate 最大日期
 * @returns 验证结果
 */
export const validateDate = (
  date: string,
  minDate?: string,
  maxDate?: string
): { valid: boolean; message: string } => {
  if (!date) {
    return { valid: false, message: '请选择日期' }
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return { valid: false, message: '日期格式错误' }
  }

  if (minDate) {
    const minDateObj = new Date(minDate)
    if (dateObj < minDateObj) {
      return { valid: false, message: '日期不能早于最小日期' }
    }
  }

  if (maxDate) {
    const maxDateObj = new Date(maxDate)
    if (dateObj > maxDateObj) {
      return { valid: false, message: '日期不能晚于最大日期' }
    }
  }

  return { valid: true, message: '' }
}
