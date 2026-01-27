/**
 * 输入过滤工具
 * 防止XSS攻击
 */

/**
 * 过滤HTML标签，防止XSS攻击
 * @param input 输入字符串
 * @returns 过滤后的字符串
 */
export function sanitizeHtml(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 清理用户输入的名称
 * 移除HTML标签但保留中文字符
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeName(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // 移除所有HTML标签
  let cleaned = input.replace(/<[^>]*>/g, '');

  // 移除脚本相关内容
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/on\w+=/gi, '');

  // 限制长度
  cleaned = cleaned.substring(0, 50);

  // 去除首尾空格
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 验证并清理用户名
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeUsername(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // 只允许字母、数字、下划线
  return input.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
}

/**
 * 通用输入过滤（sanitizeName的别名）
 */
export function sanitize(input: string | undefined | null): string {
  return sanitizeName(input);
}

export default {
  sanitizeHtml,
  sanitizeName,
  sanitizeUsername,
  sanitize,
};
