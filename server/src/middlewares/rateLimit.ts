/**
 * 速率限制中间件
 * 【P1-12修复】防止暴力破解和API滥用
 * 【2026-01-22 高并发优化】使用LRU缓存防止内存溢出
 */

import { Request, Response, NextFunction } from 'express';

// 请求记录接口
interface RequestRecord {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

// LRU缓存配置
const MAX_IPS = 10000;           // 最多存储10000个IP
const MAX_PATHS_PER_IP = 50;     // 每个IP最多存储50个路径
const RECORD_TTL = 3600000;      // 记录存活1小时

// 存储请求记录（IP -> 路径 -> 记录）
const requestStore: Map<string, Map<string, RequestRecord>> = new Map();

// IP访问时间记录（用于LRU淘汰）
const ipAccessTime: Map<string, number> = new Map();

// 监控统计
let totalRecords = 0;
let evictedCount = 0;

/**
 * LRU淘汰策略：当IP数量超过上限时，淘汰最久未访问的IP
 */
function evictLRU(): void {
  if (requestStore.size <= MAX_IPS) return;

  // 找出最久未访问的IP
  let oldestIp = '';
  let oldestTime = Date.now();

  for (const [ip, time] of ipAccessTime.entries()) {
    if (time < oldestTime) {
      oldestTime = time;
      oldestIp = ip;
    }
  }

  if (oldestIp) {
    const pathMap = requestStore.get(oldestIp);
    if (pathMap) {
      totalRecords -= pathMap.size;
    }
    requestStore.delete(oldestIp);
    ipAccessTime.delete(oldestIp);
    evictedCount++;
  }
}

// 清理过期记录的定时器（每1分钟清理一次，更频繁以控制内存）
setInterval(() => {
  const now = Date.now();
  let cleanedRecords = 0;
  let cleanedIps = 0;

  for (const [ip, pathMap] of requestStore.entries()) {
    for (const [path, record] of pathMap.entries()) {
      // 清理超过TTL的记录
      if (now - record.firstRequest > RECORD_TTL) {
        pathMap.delete(path);
        cleanedRecords++;
        totalRecords--;
      }
    }
    if (pathMap.size === 0) {
      requestStore.delete(ip);
      ipAccessTime.delete(ip);
      cleanedIps++;
    }
  }

  // 每小时输出一次统计信息
  if (now % 3600000 < 60000) {
    console.log(`[RateLimit] 统计: ${requestStore.size} IPs, ${totalRecords} 记录, 已清理 ${cleanedRecords} 记录, 已淘汰 ${evictedCount} IPs`);
  }
}, 60000);

/**
 * 获取速率限制统计信息（用于监控）
 */
export function getRateLimitStats(): {
  totalIps: number;
  totalRecords: number;
  evictedCount: number;
  maxIps: number;
} {
  return {
    totalIps: requestStore.size,
    totalRecords,
    evictedCount,
    maxIps: MAX_IPS,
  };
}

// 获取客户端IP
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// 获取或创建请求记录（带LRU淘汰）
function getOrCreateRecord(ip: string, path: string): RequestRecord {
  const now = Date.now();

  // 更新IP访问时间
  ipAccessTime.set(ip, now);

  if (!requestStore.has(ip)) {
    // 检查是否需要LRU淘汰
    if (requestStore.size >= MAX_IPS) {
      evictLRU();
    }
    requestStore.set(ip, new Map());
  }

  const pathMap = requestStore.get(ip)!;

  // 限制每个IP的路径数量
  if (!pathMap.has(path)) {
    if (pathMap.size >= MAX_PATHS_PER_IP) {
      // 淘汰最旧的路径
      let oldestPath = '';
      let oldestTime = now;
      for (const [p, r] of pathMap.entries()) {
        if (r.firstRequest < oldestTime) {
          oldestTime = r.firstRequest;
          oldestPath = p;
        }
      }
      if (oldestPath) {
        pathMap.delete(oldestPath);
        totalRecords--;
      }
    }

    pathMap.set(path, {
      count: 0,
      firstRequest: now,
      blocked: false,
    });
    totalRecords++;
  }

  return pathMap.get(path)!;
}

/**
 * 创建速率限制中间件
 * @param options 配置选项
 */
export function createRateLimiter(options: {
  windowMs: number;       // 时间窗口（毫秒）
  maxRequests: number;    // 窗口内最大请求数
  blockDuration?: number; // 超限后封禁时长（毫秒），默认等于windowMs
  message?: string;       // 超限提示消息
  keyGenerator?: (req: Request) => string; // 自定义key生成器
}) {
  const {
    windowMs,
    maxRequests,
    blockDuration = windowMs,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.path,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const key = keyGenerator(req);
    const record = getOrCreateRecord(ip, key);
    const now = Date.now();

    // 检查是否在封禁期
    if (record.blocked && record.blockedUntil && now < record.blockedUntil) {
      const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return res.status(429).json({
        code: 429,
        message: `${message}，请${remainingSeconds}秒后重试`,
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 重置封禁状态（如果封禁已过期）
    if (record.blocked && record.blockedUntil && now >= record.blockedUntil) {
      record.blocked = false;
      record.count = 0;
      record.firstRequest = now;
    }

    // 检查时间窗口是否已过
    if (now - record.firstRequest > windowMs) {
      record.count = 0;
      record.firstRequest = now;
    }

    // 增加计数
    record.count++;

    // 检查是否超限
    if (record.count > maxRequests) {
      record.blocked = true;
      record.blockedUntil = now + blockDuration;

      console.log(`[RateLimit] IP ${ip} 访问 ${key} 超限，已封禁${blockDuration / 1000}秒`);

      return res.status(429).json({
        code: 429,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.firstRequest + windowMs) / 1000).toString());

    next();
  };
}

// 预定义的速率限制器

/**
 * 登录接口速率限制
 * 每分钟最多5次尝试，超限后封禁10分钟
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 5,         // 最多5次
  blockDuration: 600000,  // 封禁10分钟
  message: '登录尝试次数过多',
});

/**
 * 验证码发送接口速率限制
 * 每分钟最多3次（允许重试，实际发送由数据库层控制60秒间隔）
 * 【2026-01-25修复】使用 IP+手机号 作为限流key，避免全局共享计数器
 */
export const smsRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 3,         // 最多3次（宽松一些，防止误触）
  blockDuration: 60000,   // 封禁1分钟
  message: '请求过于频繁，请稍后再试',
  keyGenerator: (req) => {
    // 从请求体获取手机号，与路径组合作为限流key
    // 这样不同手机号的请求不会相互影响
    const phone = req.body?.phone || 'unknown';
    return `sms:${req.path}:${phone}`;
  },
});

/**
 * 提货码验证接口速率限制
 * 每分钟最多10次尝试，超限后封禁5分钟
 */
export const pickupCodeRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 10,        // 最多10次
  blockDuration: 300000,  // 封禁5分钟
  message: '提货码验证次数过多',
});

/**
 * 通用API速率限制
 * 每分钟最多100次请求
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 100,       // 最多100次
  message: '请求过于频繁',
});

/**
 * 订单创建速率限制
 * 每分钟最多10次下单，防止恶意刷单
 */
export const orderRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 10,        // 最多10次
  blockDuration: 300000,  // 封禁5分钟
  message: '下单过于频繁，请稍后再试',
});

/**
 * 提现申请速率限制
 * 每小时最多5次提现申请
 */
export const withdrawRateLimiter = createRateLimiter({
  windowMs: 3600000,      // 1小时
  maxRequests: 5,         // 最多5次
  blockDuration: 3600000, // 封禁1小时
  message: '提现申请过于频繁，请稍后再试',
});

/**
 * 上传接口速率限制
 * 每分钟最多20次上传
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 20,        // 最多20次
  blockDuration: 300000,  // 封禁5分钟
  message: '上传过于频繁，请稍后再试',
});

/**
 * 管理后台速率限制
 * 每分钟最多200次请求（管理员操作更频繁）
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 60000,        // 1分钟
  maxRequests: 200,       // 最多200次
  message: '请求过于频繁',
});
