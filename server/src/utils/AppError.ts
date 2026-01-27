/**
 * 应用错误类 - 统一的错误处理
 *
 * 使用方式:
 * throw new AppError('用户不存在', 'USER_NOT_FOUND', 404);
 * throw Errors.NOT_FOUND('用户');
 * throw Errors.VALIDATION('手机号格式错误');
 */

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true; // 用于区分可预期的业务错误和程序错误
    this.timestamp = new Date();

    // 维护正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为JSON格式（用于API响应）
   */
  toJSON() {
    return {
      code: this.statusCode,
      message: this.message,
      errorCode: this.code,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 预定义错误工厂函数
 *
 * 使用方式:
 * throw Errors.NOT_FOUND('订单');
 * throw Errors.UNAUTHORIZED();
 * throw Errors.VALIDATION('请输入正确的手机号');
 */
export const Errors = {
  // 404 - 资源不存在
  NOT_FOUND: (resource: string) =>
    new AppError(`${resource}不存在`, 'NOT_FOUND', 404),

  // 401 - 未登录
  UNAUTHORIZED: (message: string = '请先登录') =>
    new AppError(message, 'UNAUTHORIZED', 401),

  // 403 - 无权限
  FORBIDDEN: (message: string = '没有权限执行此操作') =>
    new AppError(message, 'FORBIDDEN', 403),

  // 422 - 验证错误（参数格式/内容错误）
  VALIDATION: (message: string) =>
    new AppError(message, 'VALIDATION_ERROR', 422),

  // 400 - 业务逻辑错误
  BUSINESS: (message: string, code: string = 'BUSINESS_ERROR') =>
    new AppError(message, code, 400),

  // 409 - 资源冲突（如重复创建）
  CONFLICT: (message: string) =>
    new AppError(message, 'CONFLICT', 409),

  // 429 - 请求过于频繁
  TOO_MANY_REQUESTS: (message: string = '请求过于频繁，请稍后再试') =>
    new AppError(message, 'TOO_MANY_REQUESTS', 429),

  // 500 - 内部服务器错误
  INTERNAL: (message: string = '服务器内部错误') =>
    new AppError(message, 'INTERNAL_ERROR', 500),

  // 503 - 服务不可用
  SERVICE_UNAVAILABLE: (message: string = '服务暂时不可用') =>
    new AppError(message, 'SERVICE_UNAVAILABLE', 503),
};

/**
 * 订单相关错误
 */
export const OrderErrors = {
  NOT_FOUND: () => Errors.NOT_FOUND('订单'),
  INVALID_STATUS: (currentStatus: string, expectedStatus: string) =>
    new AppError(
      `订单状态不正确，当前状态: ${currentStatus}，期望状态: ${expectedStatus}`,
      'ORDER_INVALID_STATUS',
      400
    ),
  ALREADY_CANCELLED: () =>
    new AppError('订单已取消', 'ORDER_ALREADY_CANCELLED', 400),
  ALREADY_COMPLETED: () =>
    new AppError('订单已完成', 'ORDER_ALREADY_COMPLETED', 400),
  INSUFFICIENT_STOCK: (productName: string) =>
    new AppError(`商品"${productName}"库存不足`, 'INSUFFICIENT_STOCK', 400),
  INVALID_PICKUP_CODE: () =>
    new AppError('提货码不正确', 'INVALID_PICKUP_CODE', 400),
};

/**
 * 代理商相关错误
 */
export const AgentErrors = {
  NOT_FOUND: () => Errors.NOT_FOUND('代理商'),
  ALREADY_EXISTS: (phone: string) =>
    new AppError(`手机号 ${phone} 已注册`, 'AGENT_ALREADY_EXISTS', 409),
  ACCOUNT_LOCKED: (unlockAt: Date) =>
    new AppError(
      `账户已锁定，请在 ${unlockAt.toLocaleString()} 后重试`,
      'ACCOUNT_LOCKED',
      403
    ),
  INVALID_INVITE_CODE: () =>
    new AppError('邀请码无效或已过期', 'INVALID_INVITE_CODE', 400),
};

/**
 * 认证相关错误
 */
export const AuthErrors = {
  INVALID_CREDENTIALS: () =>
    new AppError('用户名或密码错误', 'INVALID_CREDENTIALS', 401),
  INVALID_CODE: () =>
    new AppError('验证码错误或已过期', 'INVALID_CODE', 400),
  CODE_SEND_LIMIT: (waitSeconds: number) =>
    new AppError(`请${waitSeconds}秒后再试`, 'CODE_SEND_LIMIT', 429),
  TOKEN_EXPIRED: () =>
    new AppError('登录已过期，请重新登录', 'TOKEN_EXPIRED', 401),
  TOKEN_INVALID: () =>
    new AppError('无效的登录凭证', 'TOKEN_INVALID', 401),
};

/**
 * 判断是否为AppError实例
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 包装未知错误为AppError
 */
export function wrapError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500);
  }

  return new AppError('未知错误', 'UNKNOWN_ERROR', 500);
}

export default {
  AppError,
  Errors,
  OrderErrors,
  AgentErrors,
  AuthErrors,
  isAppError,
  wrapError,
};
