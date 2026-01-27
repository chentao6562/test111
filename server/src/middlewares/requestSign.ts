/**
 * 请求签名防重放中间件
 * 【Phase 4】防止关键API请求被恶意重放
 *
 * 机制：
 * 1. 客户端在请求头中发送 timestamp 和 nonce
 * 2. 服务端验证 timestamp 是否在有效期内（默认5分钟）
 * 3. 服务端验证 nonce 是否已使用过
 * 4. 可选：验证签名 signature = HMAC-SHA256(timestamp + nonce + body, secret)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Nonce存储（用于防重放）
interface NonceRecord {
  timestamp: number;
  used: boolean;
}

const nonceStore: Map<string, NonceRecord> = new Map();

// 清理过期nonce的定时器（每10分钟清理一次）
setInterval(() => {
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10分钟后可以清理

  for (const [nonce, record] of nonceStore.entries()) {
    if (now - record.timestamp > expiryTime) {
      nonceStore.delete(nonce);
    }
  }
}, 10 * 60 * 1000);

// 签名密钥（生产环境应从环境变量读取）
const SIGN_SECRET = process.env.REQUEST_SIGN_SECRET || 'firework-request-sign-secret-2026';

/**
 * 验证请求时间戳是否在有效期内
 */
function isTimestampValid(timestamp: number, maxAgeMs: number): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= maxAgeMs;
}

/**
 * 验证nonce是否已使用
 */
function isNonceValid(nonce: string): boolean {
  if (nonceStore.has(nonce)) {
    return false; // nonce已使用
  }
  // 记录nonce
  nonceStore.set(nonce, {
    timestamp: Date.now(),
    used: true,
  });
  return true;
}

/**
 * 生成签名
 */
function generateSignature(timestamp: string, nonce: string, body: string): string {
  const data = `${timestamp}${nonce}${body}`;
  return crypto.createHmac('sha256', SIGN_SECRET).update(data).digest('hex');
}

/**
 * 验证签名
 */
function isSignatureValid(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  const expected = generateSignature(timestamp, nonce, body);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

/**
 * 请求签名防重放中间件配置
 */
interface RequestSignOptions {
  maxAgeMs?: number;           // 时间戳最大有效期，默认5分钟
  requireSignature?: boolean;  // 是否要求签名验证，默认false（宽松模式）
  skipMethods?: string[];      // 跳过验证的HTTP方法，默认['GET', 'HEAD', 'OPTIONS']
}

/**
 * 创建请求签名防重放中间件
 */
export function createRequestSignMiddleware(options: RequestSignOptions = {}) {
  const {
    maxAgeMs = 5 * 60 * 1000,  // 默认5分钟
    requireSignature = false,
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 跳过指定的HTTP方法
    if (skipMethods.includes(req.method)) {
      return next();
    }

    // 从请求头获取签名相关信息
    const timestamp = req.headers['x-timestamp'] as string;
    const nonce = req.headers['x-nonce'] as string;
    const signature = req.headers['x-signature'] as string;

    // 如果没有提供timestamp和nonce，根据配置决定是否放行
    if (!timestamp || !nonce) {
      // 宽松模式：允许没有签名的请求通过（向后兼容）
      if (!requireSignature) {
        return next();
      }
      return res.status(400).json({
        code: 400,
        message: '缺少请求签名参数',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 验证时间戳格式
    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return res.status(400).json({
        code: 400,
        message: '无效的时间戳格式',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 验证时间戳是否在有效期内
    if (!isTimestampValid(timestampNum, maxAgeMs)) {
      return res.status(400).json({
        code: 400,
        message: '请求已过期',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 验证nonce是否已使用（防重放）
    if (!isNonceValid(nonce)) {
      return res.status(400).json({
        code: 400,
        message: '请求不可重复提交',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 如果要求签名验证，则验证签名
    if (requireSignature && signature) {
      const bodyStr = JSON.stringify(req.body || {});
      try {
        if (!isSignatureValid(timestamp, nonce, bodyStr, signature)) {
          return res.status(400).json({
            code: 400,
            message: '请求签名无效',
            data: null,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        return res.status(400).json({
          code: 400,
          message: '签名验证失败',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
    }

    next();
  };
}

/**
 * 关键操作防重放中间件（宽松模式）
 * 用于支付、提现等关键操作
 * 宽松模式：允许没有签名头的请求通过（向后兼容）
 */
export const criticalOperationGuard = createRequestSignMiddleware({
  maxAgeMs: 5 * 60 * 1000,  // 5分钟有效期
  requireSignature: false,   // 不强制要求签名（向后兼容）
});

/**
 * 严格签名验证中间件
 * 用于最敏感的操作（如需要）
 */
export const strictSignatureGuard = createRequestSignMiddleware({
  maxAgeMs: 5 * 60 * 1000,
  requireSignature: true,
});

/**
 * 导出签名生成函数供客户端测试使用
 */
export { generateSignature };
