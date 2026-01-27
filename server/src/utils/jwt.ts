import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

// Token payload 类型定义
export interface TokenPayload {
  id: number;
  type: 'agent' | 'staff' | 'admin';
  role?: string;
  warehouseId?: number;  // 库管员所属仓库ID【2026-01-13多仓库支持】
  agentType?: string;    // 代理商类型【2026-01-19】LEVEL1/LEVEL2/WHOLESALE
}

// 解码后的Token
export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * 生成JWT Token
 * @param payload Token载荷
 * @param expiresIn 过期时间，默认7天
 */
export function generateToken(
  payload: TokenPayload,
  expiresIn: string = config.jwt.expiresIn
): string {
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * 验证JWT Token
 * @param token JWT字符串
 * @returns 解码后的payload，验证失败返回null
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 从Authorization header提取token
 * @param authHeader Authorization header值
 * @returns token字符串或null
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 也支持直接传token
  return authHeader;
}

export default {
  generateToken,
  verifyToken,
  extractToken,
};
