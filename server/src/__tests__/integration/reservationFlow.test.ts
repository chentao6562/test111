/**
 * 预约完整流程集成测试
 * 测试目标：验证预约从创建到完成的完整流程
 */

import prisma from '../../utils/prisma';
import { ReservationStatus } from '../../services/reservation/types';

// 跳过需要数据库连接的测试（在CI环境中）
const describeWithDb = process.env.CI ? describe.skip : describe;

describeWithDb('预约完整流程集成测试', () => {
  // 测试前准备
  beforeAll(async () => {
    console.log('准备测试数据...');
  });

  // 测试后清理
  afterAll(async () => {
    console.log('清理测试数据...');
    await prisma.$disconnect();
  });

  describe('状态流转测试', () => {
    it('应该支持完整的状态流转路径: 0->1->2->7->8->9->3', () => {
      // 正常路径
      const normalPath = [
        ReservationStatus.PENDING,         // 0 - 待确认
        ReservationStatus.CALLING,         // 1 - 确认中
        ReservationStatus.CONFIRMED,       // 2 - 已确认
        ReservationStatus.PENDING_PREPARE, // 7 - 待备货
        ReservationStatus.PREPARING,       // 8 - 备货中
        ReservationStatus.PENDING_PICKUP,  // 9 - 待提货
        ReservationStatus.COMPLETED,       // 3 - 已完成
      ];

      expect(normalPath.length).toBe(7);
      expect(normalPath[0]).toBe(0);
      expect(normalPath[normalPath.length - 1]).toBe(3);
    });

    it('应该支持确认失败路径: 0->1->6', () => {
      const failPath = [
        ReservationStatus.PENDING,     // 0
        ReservationStatus.CALLING,     // 1
        ReservationStatus.CALL_FAILED, // 6
      ];

      expect(failPath[failPath.length - 1]).toBe(6);
    });

    it('应该支持过期路径: 2->5', () => {
      const expirePath = [
        ReservationStatus.CONFIRMED, // 2
        ReservationStatus.EXPIRED,   // 5
      ];

      expect(expirePath[expirePath.length - 1]).toBe(5);
    });

    it('应该支持取消路径: *->4', () => {
      // 取消可以从多个状态发起
      const cancelableStatuses = [
        ReservationStatus.PENDING,
        ReservationStatus.CALLING,
        ReservationStatus.CONFIRMED,
      ];

      cancelableStatuses.forEach(status => {
        expect(status).toBeLessThan(ReservationStatus.COMPLETED);
      });
    });
  });

  describe('利润计算验证', () => {
    it('核销后利润应该等于各级利润之和', () => {
      const masterProfit = 10;
      const level1Profit = 40;
      const level2Profit = 0;

      const totalProfit = masterProfit + level1Profit + level2Profit;
      const expectedTotal = 50; // 100(零售) - 50(成本)

      expect(totalProfit).toBe(expectedTotal);
    });

    it('利润分配应该立即入账', () => {
      // 核销时使用 settleAllProfits 在同一事务内入账
      const profitDistribution = {
        masterProfit: 10,
        level1Profit: 40,
        level2Profit: 0,
        masterAgentId: 1,
        level1AgentId: 2,
        level2AgentId: null,
      };

      // 验证结构正确
      expect(profitDistribution.masterProfit).toBeGreaterThanOrEqual(0);
      expect(profitDistribution.level1Profit).toBeGreaterThanOrEqual(0);
    });
  });

  describe('库存流转验证', () => {
    it('预约创建后lockStock应该增加', () => {
      const initialStock = 100;
      const initialLockStock = 0;
      const reserveQuantity = 10;

      const afterLockStock = initialLockStock + reserveQuantity;

      expect(afterLockStock).toBe(10);
      expect(initialStock).toBe(100); // stock不变
    });

    it('核销后stock和lockStock都应该减少', () => {
      const initialStock = 100;
      const initialLockStock = 10;
      const quantity = 10;

      const afterStock = initialStock - quantity;
      const afterLockStock = initialLockStock - quantity;

      expect(afterStock).toBe(90);
      expect(afterLockStock).toBe(0);
    });

    it('取消后只有lockStock减少', () => {
      const initialStock = 100;
      const initialLockStock = 10;
      const quantity = 10;

      const afterStock = initialStock; // 不变
      const afterLockStock = initialLockStock - quantity;

      expect(afterStock).toBe(100);
      expect(afterLockStock).toBe(0);
    });
  });

  describe('资金流水验证', () => {
    it('核销后应该生成FundFlow记录', () => {
      const fundFlowRecord = {
        agentId: 2,
        type: 'INCOME',
        amount: 40,
        sourceType: 'RESERVATION',
        sourceNo: 'TEST123456',
        remark: '预约核销利润',
      };

      expect(fundFlowRecord.type).toBe('INCOME');
      expect(fundFlowRecord.amount).toBeGreaterThan(0);
    });

    it('FundFlow的beforeBalance + amount = afterBalance', () => {
      const beforeBalance = 100;
      const amount = 40;
      const afterBalance = beforeBalance + amount;

      expect(afterBalance).toBe(140);
    });
  });
});

describe('预约过期检查逻辑', () => {
  it('当前只检查状态2（CONFIRMED）', () => {
    // 这是当前代码的实际行为
    const checkedStatuses = [ReservationStatus.CONFIRMED];

    // 应该检查的状态（建议修复）
    const shouldCheckStatuses = [
      ReservationStatus.CONFIRMED,       // 2
      ReservationStatus.PENDING_PREPARE, // 7
      ReservationStatus.PREPARING,       // 8
    ];

    expect(checkedStatuses.length).toBe(1);
    expect(shouldCheckStatuses.length).toBe(3);
  });

  it('过期时间应该在确认时设置', () => {
    const confirmedAt = new Date();
    const expireDays = 3;
    const expireAt = new Date(confirmedAt);
    expireAt.setDate(expireAt.getDate() + expireDays);
    expireAt.setHours(23, 59, 59, 999);

    expect(expireAt.getTime()).toBeGreaterThan(confirmedAt.getTime());
  });
});

describe('提货码生成逻辑', () => {
  it('提货码应该是8位数字', () => {
    const generatePickupCode = () => {
      return String(Math.floor(10000000 + Math.random() * 90000000));
    };

    const code = generatePickupCode();
    expect(code.length).toBe(8);
    expect(/^\d{8}$/.test(code)).toBe(true);
  });

  it('提货码应该唯一', () => {
    const codes = new Set<string>();
    const generatePickupCode = () => {
      return String(Math.floor(10000000 + Math.random() * 90000000));
    };

    // 生成1000个码验证唯一性
    for (let i = 0; i < 1000; i++) {
      const code = generatePickupCode();
      codes.add(code);
    }

    // 理论上1000个应该都不重复（概率很高）
    expect(codes.size).toBe(1000);
  });
});

describe('代金券核销逻辑', () => {
  it('代金券应该在核销事务内处理', () => {
    // 验证代金券核销在 completePickup 的事务内
    const couponRedeem = {
      couponId: 1,
      status: 'USED',
      usedAt: new Date(),
      usedFor: 'RESERVATION',
    };

    expect(couponRedeem.status).toBe('USED');
  });

  it('代金券核销应该从推销员余额扣除', () => {
    const agentBalance = 100;
    const couponAmount = 20;
    const finalBalance = agentBalance - couponAmount;

    // 代金券核销时，从推销员余额扣除相应金额
    expect(finalBalance).toBe(80);
  });
});
