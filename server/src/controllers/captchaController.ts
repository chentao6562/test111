/**
 * 验证码控制器
 * 【2026-01-22新增】后端生成验证码，增强登录安全性
 */

import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

// 验证码存储（生产环境建议使用Redis）
const captchaStore = new Map<string, { code: string; expireAt: number }>();

// 验证码配置
const CAPTCHA_LENGTH = 4;
const CAPTCHA_EXPIRE_MS = 5 * 60 * 1000; // 5分钟有效期
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/**
 * 生成随机验证码字符串
 */
function generateCaptchaCode(): string {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return code;
}

/**
 * 清理过期验证码
 */
function cleanExpiredCaptcha(): void {
  const now = Date.now();
  for (const [key, value] of captchaStore) {
    if (value.expireAt < now) {
      captchaStore.delete(key);
    }
  }
}

/**
 * 生成SVG验证码图片
 */
function generateSvgCaptcha(code: string): string {
  const width = 120;
  const height = 40;

  // 生成干扰线
  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${100 + Math.random() * 100},${100 + Math.random() * 100},${100 + Math.random() * 100})`;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`);
  }

  // 生成干扰点
  const dots: string[] = [];
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 2;
    const color = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
    dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`);
  }

  // 生成文字
  const chars: string[] = [];
  const charWidth = width / (CAPTCHA_LENGTH + 1);
  for (let i = 0; i < code.length; i++) {
    const x = charWidth * (i + 0.8);
    const y = height / 2 + 5 + (Math.random() - 0.5) * 8;
    const rotate = (Math.random() - 0.5) * 30;
    const color = `rgb(${Math.random() * 100},${Math.random() * 100},${Math.random() * 100})`;
    chars.push(`<text x="${x}" y="${y}" font-size="22" font-weight="bold" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#462625"/>
    ${lines.join('')}
    ${dots.join('')}
    ${chars.join('')}
  </svg>`;
}

/**
 * 获取验证码
 * GET /api/captcha
 */
export async function getCaptcha(req: Request, res: Response) {
  try {
    // 定期清理过期验证码
    cleanExpiredCaptcha();

    // 生成验证码
    const code = generateCaptchaCode();
    const captchaId = uuidv4();

    // 存储验证码（小写，用于不区分大小写比较）
    captchaStore.set(captchaId, {
      code: code.toLowerCase(),
      expireAt: Date.now() + CAPTCHA_EXPIRE_MS,
    });

    // 生成SVG图片
    const svg = generateSvgCaptcha(code);

    return success(res, {
      captchaId,
      svg,
    });
  } catch (err: any) {
    console.error('[Captcha] generate error:', err);
    return error(res, '生成验证码失败');
  }
}

/**
 * 验证验证码
 * @param captchaId 验证码ID
 * @param userInput 用户输入的验证码
 * @returns 验证结果
 */
export function verifyCaptcha(captchaId: string, userInput: string): { valid: boolean; message?: string } {
  if (!captchaId || !userInput) {
    return { valid: false, message: '请输入验证码' };
  }

  const stored = captchaStore.get(captchaId);
  if (!stored) {
    return { valid: false, message: '验证码已过期，请刷新' };
  }

  if (stored.expireAt < Date.now()) {
    captchaStore.delete(captchaId);
    return { valid: false, message: '验证码已过期，请刷新' };
  }

  const valid = stored.code === userInput.toLowerCase();

  // 验证后删除（一次性使用）
  captchaStore.delete(captchaId);

  if (!valid) {
    return { valid: false, message: '验证码错误' };
  }

  return { valid: true };
}

export default {
  getCaptcha,
  verifyCaptcha,
};
