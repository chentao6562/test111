import { Response } from 'express';

// 统一响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 成功响应
 * @param res Express Response对象
 * @param data 响应数据
 * @param message 成功消息
 */
export function success<T>(
  res: Response,
  data: T,
  message: string = 'success'
): void {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.json(response);
}

/**
 * 错误响应
 * @param res Express Response对象
 * @param message 错误消息
 * @param code 错误码（HTTP状态码，默认400）
 * @param errorCode 业务错误码（默认等于HTTP状态码）
 */
export function error(
  res: Response,
  message: string,
  code: number = 400,
  errorCode?: number
): void {
  const response: ApiResponse<null> = {
    code: errorCode ?? code,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
  res.status(code).json(response);
}

/**
 * 未授权响应（401）
 */
export function unauthorized(res: Response, message: string = '请先登录'): void {
  error(res, message, 401);
}

/**
 * 禁止访问响应（403）
 */
export function forbidden(res: Response, message: string = '没有权限'): void {
  error(res, message, 403);
}

/**
 * 未找到响应（404）
 */
export function notFound(res: Response, message: string = '资源不存在'): void {
  error(res, message, 404);
}

/**
 * 服务器错误响应（500）
 */
export function serverError(
  res: Response,
  message: string = '服务器内部错误'
): void {
  error(res, message, 500);
}

/**
 * 参数错误响应（422）
 */
export function validationError(
  res: Response,
  message: string = '参数错误'
): void {
  error(res, message, 422);
}

/**
 * 错误请求响应（400）
 */
export function badRequest(
  res: Response,
  message: string = '请求参数错误'
): void {
  error(res, message, 400);
}

export default {
  success,
  error,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  validationError,
  badRequest,
};
