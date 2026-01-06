import { registerAs } from '@nestjs/config';

/**
 * JWT配置
 */
export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'mengqing-firework-jwt-secret-key-2024',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));
