/**
 * 查询构建服务
 * 集中处理分页查询、日期范围过滤等通用查询逻辑
 *
 * 消除重复：多处重复的分页计算和日期范围过滤代码
 */

// 分页参数接口
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

// 分页结果接口
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 日期范围参数接口
export interface DateRangeParams {
  month?: string;         // YYYY-MM 格式
  startDate?: string;     // YYYY-MM-DD 格式
  endDate?: string;       // YYYY-MM-DD 格式
  dateField?: string;     // 日期字段名
}

// 日期范围结果接口
export interface DateRangeResult {
  gte?: Date;
  lte?: Date;
}

/**
 * 计算分页参数
 * @param params 分页参数
 * @returns 处理后的分页参数
 */
export function buildPagination(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const { page = 1, pageSize = 10, maxPageSize = 100 } = params;

  // 确保页码和页大小为正整数
  const validPage = Math.max(1, Math.floor(page));
  const validPageSize = Math.min(Math.max(1, Math.floor(pageSize)), maxPageSize);

  return {
    skip: (validPage - 1) * validPageSize,
    take: validPageSize,
    page: validPage,
    pageSize: validPageSize,
  };
}

/**
 * 构建分页结果
 * @param items 数据列表
 * @param total 总数
 * @param pagination 分页参数
 * @returns 分页结果
 */
export function buildPaginationResult<T>(
  items: T[],
  total: number,
  pagination: { page: number; pageSize: number }
): PaginationResult<T> {
  const { page, pageSize } = pagination;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 解析月份字符串为日期范围
 * @param month YYYY-MM 格式的月份字符串
 * @returns 日期范围对象
 */
export function parseMonthToDateRange(month: string): DateRangeResult | null {
  const monthMatch = month.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) {
    return null;
  }

  const [, yearStr, monthStr] = monthMatch;
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // 验证月份有效性
  if (monthNum < 1 || monthNum > 12) {
    return null;
  }

  // 计算月份开始和结束日期
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

  return {
    gte: startDate,
    lte: endDate,
  };
}

/**
 * 解析日期范围参数
 * @param params 日期范围参数
 * @returns 日期范围对象
 */
export function parseDateRange(params: DateRangeParams): DateRangeResult | null {
  const { month, startDate, endDate } = params;

  // 优先使用月份
  if (month) {
    return parseMonthToDateRange(month);
  }

  // 使用开始和结束日期
  const result: DateRangeResult = {};

  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      result.gte = start;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      result.lte = end;
    }
  }

  if (!result.gte && !result.lte) {
    return null;
  }

  return result;
}

/**
 * 获取今日起始时间
 */
export function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * 获取本月起始时间
 */
export function getMonthStart(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * 获取本周起始时间
 */
export function getWeekStart(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * 构建模糊搜索条件
 * @param keyword 搜索关键词
 * @param fields 要搜索的字段列表
 * @returns Prisma OR 条件
 */
export function buildKeywordSearch(keyword: string, fields: string[]): any[] {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  const trimmedKeyword = keyword.trim();
  return fields.map((field) => ({
    [field]: { contains: trimmedKeyword },
  }));
}

/**
 * 构建数字ID搜索条件
 * @param keyword 搜索关键词
 * @returns ID条件或null
 */
export function buildIdSearch(keyword: string): number | null {
  if (!keyword) return null;
  const num = Number(keyword);
  return isNaN(num) ? null : num;
}

/**
 * 构建排序条件
 * @param sortField 排序字段
 * @param sortOrder 排序方向
 * @param defaultSort 默认排序
 */
export function buildOrderBy(
  sortField?: string,
  sortOrder?: 'asc' | 'desc',
  defaultSort: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
): Record<string, 'asc' | 'desc'> {
  if (!sortField) {
    return defaultSort;
  }
  return { [sortField]: sortOrder || 'desc' };
}

/**
 * 安全的数字转换
 * @param value 要转换的值
 * @param defaultValue 默认值
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 安全的浮点数转换
 * @param value 要转换的值
 * @param defaultValue 默认值
 */
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 构建状态过滤条件
 * @param status 状态值
 * @param validStatuses 有效状态列表
 */
export function buildStatusFilter(
  status: string | undefined,
  validStatuses: string[]
): string | undefined {
  if (!status) return undefined;
  return validStatuses.includes(status) ? status : undefined;
}
