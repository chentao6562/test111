/**
 * 帮砍服务（含砍价金额算法）
 * @module services/bargain/bargainCutService
 * @since 2026-01-22
 */

import prisma from '../../utils/prisma';
import { sendSms } from '../../utils/aliSms';
import { BargainStatus, HelpCutRequest, HelpCutResult } from './types';
import { checkBargainRisk } from './bargainRiskService';
import { createBargainForHelper } from './bargainService';

/**
 * 砍价金额计算算法（拼多多式营销模式）
 *
 * 设计理念：
 * 1. 第1刀砍掉85-95%（给用户超强购买欲，"只差一点点就到底价了！"）
 * 2. 后面用小数逐步砍（0.01-0.15元/刀），吊着用户继续邀请
 * 3. 【强制规则】必须达到 minCutCount 次才能砍到底价，之前绝不允许砍完
 *
 * 示例（棒棒糖 ¥8→¥1，minCutCount=10）：
 * - 第1刀：砍掉约90%，剩余约¥0.70
 * - 第2-9刀：每刀平均砍 ¥0.07（小数逐步砍）
 * - 第10刀：砍完剩余金额，达到底价
 *
 * @param params 计算参数
 * @returns 砍价金额（保留2位小数）
 */
export function calculateCutAmount(params: {
  remainingAmount: number;   // 剩余可砍金额
  cutCount: number;          // 已砍次数
  minCutCount: number;       // 配置的最少次数（必须达到才能砍完）
  maxCutCount: number;       // 最大砍价次数
  isNewUser: boolean;        // 是否新用户
  newUserBonus: number;      // 新用户加成倍数
  totalAmount?: number;      // 总需砍金额（原价-底价）
}): number {
  const {
    remainingAmount,
    cutCount,
    minCutCount,
    isNewUser,
    newUserBonus,
    totalAmount = remainingAmount,
  } = params;

  // 边界条件检查
  if (remainingAmount <= 0 || totalAmount <= 0) {
    return 0;
  }

  let cutAmount: number;

  // 当前是第几刀（cutCount是已砍次数，+1是当前这刀）
  const currentCut = cutCount + 1;

  // 【关键】是否允许砍完：只有达到 minCutCount 才允许
  const canFinish = currentCut >= minCutCount;

  if (cutCount === 0) {
    // ========== 第1刀：砍掉85-95%（制造"只差一点点"的错觉）==========
    const ratio = 0.85 + Math.random() * 0.10; // 85%~95%
    cutAmount = totalAmount * ratio;

    // 【保护】第1刀不能砍完，必须留足够金额给后续刀数
    // 确保剩余金额足够分配给后续 (minCutCount-1) 刀，每刀至少0.01元
    const minReserve = (minCutCount - 1) * 0.01;
    const maxCut = totalAmount - minReserve;
    cutAmount = Math.min(cutAmount, maxCut);

    console.log(`[砍价算法] 第1刀: total=${totalAmount}, ratio=${(cutAmount/totalAmount*100).toFixed(1)}%, cut=${cutAmount.toFixed(2)}, reserve=${(totalAmount-cutAmount).toFixed(2)}`);
  } else if (!canFinish) {
    // ========== 第2刀到第(minCutCount-1)刀：小数砍价，绝不砍完 ==========

    // 剩余需要砍的刀数（不含当前这刀）
    const remainingCuts = minCutCount - currentCut;

    // 必须为后续刀数预留的最低金额（每刀至少0.01元）
    const reserveForLater = remainingCuts * 0.01;

    // 当前这刀最多能砍的金额
    const maxCanCut = remainingAmount - reserveForLater;

    // 基础砍价金额 = 可砍金额 / (剩余刀数+1)，带随机波动
    const baseAmount = maxCanCut / (remainingCuts + 1);
    const randomFactor = 0.6 + Math.random() * 0.8; // 0.6~1.4
    cutAmount = baseAmount * randomFactor;

    // 边界控制
    cutAmount = Math.max(cutAmount, 0.01); // 最少0.01
    cutAmount = Math.min(cutAmount, maxCanCut); // 不能超过可砍金额
    cutAmount = Math.min(cutAmount, remainingAmount * 0.4); // 单刀不超过剩余的40%

    console.log(`[砍价算法] 第${currentCut}刀(未达标): remaining=${remainingAmount.toFixed(2)}, reserve=${reserveForLater.toFixed(2)}, maxCut=${maxCanCut.toFixed(2)}, cut=${cutAmount.toFixed(2)}`);
  } else {
    // ========== 第minCutCount刀及之后：可以砍完了 ==========

    if (currentCut === minCutCount) {
      // 刚好第minCutCount刀，80%概率砍完，20%概率继续拖
      if (Math.random() < 0.8) {
        cutAmount = remainingAmount; // 砍完
      } else {
        cutAmount = remainingAmount * (0.5 + Math.random() * 0.3); // 砍50-80%
      }
    } else {
      // 超过minCutCount了，60%概率砍完
      if (Math.random() < 0.6) {
        cutAmount = remainingAmount; // 砍完
      } else {
        cutAmount = remainingAmount * (0.3 + Math.random() * 0.4); // 砍30-70%
      }
    }

    console.log(`[砍价算法] 第${currentCut}刀(已达标): remaining=${remainingAmount.toFixed(2)}, cut=${cutAmount.toFixed(2)}, willFinish=${cutAmount >= remainingAmount - 0.001}`);
  }

  // 新用户加成（只对非第1刀、且未达到minCutCount时生效）
  if (isNewUser && newUserBonus > 1 && cutCount > 0 && !canFinish) {
    const bonus = Math.min(newUserBonus, 1.2);
    const boostedAmount = cutAmount * bonus;
    // 加成后也不能超过允许的最大值
    const remainingCuts = minCutCount - currentCut;
    const reserveForLater = remainingCuts * 0.01;
    cutAmount = Math.min(boostedAmount, remainingAmount - reserveForLater);
  }

  // 最终边界检查
  cutAmount = Math.min(cutAmount, remainingAmount);
  cutAmount = Math.max(cutAmount, 0.01);

  // 保留2位小数
  return Math.round(cutAmount * 100) / 100;
}

/**
 * 检查是否为新用户（从未在平台帮砍过）
 */
export async function isNewHelper(phone: string): Promise<boolean> {
  const count = await prisma.bargainCut.count({
    where: { helperPhone: phone },
  });
  return count === 0;
}

/**
 * 验证短信验证码
 * 【2026-01-23 P0-04修复】使用原子更新，防止并发请求同时使用同一验证码
 */
async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  // 使用原子更新：只有验证码正确且未使用时才标记为已使用
  // 这样可以防止并发请求同时通过验证
  const result = await prisma.smsCode.updateMany({
    where: {
      phone,
      code,  // 验证码必须匹配
      type: 'BARGAIN_HELP',
      used: false,
      expiredAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    data: { used: true },
  });

  // 如果更新成功，说明验证码有效
  if (result.count > 0) {
    return true;
  }

  // 验证码无效，尝试增加尝试次数（用于锁定）
  await prisma.smsCode.updateMany({
    where: {
      phone,
      type: 'BARGAIN_HELP',
      used: false,
      expiredAt: { gt: new Date() },
    },
    data: { attempts: { increment: 1 } },
  });

  return false;
}

/**
 * 帮砍
 * 【2026-01-23 P0-01修复】将所有检查移入事务，使用行锁防止并发竞态
 */
export async function helpCut(request: HelpCutRequest): Promise<HelpCutResult> {
  const { bargainCode, helperPhone, helperName, verifyCode, ipAddress, deviceId } = request;

  // 1. 验证短信验证码（在事务外，因为这是独立操作）
  const isCodeValid = await verifySmsCode(helperPhone, verifyCode);
  if (!isCodeValid) {
    return { success: false, message: '验证码错误或已过期' };
  }

  // 2. 不能给自己砍（需要先查砍价发起人）
  const bargainBasic = await prisma.bargain.findUnique({
    where: { code: bargainCode },
    select: { initiatorPhone: true },
  });
  if (!bargainBasic) {
    return { success: false, message: '砍价活动不存在' };
  }
  if (bargainBasic.initiatorPhone === helperPhone) {
    return { success: false, message: '不能给自己砍价' };
  }

  // 3. 风控检查（在事务外，减少锁定时间）
  const riskResult = await checkBargainRisk({
    phone: helperPhone,
    ipAddress,
    deviceId,
    bargainCode,
  });
  if (!riskResult.passed) {
    return { success: false, message: riskResult.reason || '风控检查未通过' };
  }

  // 4. 检查是否新用户（在事务外）
  const isNew = await isNewHelper(helperPhone);

  // 5. 【P0-01核心修复】使用事务+行锁确保并发安全
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 使用FOR UPDATE锁定砍价记录，防止并发修改
      const [bargainRow] = await tx.$queryRaw<any[]>`
        SELECT b.id, b.code, b.status, b.current_price as currentPrice,
               b.floor_price as floorPrice, b.original_price as originalPrice,
               b.total_cut as totalCut, b.cut_count as cutCount, b.expire_at as expireAt,
               c.min_bargain_count as minBargainCount, c.max_bargain_count as maxBargainCount,
               c.new_user_bonus as newUserBonus
        FROM bargains b
        JOIN bargain_configs c ON b.config_id = c.id
        WHERE b.code = ${bargainCode}
        FOR UPDATE
      `;

      if (!bargainRow) {
        throw new Error('BARGAIN_NOT_FOUND');
      }

      // 检查砍价状态
      if (bargainRow.status !== BargainStatus.BARGAINING) {
        const statusMessages: Record<string, string> = {
          [BargainStatus.SUCCESS]: '该商品已砍到底价',
          [BargainStatus.ORDERED]: '该砍价已完成下单',
          [BargainStatus.EXPIRED]: '该砍价已过期',
          [BargainStatus.CANCELLED]: '该砍价已取消',
        };
        throw new Error(statusMessages[bargainRow.status] || '砍价状态异常');
      }

      // 检查是否过期
      const now = new Date();
      if (now > new Date(bargainRow.expireAt)) {
        await tx.bargain.update({
          where: { id: bargainRow.id },
          data: { status: BargainStatus.EXPIRED },
        });
        throw new Error('该砍价已过期');
      }

      // 检查是否已达到最大砍价次数
      if (bargainRow.cutCount >= bargainRow.maxBargainCount) {
        throw new Error('该砍价已达到最大帮砍次数');
      }

      // 【关键】在事务内检查是否已帮砍过
      const existingCut = await tx.bargainCut.findUnique({
        where: {
          bargainId_helperPhone: {
            bargainId: bargainRow.id,
            helperPhone: helperPhone,
          },
        },
      });
      if (existingCut) {
        throw new Error('您已经帮砍过了');
      }

      // 计算砍价金额（使用事务内最新数据）
      const remainingAmount = Number(bargainRow.currentPrice) - Number(bargainRow.floorPrice);
      const totalAmount = Number(bargainRow.originalPrice) - Number(bargainRow.floorPrice);
      const cutAmount = calculateCutAmount({
        remainingAmount,
        cutCount: bargainRow.cutCount,
        minCutCount: bargainRow.minBargainCount,
        maxCutCount: bargainRow.maxBargainCount,
        isNewUser: isNew,
        newUserBonus: Number(bargainRow.newUserBonus),
        totalAmount,
      });

      // 计算砍后价格
      const newCurrentPrice = Math.max(
        Number(bargainRow.currentPrice) - cutAmount,
        Number(bargainRow.floorPrice)
      );
      const actualCutAmount = Number(bargainRow.currentPrice) - newCurrentPrice;
      const reachedFloor = newCurrentPrice <= Number(bargainRow.floorPrice);

      // 创建砍价记录
      await tx.bargainCut.create({
        data: {
          bargainId: bargainRow.id,
          helperPhone,
          helperName,
          cutAmount: actualCutAmount,
          isNewUser: isNew,
          priceAfterCut: newCurrentPrice,
          ipAddress,
          deviceId,
        },
      });

      // 更新砍价活动
      const updateData: any = {
        currentPrice: newCurrentPrice,
        totalCut: Number(bargainRow.totalCut) + actualCutAmount,
        cutCount: bargainRow.cutCount + 1,
      };

      // 如果达到底价，更新状态
      if (reachedFloor) {
        updateData.reachedFloor = true;
        updateData.status = BargainStatus.SUCCESS;
        updateData.successAt = new Date(); // 【2026-01-23 P1-07】记录砍价成功时间
      }

      await tx.bargain.update({
        where: { id: bargainRow.id },
        data: updateData,
      });

      return {
        bargainId: bargainRow.id,
        actualCutAmount,
        newCurrentPrice,
        reachedFloor,
      };
    });

    // 事务成功后的处理：拉新机制
    // 获取砍价活动的configId和storeId用于拉新
    const bargainForHelper = await prisma.bargain.findUnique({
      where: { code: bargainCode },
      select: { configId: true, storeId: true },
    });

    let helperBargainCode: string | undefined;
    if (bargainForHelper) {
      try {
        const helperBargainResult = await createBargainForHelper(
          helperPhone,
          helperName,
          bargainForHelper.configId,
          bargainForHelper.storeId
        );
        if (helperBargainResult.success && helperBargainResult.code) {
          helperBargainCode = helperBargainResult.code;
          console.log(`[拉新] 帮砍者获得砍价机会: helper=${helperPhone}, newCode=${helperBargainCode}`);
        }
      } catch (err) {
        // 创建失败不影响帮砍结果
        console.error(`[拉新] 创建帮砍者砍价失败:`, err);
      }
    }

    return {
      success: true,
      cutAmount: result.actualCutAmount,
      currentPrice: result.newCurrentPrice,
      isNewUser: isNew,
      reachedFloor: result.reachedFloor,
      message: result.reachedFloor ? '恭喜！已砍到底价，快去下单吧！' : `成功砍掉 ¥${result.actualCutAmount.toFixed(2)}`,
      helperBargainCode,
    };
  } catch (error: any) {
    // 处理事务中抛出的错误
    const errorMessage = error.message || '帮砍失败，请稍后重试';
    console.error(`[帮砍失败] code=${bargainCode}, helper=${helperPhone}, error=${errorMessage}`);
    return { success: false, message: errorMessage };
  }
}

/**
 * 发送帮砍验证码
 */
export async function sendHelpCutCode(phone: string): Promise<{ success: boolean; message?: string }> {
  // 检查发送频率（1分钟内只能发一次）
  const recentCode = await prisma.smsCode.findFirst({
    where: {
      phone,
      type: 'BARGAIN_HELP',
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recentCode) {
    return { success: false, message: '验证码发送太频繁，请稍后再试' };
  }

  // 检查每日发送次数（最多10次）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyCount = await prisma.smsCode.count({
    where: {
      phone,
      type: 'BARGAIN_HELP',
      createdAt: { gte: today },
    },
  });
  if (dailyCount >= 10) {
    return { success: false, message: '今日验证码发送次数已达上限' };
  }

  // 生成验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

  // 保存验证码
  await prisma.smsCode.create({
    data: {
      phone,
      code,
      type: 'BARGAIN_HELP',
      expiredAt,
    },
  });

  // 【2026-01-24修复】调用阿里云短信服务发送验证码
  const result = await sendSms(phone, code, 'BARGAIN_HELP');
  if (!result.success) {
    console.error(`[砍价验证码] 发送失败 - 手机号: ${phone}, 原因: ${result.message}`);
    // 删除刚创建的验证码记录
    await prisma.smsCode.deleteMany({
      where: { phone, code, used: false },
    });
    return { success: false, message: result.message };
  }

  console.log(`[砍价验证码] 发送成功 - 手机号: ${phone}`);
  return { success: true, message: '验证码已发送' };
}
