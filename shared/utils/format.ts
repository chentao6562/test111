/**
 * 格式化工具函数
 * 【2026-01-17 代码重构】统一各端的格式化逻辑
 *
 * 注意：此文件为公共库，被多端引用
 * - h5-agent
 * - h5-warehouse
 * - miniprogram-agent
 * - admin
 */

/**
 * 格式化金额（带千分位）
 * @param amount 金额
 * @param decimals 小数位数，默认2
 * @returns 格式化后的金额字符串
 */
export function formatAmount(amount: number | string | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化价格（带货币符号）
 * @param price 价格
 * @param prefix 前缀，默认 ¥
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number | string | null | undefined, prefix: string = '¥'): string {
  return `${prefix}${formatAmount(price)}`;
}

/**
 * 格式化手机号（隐藏中间4位）
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式，默认 YYYY-MM-DD
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | null | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化日期时间
 * @param date 日期
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
}

/**
 * 格式化相对时间（如：3分钟前、2小时前、昨天）
 * @param date 日期
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days === 2) return '前天';
  if (days < 7) return `${days}天前`;
  return formatDate(d, 'MM-DD');
}

/**
 * 格式化时间（只显示时:分）
 * @param date 日期
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'HH:mm');
}

/**
 * 解析图片字符串为数组
 * @param images JSON字符串或数组
 * @returns 图片URL数组
 */
export function parseImages(images: string | string[] | null | undefined): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return images ? [images] : [];
  }
}

/**
 * 获取第一张图片
 * @param images JSON字符串或数组
 * @param defaultImage 默认图片
 * @returns 第一张图片URL
 */
export function getFirstImage(images: string | string[] | null | undefined, defaultImage: string = ''): string {
  const list = parseImages(images);
  return list[0] || defaultImage;
}

/**
 * 格式化数量
 * @param num 数量
 * @returns 格式化后的数量字符串
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (n >= 10000) {
    return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  }
  return String(n);
}

/**
 * 格式化百分比
 * @param value 数值
 * @param decimals 小数位数，默认1
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return num.toFixed(decimals) + '%';
}
