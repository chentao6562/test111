/**
 * API相关类型定义
 *
 * 用于请求参数和响应格式的统一类型
 */

/**
 * 分页查询参数
 */
export interface PaginatedQuery {
  page?: string;
  pageSize?: string;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 创建分页结果
 */
export function createPaginatedResult<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: string;
}

/**
 * 服务层操作结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 创建成功的服务结果
 */
export function successResult<T>(data: T, message?: string): ServiceResult<T> {
  return { success: true, data, message };
}

/**
 * 创建失败的服务结果
 */
export function failResult(error: string, message?: string): ServiceResult<never> {
  return { success: false, error, message };
}

/**
 * 列表查询通用参数
 */
export interface ListQueryParams extends PaginatedQuery {
  keyword?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * ID参数
 */
export interface IdParam {
  id: string;
}

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  ids: number[];
}

/**
 * 统计数据接口
 */
export interface StatisticsData {
  [key: string]: number | string | StatisticsData;
}
