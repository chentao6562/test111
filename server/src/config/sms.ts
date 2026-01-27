/**
 * 阿里云短信服务配置
 */
export const smsConfig = {
  // 是否启用真实短信发送
  enabled: process.env.SMS_ENABLED === 'true',

  // 阿里云 AccessKey
  accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',

  // 短信签名
  signName: process.env.SMS_SIGN_NAME || '台风创意文化',

  // 短信模板编号（支持多场景模板）
  templateCodes: {
    LOGIN: process.env.SMS_TEMPLATE_CODE_LOGIN || '',
    REGISTER: process.env.SMS_TEMPLATE_CODE_REGISTER || '',
    RESET_PASSWORD: process.env.SMS_TEMPLATE_CODE_LOGIN || '', // 重置密码使用登录模板
    // 【2026-01-16】预约通知模板
    RESERVATION_CONFIRMED: process.env.SMS_TEMPLATE_CODE_RESERVATION || '',
    RESERVATION_REMINDER: process.env.SMS_TEMPLATE_CODE_REMINDER || '',
    // 【2026-01-17】提货码通知模板
    PICKUP_CODE: process.env.SMS_TEMPLATE_CODE_PICKUP || '',
    // 【2026-01-23】大转盘助力验证码（复用登录模板）
    SPIN_HELP: process.env.SMS_TEMPLATE_CODE_SPIN_HELP || process.env.SMS_TEMPLATE_CODE_LOGIN || '',
    // 【2026-01-24】砍价助力验证码（复用登录模板）
    BARGAIN_HELP: process.env.SMS_TEMPLATE_CODE_BARGAIN_HELP || process.env.SMS_TEMPLATE_CODE_LOGIN || '',
  },

  // 兼容旧配置（默认使用登录模板）
  templateCode: process.env.SMS_TEMPLATE_CODE_LOGIN || process.env.SMS_TEMPLATE_CODE || '',

  // 测试验证码（SMS_ENABLED=false时使用）
  testCode: process.env.SMS_TEST_CODE || '123456',

  // 限制配置
  sendInterval: parseInt(process.env.SMS_SEND_INTERVAL || '60'),      // 发送间隔（秒）
  hourlyLimit: parseInt(process.env.SMS_HOURLY_LIMIT || '5'),         // 单用户每小时发送限制
  dailyLimit: parseInt(process.env.SMS_DAILY_LIMIT || '20'),          // 单用户每日发送限制
  dailyGlobalLimit: parseInt(process.env.SMS_DAILY_GLOBAL_LIMIT || '5000'), // 全局每日发送限制
  codeExpiry: parseInt(process.env.SMS_CODE_EXPIRY || '300'),         // 验证码有效期（秒）
  maxAttempts: parseInt(process.env.SMS_MAX_ATTEMPTS || '5'),         // 最大验证尝试次数
};

/**
 * 根据场景获取模板CODE
 */
export function getTemplateCode(type: string): string {
  const upperType = type.toUpperCase();
  if (upperType in smsConfig.templateCodes) {
    return smsConfig.templateCodes[upperType as keyof typeof smsConfig.templateCodes];
  }
  return smsConfig.templateCode;
}
