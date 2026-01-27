/**
 * 控制器辅助函数
 *
 * 提供通用的参数解析、验证和用户身份获取功能
 * 消除控制器中的重复代码
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Errors } from './AppError';

/**
 * 异步处理器包装函数
 * 自动捕获异步函数中的错误并传递给全局错误处理中间件
 *
 * @param fn 异步控制器函数
 * @returns 包装后的Express中间件
 *
 * @example
 * export const getOrders = asyncHandler(async (req, res) => {
 *   const orders = await orderService.list();
 *   res.json(orders);
 * });
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 用户信息接口
 */
export interface AuthenticatedUser {
  id: number;
  type: 'agent' | 'staff' | 'admin';
  role?: string;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

/**
 * 解析分页参数
 *
 * @param query 请求的query参数
 * @param options 分页选项
 * @returns 标准化的分页参数
 *
 * @example
 * const { page, pageSize, skip } = parsePagination(req.query);
 * const items = await prisma.order.findMany({ skip, take: pageSize });
 */
export function parsePagination(
  query: { page?: string; pageSize?: string },
  options: PaginationOptions = {}
): PaginationParams {
  const {
    defaultPage = 1,
    defaultPageSize = 10,
    maxPageSize = 100,
  } = options;

  const page = Math.max(1, parseInt(query.page || '', 10) || defaultPage);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(query.pageSize || '', 10) || defaultPageSize)
  );
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

/**
 * 解析ID参数
 *
 * @param param 路由参数值
 * @param paramName 参数名称（用于错误消息）
 * @returns 解析后的数字ID
 * @throws AppError 如果ID无效
 *
 * @example
 * const orderId = parseId(req.params.id, '订单ID');
 */
export function parseId(param: string, paramName: string = 'ID'): number {
  const id = parseInt(param, 10);
  if (isNaN(id) || id <= 0) {
    throw Errors.VALIDATION(`无效的${paramName}`);
  }
  return id;
}

/**
 * 安全解析ID参数（不抛出错误）
 *
 * @param param 路由参数值
 * @returns 解析后的数字ID，无效时返回null
 *
 * @example
 * const orderId = safeParseId(req.params.id);
 * if (orderId === null) {
 *   return validationError(res, '无效的订单ID');
 * }
 */
export function safeParseId(param: string): number | null {
  const id = parseInt(param, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

/**
 * 获取当前认证用户
 *
 * @param req Express请求对象
 * @returns 用户信息
 * @throws AppError 如果用户未登录
 *
 * @example
 * const user = requireUser(req);
 * console.log(user.id, user.type);
 */
export function requireUser(req: Request): AuthenticatedUser {
  const user = (req as any).user;
  if (!user?.id) {
    throw Errors.UNAUTHORIZED();
  }
  return user as AuthenticatedUser;
}

/**
 * 获取当前代理商ID
 *
 * @param req Express请求对象
 * @returns 代理商ID
 * @throws AppError 如果用户不是代理商
 *
 * @example
 * const agentId = requireAgentId(req);
 * const orders = await orderService.getAgentOrders(agentId);
 */
export function requireAgentId(req: Request): number {
  const user = requireUser(req);
  if (user.type !== 'agent') {
    throw Errors.FORBIDDEN('此操作仅限代理商');
  }
  return user.id;
}

/**
 * 获取当前员工ID（库管/货管）
 *
 * @param req Express请求对象
 * @param allowedRoles 允许的角色列表
 * @returns 员工ID
 * @throws AppError 如果用户不是员工或角色不符
 *
 * @example
 * const staffId = requireStaffId(req, ['WAREHOUSE']);
 */
export function requireStaffId(req: Request, allowedRoles?: string[]): number {
  const user = requireUser(req);
  if (user.type !== 'staff') {
    throw Errors.FORBIDDEN('此操作仅限员工');
  }
  if (allowedRoles && allowedRoles.length > 0 && user.role) {
    if (!allowedRoles.includes(user.role)) {
      throw Errors.FORBIDDEN(`此操作仅限 ${allowedRoles.join('/')} 角色`);
    }
  }
  return user.id;
}

/**
 * 获取当前管理员ID
 *
 * @param req Express请求对象
 * @returns 管理员ID
 * @throws AppError 如果用户不是管理员
 *
 * @example
 * const adminId = requireAdminId(req);
 */
export function requireAdminId(req: Request): number {
  const user = requireUser(req);
  if (user.type !== 'admin') {
    throw Errors.FORBIDDEN('此操作仅限管理员');
  }
  return user.id;
}

/**
 * 获取用户ID（不抛出错误）
 *
 * @param req Express请求对象
 * @returns 用户ID，未登录时返回null
 *
 * @example
 * const userId = getUserId(req);
 * if (!userId) {
 *   return error(res, '请先登录', 401);
 * }
 */
export function getUserId(req: Request): number | null {
  const user = (req as any).user;
  return user?.id ?? null;
}

/**
 * 验证状态值是否在允许的列表中
 *
 * @param status 状态值
 * @param validStatuses 有效状态列表
 * @param statusName 状态名称（用于错误消息）
 * @returns 验证后的状态值
 * @throws AppError 如果状态无效
 *
 * @example
 * const status = validateStatus(req.query.status, ['pending', 'completed'], '订单状态');
 */
export function validateStatus<T extends string>(
  status: string | undefined,
  validStatuses: T[],
  statusName: string = '状态'
): T | undefined {
  if (!status) return undefined;
  if (!validStatuses.includes(status as T)) {
    throw Errors.VALIDATION(
      `无效的${statusName}，允许的值: ${validStatuses.join(', ')}`
    );
  }
  return status as T;
}

/**
 * 解析日期范围参数
 *
 * @param query 请求的query参数
 * @returns 日期范围对象
 *
 * @example
 * const { startDate, endDate } = parseDateRange(req.query);
 */
export function parseDateRange(query: {
  startDate?: string;
  endDate?: string;
  month?: string;
}): { startDate?: Date; endDate?: Date } {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // 优先使用月份参数
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month)) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999); // 月末
    }
  } else {
    // 使用日期范围参数
    if (query.startDate) {
      const parsed = new Date(query.startDate);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
    if (query.endDate) {
      const parsed = new Date(query.endDate);
      if (!isNaN(parsed.getTime())) {
        endDate = new Date(parsed);
        endDate.setHours(23, 59, 59, 999); // 设置为当天结束
      }
    }
  }

  return { startDate, endDate };
}

/**
 * 解析布尔参数
 *
 * @param value 参数值
 * @param defaultValue 默认值
 * @returns 布尔值
 *
 * @example
 * const needTransfer = parseBoolean(req.query.needTransfer, false);
 */
export function parseBoolean(
  value: string | undefined,
  defaultValue: boolean = false
): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * 解析数字参数
 *
 * @param value 参数值
 * @param defaultValue 默认值
 * @returns 数字值
 *
 * @example
 * const limit = parseNumber(req.query.limit, 10);
 */
export function parseNumber(
  value: string | undefined,
  defaultValue: number = 0
): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export default {
  parsePagination,
  parseId,
  safeParseId,
  requireUser,
  requireAgentId,
  requireStaffId,
  requireAdminId,
  getUserId,
  validateStatus,
  parseDateRange,
  parseBoolean,
  parseNumber,
};
