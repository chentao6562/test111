import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 【2026-01-17】获取JWT密钥，生产环境强制要求设置
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  // 生产环境必须设置JWT_SECRET
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 错误: 生产环境必须设置JWT_SECRET环境变量');
    throw new Error('生产环境必须设置JWT_SECRET环境变量');
  }
  // 开发/测试环境使用默认值，但打印警告
  console.warn('⚠️ 警告: 未设置JWT_SECRET，使用开发模式默认值（仅限本地开发）');
  return 'dev-jwt-secret-for-local-only';
};

export const config = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT配置
  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 短信配置
  sms: {
    testMode: process.env.SMS_TEST_MODE === 'true',
    testCode: process.env.SMS_TEST_CODE || '123456',
  },

  // 数据库配置（Prisma自动读取DATABASE_URL）
  database: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
