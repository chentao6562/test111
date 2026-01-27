/**
 * 日期工具函数
 * 【2026-01-17 代码重构】统一日期处理逻辑
 */

/**
 * 获取今天的日期范围（0:00:00 到 23:59:59）
 */
export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * 获取今天的开始时间
 */
export function getTodayStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * 获取今天的结束时间
 */
export function getTodayEnd(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * 获取明天的日期
 */
export function getTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * 日期加减天数
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 日期加减小时
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

/**
 * 日期加减分钟
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + minutes * 60 * 1000);
  return result;
}

/**
 * 解析日期字符串为日期范围
 * @param startStr 开始日期字符串 (YYYY-MM-DD)
 * @param endStr 结束日期字符串 (YYYY-MM-DD)
 */
export function getDateRange(
  startStr?: string,
  endStr?: string
): { start?: Date; end?: Date } {
  const result: { start?: Date; end?: Date } = {};

  if (startStr) {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    result.start = start;
  }

  if (endStr) {
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);
    result.end = end;
  }

  return result;
}

/**
 * 判断日期是否在范围内
 */
export function isDateInRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取两个日期之间的天数差
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / oneDay);
}

/**
 * 判断是否是同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
