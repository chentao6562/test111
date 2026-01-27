import { Request, Response } from 'express';
import { sendCode, verifyCode } from '../services/smsService';
import {
  findByPhone,
  findByInviteCode,
  create,
  getAgentInfo,
} from '../services/agentService';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { success, error, validationError } from '../utils/response';
import prisma from '../utils/prisma';
// 【2026-01-18 春节营销】引入即时奖励服务
// 【2026-01-23】添加 issueRecruitBonus 用于二级邀请普通用户时发放拉新奖励
import { processRegistrationRewards, issueRecruitBonus } from '../services/campaign2026/instantRewardService';
// 【2026-01-20】引入周拉新统计服务
import { updateWeeklyRecruitStats } from '../services/campaign2026/weeklyRewardService';

// 手机号正则
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/**
 * 发送验证码
 * POST /api/auth/send-code
 */
export async function sendCodeHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { phone, type = 'LOGIN' } = req.body;

    // 验证手机号（必须是字符串类型）
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    // 验证类型
    const validTypes = ['LOGIN', 'REGISTER', 'RESET_PASSWORD'];
    if (!validTypes.includes(type.toUpperCase())) {
      validationError(res, '无效的验证码类型');
      return;
    }

    // 发送验证码
    const result = await sendCode(phone, type.toUpperCase());

    if (result.success) {
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
 * 手机号验证码登录
 * POST /api/auth/phone-login
 * 支持邀请码参数，新用户根据邀请码自动设置代理商类型
 */
export async function phoneLoginHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { phone, code, inviteCode } = req.body;

    // 验证参数（必须是字符串类型）
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    if (!code || typeof code !== 'string') {
      validationError(res, '请输入验证码');
      return;
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'LOGIN');
    if (!verifyResult.success) {
      error(res, verifyResult.message);
      return;
    }

    // 查找或创建用户
    let agent = await findByPhone(phone);
    let inviteCodeWarning: string | undefined; // 【Task 2.3】邀请码无效警告

    // 【2026-01-22 BUG修复】对已存在用户，先检查状态再继续
    if (agent && agent.status !== 'ACTIVE') {
      error(res, '账号已被禁用，请联系客服');
      return;
    }

    if (!agent) {
      // 新用户：检查邀请码确定代理商类型
      let parentId: number | undefined;
      if (inviteCode && typeof inviteCode === 'string') {
        const parent = await findByInviteCode(inviteCode.toUpperCase());
        if (parent) {
          // 【2026-01-17】检查上级是否可以发展下级
          // 【2026-01-19修复】总代理可以发展一级，一级可以发展二级
          if (parent.type === 'LEVEL2' && !parent.isMaster) {
            error(res, '二级推销员不能发展下级');
            return;
          }
          if (parent.type === 'WHOLESALE') {
            error(res, '普通用户不能发展下级');
            return;
          }
          parentId = parent.id;
        } else {
          // 【Task 2.3】邀请码无效时，设置警告信息
          inviteCodeWarning = '邀请码无效，已为您创建批发商账号';
          console.log(`[注册警告] 手机号${phone}使用的邀请码${inviteCode}无效，降级为批发商`);
        }
      }
      // 创建新用户，类型会根据parentId自动推断
      agent = await create({ phone, parentId });

      // 【2026-01-18 春节营销】发放注册奖励
      // 【2026-01-23 优化】二级邀请普通用户也发放拉新奖励
      if (parentId) {
        try {
          if (agent.type !== 'WHOLESALE') {
            // 新人是推销员：发放完整奖励（注册奖励+拉新奖励）
            await processRegistrationRewards(agent.id, parentId);
            console.log(`[春节营销] 新推销员${phone}注册奖励已发放`);
          } else {
            // 新人是普通用户：只给邀请人发拉新奖励
            await issueRecruitBonus(parentId, agent.id);
            console.log(`[春节营销] 邀请人${parentId}拉新奖励已发放（邀请普通用户${phone}）`);
          }

          // 【2026-01-20】更新上级的周拉新统计
          // 【2026-01-22 修复】移除重试机制，避免重复累加（函数内部已有错误处理）
          await updateWeeklyRecruitStats(parentId);
        } catch (rewardErr) {
          // 奖励发放失败不影响注册流程
          console.error(`[春节营销] 注册奖励发放失败:`, rewardErr);
        }
      }
    }

    // 【2026-01-19修复】生成token时包含agentType，用于获取推销员定价
    const token = generateToken({
      id: agent.id,
      type: 'agent',
      agentType: agent.type, // LEVEL1/LEVEL2/WHOLESALE
    });

    // 获取用户信息
    const userInfo = await getAgentInfo(agent.id);

    // 【Task 2.3】返回结果，包含可能的警告信息
    success(res, {
      token,
      userInfo,
      warning: inviteCodeWarning, // 前端可检查此字段并显示提示
    });
  } catch (err) {
    console.error('登录失败:', err);
    error(res, '登录失败', 500);
  }
}

/**
 * 密码登录
 * POST /api/auth/password-login
 */
export async function passwordLoginHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { phone, password } = req.body;

    // 验证参数（必须是字符串类型）
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    if (!password || typeof password !== 'string') {
      validationError(res, '请输入密码');
      return;
    }

    // 【2026-01-17安全修复】统一错误信息，防止账号枚举攻击
    const INVALID_CREDENTIALS_MSG = '账号或密码错误';

    // 查找用户
    const agent = await findByPhone(phone);
    if (!agent) {
      error(res, INVALID_CREDENTIALS_MSG);
      return;
    }

    // 检查是否设置了密码
    if (!agent.password) {
      error(res, '未设置密码，请使用验证码登录');
      return;
    }

    // 验证密码
    const isMatch = await comparePassword(password, agent.password);
    if (!isMatch) {
      error(res, INVALID_CREDENTIALS_MSG);
      return;
    }

    // 检查状态
    if (agent.status !== 'ACTIVE') {
      error(res, '账号已被禁用，请联系客服');
      return;
    }

    // 【2026-01-19修复】生成token时包含agentType，用于获取推销员定价
    const token = generateToken({
      id: agent.id,
      type: 'agent',
      agentType: agent.type, // LEVEL1/LEVEL2/WHOLESALE
    });

    // 获取用户信息
    const userInfo = await getAgentInfo(agent.id);

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
 * 注册
 * POST /api/auth/register
 */
export async function registerHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { phone, code, password, name, inviteCode } = req.body;

    // 验证参数（必须是字符串类型）
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      validationError(res, '请输入正确的手机号');
      return;
    }

    if (!code || typeof code !== 'string') {
      validationError(res, '请输入验证码');
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      validationError(res, '密码至少6位');
      return;
    }

    // 检查手机号是否已注册
    const existing = await findByPhone(phone);
    if (existing) {
      error(res, '该手机号已注册');
      return;
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'REGISTER');
    if (!verifyResult.success) {
      error(res, verifyResult.message);
      return;
    }

    // 查找上级代理商
    // 【2026-01-22 BUG修复】邀请码无效时与phoneLogin保持一致，降级为WHOLESALE而非返回错误
    let parentId: number | undefined;
    let inviteCodeWarning: string | undefined;
    if (inviteCode) {
      const parent = await findByInviteCode(inviteCode.toUpperCase());
      if (parent) {
        // 【2026-01-22】检查上级状态
        if (parent.status !== 'ACTIVE') {
          inviteCodeWarning = '邀请人账号已被禁用，已为您创建普通账号';
        } else {
          parentId = parent.id;
        }
      } else {
        inviteCodeWarning = '邀请码无效，已为您创建普通账号';
        console.log(`[注册] 手机号${phone}使用的邀请码${inviteCode}无效，降级为批发商`);
      }
    }

    // 创建用户
    const agent = await create({
      phone,
      password,
      name,
      parentId,
    });

    // 【2026-01-18 春节营销】发放注册奖励
    // 【2026-01-23 优化】二级邀请普通用户也发放拉新奖励
    if (parentId) {
      try {
        if (agent.type !== 'WHOLESALE') {
          // 新人是推销员：发放完整奖励
          await processRegistrationRewards(agent.id, parentId);
          console.log(`[春节营销] 新推销员${phone}注册奖励已发放`);
        } else {
          // 新人是普通用户：只给邀请人发拉新奖励
          await issueRecruitBonus(parentId, agent.id);
          console.log(`[春节营销] 邀请人${parentId}拉新奖励已发放（邀请普通用户${phone}）`);
        }

        // 【2026-01-20】更新上级的周拉新统计
        await updateWeeklyRecruitStats(parentId);
      } catch (rewardErr) {
        console.error(`[春节营销] 注册奖励发放失败:`, rewardErr);
      }
    }

    // 【2026-01-19修复】生成token时包含agentType，用于获取推销员定价
    const token = generateToken({
      id: agent.id,
      type: 'agent',
      agentType: agent.type, // LEVEL1/LEVEL2/WHOLESALE
    });

    // 获取用户信息
    const userInfo = await getAgentInfo(agent.id);

    success(res, {
      token,
      userInfo,
      ...(inviteCodeWarning ? { warning: inviteCodeWarning } : {}),
    });
  } catch (err) {
    console.error('注册失败:', err);
    error(res, '注册失败', 500);
  }
}

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export async function getMeHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      error(res, '未登录', 401);
      return;
    }

    const userInfo = await getAgentInfo(userId);
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

/**
 * 批发商申请成为代理商
 * POST /api/auth/apply-agent
 * 需要登录认证，且当前用户必须是批发商
 */
export async function applyAgentHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      error(res, '未登录', 401);
      return;
    }

    const { inviteCode } = req.body;

    // 验证邀请码
    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
      validationError(res, '请输入邀请码');
      return;
    }

    // 获取当前用户信息
    const currentAgent = await findByPhone((await getAgentInfo(userId))?.phone || '');
    if (!currentAgent) {
      error(res, '用户不存在', 404);
      return;
    }

    // 验证当前用户是批发商
    if (currentAgent.type !== 'WHOLESALE') {
      error(res, '您已是代理商，无需申请');
      return;
    }

    // 查找上级代理商
    const parent = await findByInviteCode(inviteCode.toUpperCase().trim());
    if (!parent) {
      error(res, '邀请码无效，请检查后重试');
      return;
    }

    // 【2026-01-17】验证上级是否可以发展下级，只有一级可以发展二级
    if (parent.type === 'LEVEL2') {
      error(res, '二级推销员无法发展下级');
      return;
    }
    if (parent.type === 'WHOLESALE') {
      error(res, '普通用户无法发展下级');
      return;
    }
    if (parent.status !== 'ACTIVE') {
      error(res, '该邀请码对应的推销员已被禁用');
      return;
    }

    // 确定新的代理商类型（一级发展二级）
    let newType: string;
    if (parent.type === 'LEVEL1') {
      newType = 'LEVEL2';
    } else {
      error(res, '无法确定推销员类型');
      return;
    }

    // 更新用户类型和上级
    const { update } = await import('../services/agentService');
    await update(userId, {
      type: newType,
      parentId: parent.id,
    });

    // 【2026-01-18 春节营销】批发商升级为推销员时发放注册奖励
    try {
      await processRegistrationRewards(userId, parent.id);
      console.log(`[春节营销] 推销员${currentAgent.phone}升级奖励已发放`);

      // 【2026-01-20】更新上级的周拉新统计
      await updateWeeklyRecruitStats(parent.id);
    } catch (rewardErr) {
      console.error(`[春节营销] 升级奖励发放失败:`, rewardErr);
    }

    // 获取更新后的用户信息
    const userInfo = await getAgentInfo(userId);

    console.log(`批发商${currentAgent.phone}通过邀请码${inviteCode}升级为${newType}，上级：${parent.name}(${parent.phone})`);

    success(res, { userInfo }, '恭喜您成功成为推销员！');
  } catch (err) {
    console.error('申请代理商失败:', err);
    error(res, '申请失败，请稍后重试', 500);
  }
}

/**
 * 绑定推销员（扫码后更新）
 * POST /api/auth/bind-salesperson
 * 【2026-01-20新增】已登录WHOLESALE用户扫码后更新绑定关系
 * 【2026-01-22修复】添加层级验证，防止破坏层级结构
 */
export async function bindSalespersonHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userType = req.user?.agentType;
    const { salespersonId } = req.body;

    if (!userId || !salespersonId) {
      validationError(res, '参数错误');
      return;
    }

    // 只有WHOLESALE用户才能绑定推销员
    if (userType !== 'WHOLESALE') {
      error(res, '推销员无法绑定其他推销员');
      return;
    }

    // 【2026-01-22 BUG修复】获取当前用户完整信息，检查是否已有上级
    const currentUser = await prisma.agent.findUnique({
      where: { id: userId },
      select: { id: true, parentId: true, type: true },
    });

    if (!currentUser) {
      error(res, '用户不存在');
      return;
    }

    // 【2026-01-22 BUG修复】如果已有上级，不允许重新绑定
    if (currentUser.parentId) {
      error(res, '您已有上级推销员，无法重新绑定');
      return;
    }

    // 验证推销员存在且有效
    const salesperson = await prisma.agent.findUnique({
      where: { id: Number(salespersonId) },
      select: { id: true, type: true, status: true, parentId: true },
    });

    if (!salesperson || salesperson.status !== 'ACTIVE') {
      error(res, '推销员不存在或已被禁用');
      return;
    }

    if (!['LEVEL1', 'LEVEL2'].includes(salesperson.type)) {
      error(res, '无效的推销员');
      return;
    }

    // 【2026-01-22 BUG修复】检查是否会形成循环（极端情况：推销员的上级是当前用户）
    if (salesperson.parentId === userId) {
      error(res, '无法绑定您的下级为上级');
      return;
    }

    // 更新用户的parentId
    await prisma.agent.update({
      where: { id: userId },
      data: { parentId: Number(salespersonId) },
    });

    console.log(`[扫码绑定] 用户${userId}绑定到推销员${salespersonId}`);
    success(res, { message: '绑定成功' });
  } catch (err) {
    console.error('[AuthController] bindSalesperson error:', err);
    error(res, '绑定失败', 500);
  }
}

export default {
  sendCodeHandler,
  phoneLoginHandler,
  passwordLoginHandler,
  registerHandler,
  getMeHandler,
  applyAgentHandler,
  bindSalespersonHandler,
};
