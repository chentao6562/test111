/**
 * 全局错误处理中间件
 *
 * 统一处理所有未捕获的错误，返回标准化的错误响应
 */
import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, wrapError } from '../utils/AppError';

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number;
  message: string;
  errorCode?: string;
  data: null;
  timestamp: string;
}

/**
 * 全局错误处理中间件
 *
 * 使用方式：在 app.ts 中最后注册
 * app.use(errorHandler);
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 转换为AppError
  const appError = isAppError(err) ? err : wrapError(err);

  // 记录错误日志
  if (appError.statusCode >= 500) {
    console.error('[ErrorHandler] Server Error:', {
      code: appError.code,
      message: appError.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      user: (req as any).user?.id,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[ErrorHandler] Client Error:', {
      code: appError.code,
      message: appError.message,
      path: req.path,
    });
  }

  // 构建响应
  const response: ErrorResponse = {
    code: appError.statusCode,
    message: appError.message,
    errorCode: appError.code,
    data: null,
    timestamp: new Date().toISOString(),
  };

  // 生产环境隐藏内部错误详情
  if (process.env.NODE_ENV === 'production' && appError.statusCode >= 500) {
    response.message = '服务器内部错误，请稍后重试';
  }

  res.status(appError.statusCode).json(response);
}

/**
 * 404 处理中间件
 *
 * 放在所有路由之后，处理未匹配的请求
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response: ErrorResponse = {
    code: 404,
    message: '接口不存在',
    errorCode: 'NOT_FOUND',
    data: null,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

/**
 * 异步路由包装器
 *
 * 自动捕获async函数中的错误并传递给错误处理中间件
 *
 * 使用方式:
 * router.get('/example', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json({ data });
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
