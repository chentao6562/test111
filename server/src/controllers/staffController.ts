import { Request, Response } from 'express';
import {
  findByUsername,
  getStaffInfo,
  recordLoginFail,
  resetLoginFail,
  isLocked,
} from '../services/staffService';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { success, error, validationError } from '../utils/response';

/**
 * 员工登录（库管/货管）
 * POST /api/staff/login
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

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
      error(res, '用户名或密码错误');
      return;
    }

    // 检查是否是员工角色（库管或货管）
    if (!['WAREHOUSE', 'LOGISTICS'].includes(user.role)) {
      error(res, '无权访问');
      return;
    }

    // 检查账号是否被锁定
    const locked = await isLocked(user.id);
    if (locked) {
      error(res, '账号已被锁定，请15分钟后再试');
      return;
    }

    // 检查状态
    if (user.status !== 'ACTIVE') {
      error(res, '账号已被禁用，请联系管理员');
      return;
    }

    // 验证密码
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      // 记录登录失败
      await recordLoginFail(user.id);
      error(res, '用户名或密码错误');
      return;
    }

    // 重置登录失败计数
    await resetLoginFail(user.id);

    // 生成token（包含warehouseId用于多仓库支持）
    const token = generateToken({
      id: user.id,
      type: 'staff',
      role: user.role,
      warehouseId: user.warehouseId || undefined,  // 【2026-01-13多仓库支持】
    });

    // 获取用户信息
    const userInfo = await getStaffInfo(user.id);

    success(res, {
      token,
      userInfo,
    });
  } catch (err) {
    console.error('登录失败:', err);
    error(res, '登录失败', 500);
  }
}

/**
 * 获取当前员工信息
 * GET /api/staff/me
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
    console.error('获取用户信息失败:', err);
    error(res, '获取用户信息失败', 500);
  }
}

export default {
  loginHandler,
  getMeHandler,
};
