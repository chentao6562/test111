/**
 * 现金大转盘助力服务
 * @module services/spinWheel/spinWheelHelpService
 * @since 2026-01-23
 * @update 2026-01-23 集成真实短信服务、添加并发控制、优化新用户检查
 */

import prisma from '../../utils/prisma';
import { HelpSpinRequest, HelpResultResponse, SpinType } from './types';
import { generateHelpAmount } from './spinAlgorithm';
import { isBlacklisted } from './spinWheelRiskService';
import { sendSms } from '../../utils/aliSms';

/**
 * 检查用户是否为新用户（首次在平台助力）
 * 【2026-01-23 P1-04优化】使用Promise.all并行查询，提升性能
 */
async function checkIsNewUser(phone: string): Promise<boolean> {
  // 并行执行4个查询，提升性能
  const [spinHelp, bargainCut, agent, reservation] = await Promise.all([
    prisma.spinWheelHelp.findFirst({ where: { helperPhone: phone }, select: { id: true } }),
    prisma.bargainCut.findFirst({ where: { helperPhone: phone }, select: { id: true } }),
    prisma.agent.findUnique({ where: { phone }, select: { id: true } }),
    prisma.reservation.findFirst({ where: { customerPhone: phone }, select: { id: true } }),
  ]);

  // 如果都不存在，则为新用户
  return !spinHelp && !bargainCut && !agent && !reservation;
}

/**
 * 发送助力验证码
 * 【2026-01-23 P0-01】集成真实短信服务
 */
export async function sendHelpCode(phone: string): Promise<{ success: boolean; message?: string }> {
  // 检查发送频率（60秒内只能发一次）
  const recentCode = await prisma.smsCode.findFirst({
    where: {
      phone,
      type: 'SPIN_HELP',
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
  });

  if (recentCode) {
    const waitSeconds = Math.ceil((60 - (Date.now() - recentCode.createdAt.getTime()) / 1000));
    return { success: false, message: `请${waitSeconds}秒后再试` };
  }

  // 检查每日发送次数（最多10次）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyCount = await prisma.smsCode.count({
    where: {
      phone,
      type: 'SPIN_HELP',
      createdAt: { gte: today },
    },
  });

  if (dailyCount >= 10) {
    return { success: false, message: '今日验证码发送次数已达上限' };
  }

  // 生成6位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

  // 保存验证码到数据库
  try {
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        type: 'SPIN_HELP',
        expiredAt,
      },
    });
  } catch (error) {
    console.error('[转盘助力] 保存验证码失败:', error);
    return { success: false, message: '验证码发送失败，请稍后重试' };
  }

  // 发送真实短信
  const result = await sendSms(phone, code, 'SPIN_HELP');

  if (!result.success) {
    // 发送失败，删除已保存的验证码
    await prisma.smsCode.deleteMany({
      where: { phone, code, used: false },
    });
    console.error(`[转盘助力] 短信发送失败: phone=${phone}, error=${result.message}`);
    return { success: false, message: result.message || '短信发送失败' };
  }

  console.log(`[转盘助力] 验证码已发送: phone=${phone}`);
  return { success: true, message: '验证码已发送' };
}

/**
 * 执行助力
 * 【2026-01-23 P0-01/P1-03】集成真实验证码验证 + 添加并发控制
 */
export async function helpSpin(request: HelpSpinRequest): Promise<HelpResultResponse> {
  const { participationCode, helperPhone, helperName, verifyCode, ipAddress, deviceId } = request;

  // 1. 验证验证码（原子操作，防止并发复用）
  const verifyResult = await prisma.smsCode.updateMany({
    where: {
      phone: helperPhone,
      type: 'SPIN_HELP',
      code: verifyCode,
      used: false,
      expiredAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    data: { used: true },
  });

  if (verifyResult.count === 0) {
    // 验证失败，增加尝试次数
    await prisma.smsCode.updateMany({
      where: {
        phone: helperPhone,
        type: 'SPIN_HELP',
        used: false,
        expiredAt: { gt: new Date() },
      },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, message: '验证码错误或已过期' };
  }

  // 2. 预检查：获取参与记录基本信息
  const participationBasic = await prisma.spinWheelParticipation.findUnique({
    where: { code: participationCode },
    select: { id: true, phone: true },
  });

  if (!participationBasic) {
    return { success: false, message: '参与记录不存在' };
  }

  // 3. 检查是否自己给自己助力
  if (participationBasic.phone === helperPhone) {
    return { success: false, message: '不能给自己助力哦' };
  }

  // 4. 检查黑名单（在事务外，减少锁定时间）
  const blacklisted = await isBlacklisted(helperPhone, ipAddress, deviceId);
  if (blacklisted) {
    return { success: false, message: '助力失败，请稍后重试' };
  }

  // 5. 预先检查是否新用户（在事务外）
  const isNewUser = await checkIsNewUser(helperPhone);

  // 6. 【P1-03核心修复】使用事务+行锁确保并发安全
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 使用FOR UPDATE锁定参与记录，防止并发修改
      const [participation] = await tx.$queryRaw<any[]>`
        SELECT p.*, c.start_time as startTime, c.end_time as endTime,
               c.max_daily_help as maxDailyHelp, c.fragment_expire_days as fragmentExpireDays,
               c.new_user_help_min as newUserHelpMin, c.new_user_help_max as newUserHelpMax,
               c.old_user_help_min as oldUserHelpMin, c.old_user_help_max as oldUserHelpMax
        FROM spin_wheel_participations p
        JOIN spin_wheel_configs c ON p.config_id = c.id
        WHERE p.code = ${participationCode}
        FOR UPDATE
      `;

      if (!participation) {
        throw new Error('参与记录不存在');
      }

      // 检查活动时间
      const now = new Date();
      if (now < new Date(participation.startTime) || now > new Date(participation.endTime)) {
        throw new Error('活动已结束');
      }

      // 在事务内检查是否已经助力过
      const existingHelp = await tx.spinWheelHelp.findUnique({
        where: {
          participationId_helperPhone: {
            participationId: participation.id,
            helperPhone,
          },
        },
      });

      if (existingHelp) {
        throw new Error('您已经助力过了');
      }

      // 检查今日被助力次数
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todayHelpCount = participation.today_help_count || 0;
      const todayDate = participation.today_date ? new Date(participation.today_date) : null;

      // 如果todayDate不是今天，重置计数
      if (!todayDate || todayDate.getTime() < today.getTime()) {
        todayHelpCount = 0;
      }

      if (todayHelpCount >= participation.maxDailyHelp) {
        throw new Error('今日助力次数已达上限');
      }

      // 计算助力金额
      const helpAmount = generateHelpAmount(isNewUser, {
        newUserHelpMin: Number(participation.newUserHelpMin),
        newUserHelpMax: Number(participation.newUserHelpMax),
        oldUserHelpMin: Number(participation.oldUserHelpMin),
        oldUserHelpMax: Number(participation.oldUserHelpMax),
      });

      // 计算过期时间
      const expireAt = participation.fragmentExpireDays > 0
        ? new Date(now.getTime() + participation.fragmentExpireDays * 24 * 60 * 60 * 1000)
        : null;

      // 创建助力记录
      await tx.spinWheelHelp.create({
        data: {
          participationId: participation.id,
          configId: participation.config_id,
          helperPhone,
          helperName,
          helpAmount,
          isNewUser,
          ipAddress,
          deviceId,
        },
      });

      // 创建抽奖记录（助力类型）
      await tx.spinWheelRecord.create({
        data: {
          participationId: participation.id,
          configId: participation.config_id,
          prizeName: `${isNewUser ? '新用户' : '好友'}助力`,
          prizeAmount: helpAmount,
          spinType: SpinType.HELP,
          expireAt,
        },
      });

      // 更新参与记录
      await tx.spinWheelParticipation.update({
        where: { id: participation.id },
        data: {
          totalAmount: { increment: helpAmount },
          todayHelpCount: todayHelpCount + 1,
          todayDate: today,
          remainingSpins: { increment: 1 },
        },
      });

      return { helpAmount, isNewUser };
    });

    return {
      success: true,
      helpAmount: result.helpAmount,
      isNewUser: result.isNewUser,
      message: result.isNewUser
        ? `恭喜！新用户助力成功，帮TA获得${result.helpAmount}元`
        : `助力成功，帮TA获得${result.helpAmount}元`,
    };
  } catch (error: any) {
    const errorMessage = error.message || '助力失败，请稍后重试';
    console.error(`[转盘助力失败] code=${participationCode}, helper=${helperPhone}, error=${errorMessage}`);
    return { success: false, message: errorMessage };
  }
}

/**
 * 获取用户今日助力统计
 */
export async function getHelperStats(phone: string): Promise<{
  totalHelpCount: number;
  todayHelpCount: number;
  totalHelpAmount: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalHelps, todayHelps] = await Promise.all([
    prisma.spinWheelHelp.findMany({
      where: { helperPhone: phone },
    }),
    prisma.spinWheelHelp.findMany({
      where: {
        helperPhone: phone,
        createdAt: { gte: today },
      },
    }),
  ]);

  const totalHelpAmount = totalHelps.reduce((sum, h) => sum + Number(h.helpAmount), 0);

  return {
    totalHelpCount: totalHelps.length,
    todayHelpCount: todayHelps.length,
    totalHelpAmount,
  };
}
