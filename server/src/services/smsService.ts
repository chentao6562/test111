import prisma from '../utils/prisma';
import { smsConfig } from '../config/sms';
import { sendSms, sendNotifySms } from '../utils/aliSms';

/**
 * 短信服务 - 支持阿里云短信和测试模式
 */
class SmsService {
  /**
   * 生成6位随机验证码
   */
  private generateCode(): string {
    if (!smsConfig.enabled) {
      return smsConfig.testCode;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 检查发送频率限制
   * @param phone 手机号
   * @param type 验证码类型（不同类型互不影响）
   */
  async checkSendLimit(phone: string, type: string): Promise<{ allowed: boolean; message?: string; waitSeconds?: number }> {
    // 检查发送间隔（60秒内是否发送过同类型验证码）
    const recentCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        type,  // 按类型过滤，不同场景的验证码互不影响
        createdAt: {
          gte: new Date(Date.now() - smsConfig.sendInterval * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCode) {
      const waitSeconds = Math.ceil(
        smsConfig.sendInterval - (Date.now() - recentCode.createdAt.getTime()) / 1000
      );
      return {
        allowed: false,
        message: `请${waitSeconds}秒后再试`,
        waitSeconds,
      };
    }

    // 检查小时发送次数（单用户限制）
    const oneHourAgo = new Date(Date.now() - 3600000);
    const hourlyCount = await prisma.smsCode.count({
      where: {
        phone,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyCount >= smsConfig.hourlyLimit) {
      return {
        allowed: false,
        message: '本小时发送次数已达上限（5次），请稍后再试',
      };
    }

    // 检查当日发送次数（单用户限制）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.smsCode.count({
      where: {
        phone,
        createdAt: { gte: today },
      },
    });

    if (dailyCount >= smsConfig.dailyLimit) {
      return {
        allowed: false,
        message: '今日发送次数已达上限（20次），请明天再试',
      };
    }

    // 检查全局每日发送次数
    const globalDailyCount = await prisma.smsCode.count({
      where: {
        createdAt: { gte: today },
      },
    });

    if (globalDailyCount >= smsConfig.dailyGlobalLimit) {
      return {
        allowed: false,
        message: '系统短信发送已达今日上限，请明天再试',
      };
    }

    return { allowed: true };
  }

  /**
   * 发送验证码
   */
  async sendCode(phone: string, type: string = 'LOGIN'): Promise<{ success: boolean; message: string }> {
    // 检查发送限制（按类型区分，不同场景互不影响）
    const limitCheck = await this.checkSendLimit(phone, type);
    if (!limitCheck.allowed) {
      return { success: false, message: limitCheck.message! };
    }

    // 生成验证码
    const code = this.generateCode();
    const expiredAt = new Date(Date.now() + smsConfig.codeExpiry * 1000);

    // 保存验证码到数据库
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expiredAt,
        used: false,
      },
    });

    // 发送短信（传递场景类型以选择对应模板）
    const result = await sendSms(phone, code, type);

    if (!result.success) {
      // 【2026-01-27】SMS发送失败时的降级处理
      // 检测是否是阿里云限流错误（如：触发号码天级流控Permits:40）
      const isRateLimitError = result.message?.includes('流控') || result.message?.includes('Permits');

      if (isRateLimitError) {
        // 限流时，更新验证码为测试验证码，允许用户使用备用码登录
        await prisma.smsCode.updateMany({
          where: {
            phone,
            code,
            used: false,
          },
          data: {
            code: smsConfig.testCode, // 使用测试验证码
          },
        });
        console.log(`[SmsService] SMS限流，降级使用测试验证码 - 手机号: ${phone.slice(0, 3)}****${phone.slice(-4)}`);
        return { success: true, message: `短信发送受限，请使用备用验证码：${smsConfig.testCode}` };
      }

      // 其他失败情况，删除验证码记录
      await prisma.smsCode.deleteMany({
        where: {
          phone,
          code,
          used: false,
        },
      });
      return { success: false, message: result.message };
    }

    // 测试模式下返回特殊提示
    if (!smsConfig.enabled) {
      return { success: true, message: `验证码已发送（测试验证码：${smsConfig.testCode}）` };
    }

    return { success: true, message: '验证码已发送' };
  }

  /**
   * 验证验证码
   * 【2026-01-17增强】添加尝试次数限制，防止暴力破解
   */
  async verifyCode(phone: string, code: string, type: string = 'LOGIN'): Promise<{ valid: boolean; message?: string }> {
    // 测试模式下接受固定验证码
    if (!smsConfig.enabled && code === smsConfig.testCode) {
      return { valid: true };
    }

    // 查找有效的验证码
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        type,
        used: false,
        expiredAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode) {
      return { valid: false, message: '验证码不存在或已过期' };
    }

    // 【2026-01-17】检查尝试次数，超过5次自动失效
    const MAX_ATTEMPTS = 5;
    if (smsCode.attempts >= MAX_ATTEMPTS) {
      // 标记为已使用（失效）
      await prisma.smsCode.update({
        where: { id: smsCode.id },
        data: { used: true },
      });
      return { valid: false, message: '验证码已失效，请重新获取' };
    }

    // 验证码比对
    if (smsCode.code !== code) {
      // 验证失败，增加尝试次数
      await prisma.smsCode.update({
        where: { id: smsCode.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = MAX_ATTEMPTS - smsCode.attempts - 1;
      if (remainingAttempts <= 0) {
        return { valid: false, message: '验证码错误次数过多，已失效' };
      }
      return { valid: false, message: `验证码错误，还剩${remainingAttempts}次机会` };
    }

    // 标记为已使用
    await prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { used: true },
    });

    return { valid: true };
  }

  /**
   * 获取短信发送统计（管理后台用）
   */
  async getSmsStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySent, totalSent] = await Promise.all([
      prisma.smsCode.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.smsCode.count(),
    ]);

    return {
      todaySent,
      totalSent,
      enabled: smsConfig.enabled,
    };
  }
}

// 导出单例
export const smsService = new SmsService();

// 保持向后兼容的导出
export async function sendCode(phone: string, type: string) {
  return smsService.sendCode(phone, type);
}

export async function verifyCode(phone: string, code: string, type: string) {
  const result = await smsService.verifyCode(phone, code, type);
  return { success: result.valid, message: result.message || '验证成功' };
}

/**
 * 【2026-01-17】发送提货码短信通知
 * @param params 提货码通知参数
 */
export async function sendPickupCodeSms(params: {
  phone: string;
  reservationNo: string;
  pickupCode: string;
  pickupDate: Date | string;
  storeAddress?: string;
  storePhone?: string;
}): Promise<{ success: boolean; message: string }> {
  const {
    phone,
    reservationNo,
    pickupCode,
    pickupDate,
    storeAddress = '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
    storePhone = '13190531439',
  } = params;

  // 格式化日期
  const dateStr = typeof pickupDate === 'string'
    ? pickupDate
    : pickupDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  console.log(`[SmsService] 发送提货码短信 - 手机号: ${phone.slice(0, 3)}****${phone.slice(-4)}, 预约号: ${reservationNo}, 提货码: ${pickupCode}`);

  // 调用通知短信发送
  const result = await sendNotifySms(phone, 'PICKUP_CODE', {
    reservationNo,
    pickupCode,
    pickupDate: dateStr,
    storeAddress,
    storePhone,
  });

  return result;
}

export default {
  sendCode,
  verifyCode,
  smsService,
  sendPickupCodeSms,
};
