import { Request, Response } from 'express';
import {
  findByUsername,
  findByPhone,
  getStaffInfo,
  recordLoginFail,
  resetLoginFail,
  isLocked,
} from '../services/staffService';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { success, error, validationError } from '../utils/response';
import { verifyCaptcha } from './captchaController';
import smsService from '../services/smsService';

/**
 * 管理员登录
 * POST /api/admin/auth/login
 * 【2026-01-22修复】增加后端验证码验证
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, captchaId, captcha } = req.body;

    // 【2026-01-22新增】验证码验证
    const captchaResult = verifyCaptcha(captchaId, captcha);
    if (!captchaResult.valid) {
      validationError(res, captchaResult.message || '验证码错误');
      return;
    }

    // 验证参数（必须是字符串类型）
    if (!username || typeof username !== 'string') {
      validationError(res, '请输入用户名');
      return;
    }

    // 限制用户名长度，防止异常输入
    if (username.length > 50) {
      validationError(res, '用户名格式错误');
      return;
    }

    if (!password || typeof password !== 'string') {
      validationError(res, '请输入密码');
      return;
    }

    // 查找用户
    const user = await findByUsername(username);
    if (!user) {
      // 记录日志
      console.warn(`管理员登录失败: 用户不存在 - ${username}`);
      error(res, '用户名或密码错误');
      return;
    }

    // 检查是否是允许登录的角色（管理员或客服）
    const ALLOWED_ROLES = ['ADMIN', 'WAREHOUSE', 'SERVICE'];
    if (!ALLOWED_ROLES.includes(user.role)) {
      console.warn(`管理员登录失败: 非授权角色 - ${username}, role: ${user.role}`);
      error(res, '无权访问');
      return;
    }

    // 检查账号是否被锁定
    const locked = await isLocked(user.id);
    if (locked) {
      console.warn(`管理员登录失败: 账号被锁定 - ${username}`);
      error(res, '账号已被锁定，请15分钟后再试');
      return;
    }

    // 检查状态
    if (user.status !== 'ACTIVE') {
      console.warn(`管理员登录失败: 账号被禁用 - ${username}`);
      error(res, '账号已被禁用');
      return;
    }

    // 验证密码
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      // 记录登录失败
      await recordLoginFail(user.id);
      console.warn(`管理员登录失败: 密码错误 - ${username}`);
      error(res, '用户名或密码错误');
      return;
    }

    // 重置登录失败计数
    await resetLoginFail(user.id);

    // 生成token
    const token = generateToken({
      id: user.id,
      type: 'admin',
      role: user.role,
    });

    // 获取用户信息
    const userInfo = await getStaffInfo(user.id);

    console.log(`管理员登录成功: ${username}`);

    success(res, {
      token,
      user: userInfo,
    });
  } catch (err) {
    console.error('管理员登录失败:', err);
    error(res, '登录失败', 500);
  }
}

/**
 * 获取当前管理员信息
 * GET /api/admin/auth/me
 */
export async function getMeHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      error(res, '未登录', 401);
      return;
    }

    const userInfo = await getStaffInfo(userId);
    if (!userInfo) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, userInfo);
  } catch (err) {
    console.error('获取管理员信息失败:', err);
    error(res, '获取用户信息失败', 500);
  }
}

// 手机号验证正则
const PHONE_REGEX = /^1[3-9]\d{9}$/;
// 允许登录的角色
const ALLOWED_ROLES = ['ADMIN', 'WAREHOUSE', 'SERVICE'];

/**
 * 管理员登录发送验证码
 * POST /api/admin/auth/send-code
 */
export async function sendCodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body;

    // 验证手机号格式
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    // 检查手机号是否属于有效的管理员账号
    const user = await findByPhone(phone);
    if (!user) {
      // 安全考虑：不暴露账号是否存在的具体原因
      error(res, '手机号未注册或无权限');
      return;
    }

    // 验证角色权限
    if (!ALLOWED_ROLES.includes(user.role)) {
      console.warn(`管理员发送验证码失败: 非授权角色 - ${phone}, role: ${user.role}`);
      error(res, '无权访问');
      return;
    }

    // 检查账号状态
    if (user.status !== 'ACTIVE') {
      console.warn(`管理员发送验证码失败: 账号被禁用 - ${phone}`);
      error(res, '账号已被禁用');
      return;
    }

    // 检查账号是否被锁定
    const locked = await isLocked(user.id);
    if (locked) {
      console.warn(`管理员发送验证码失败: 账号被锁定 - ${phone}`);
      error(res, '账号已被锁定，请15分钟后再试');
      return;
    }

    // 发送验证码（使用 ADMIN_LOGIN 类型区分）
    const result = await smsService.sendCode(phone, 'ADMIN_LOGIN');

    if (result.success) {
      console.log(`管理员验证码发送成功: ${phone.substring(0, 3)}****${phone.substring(7)}`);
      success(res, null, result.message);
    } else {
      error(res, result.message);
    }
  } catch (err) {
    console.error('发送验证码失败:', err);
    error(res, '发送验证码失败', 500);
  }
}

/**
 * 管理员短信验证码登录
 * POST /api/admin/auth/phone-login
 */
export async function phoneLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { phone, code } = req.body;

    // 验证手机号格式
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    if (!code || typeof code !== 'string') {
      validationError(res, '请输入验证码');
      return;
    }

    // 验证验证码
    const verifyResult = await smsService.verifyCode(phone, code, 'ADMIN_LOGIN');
    if (!verifyResult.success) {
      error(res, verifyResult.message);
      return;
    }

    // 查找用户
    const user = await findByPhone(phone);
    if (!user) {
      error(res, '账号不存在');
      return;
    }

    // 验证角色权限
    if (!ALLOWED_ROLES.includes(user.role)) {
      console.warn(`管理员登录失败: 非授权角色 - ${phone}, role: ${user.role}`);
      error(res, '无权访问');
      return;
    }

    // 检查账号是否被锁定
    const locked = await isLocked(user.id);
    if (locked) {
      console.warn(`管理员登录失败: 账号被锁定 - ${phone}`);
      error(res, '账号已被锁定，请15分钟后再试');
      return;
    }

    // 检查状态
    if (user.status !== 'ACTIVE') {
      console.warn(`管理员登录失败: 账号被禁用 - ${phone}`);
      error(res, '账号已被禁用');
      return;
    }

    // 重置登录失败计数（验证码登录成功）
    await resetLoginFail(user.id);

    // 生成token
    const token = generateToken({
      id: user.id,
      type: 'admin',
      role: user.role,
    });

    // 获取用户信息
    const userInfo = await getStaffInfo(user.id);

    console.log(`管理员短信验证码登录成功: ${phone.substring(0, 3)}****${phone.substring(7)}`);

    success(res, {
      token,
      user: userInfo,
    });
  } catch (err) {
    console.error('管理员登录失败:', err);
    error(res, '登录失败', 500);
  }
}

export default {
  loginHandler,
  getMeHandler,
  sendCodeHandler,
  phoneLoginHandler,
};
