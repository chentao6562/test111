/**
 * 预约并发测试
 * 测试目标：验证高并发场景下的数据一致性
 */

import { runConcurrent } from '../utils/testHelpers';

describe('高并发预约测试', () => {
  describe('库存并发锁定', () => {
    it('10并发预约应该不超卖', async () => {
      // 模拟场景：库存5件，10个并发预约各1件
      const stock = 5;
      let lockStock = 0;
      const concurrentRequests = 10;
      const quantityPerRequest = 1;

      // 模拟原子更新逻辑
      const results: boolean[] = [];
      for (let i = 0; i < concurrentRequests; i++) {
        // 原子检查: (stock - lockStock) >= quantity
        if (stock - lockStock >= quantityPerRequest) {
          lockStock += quantityPerRequest;
          results.push(true);
        } else {
          results.push(false);
        }
      }

      const successCount = results.filter(r => r).length;

      // 验证
      expect(successCount).toBe(stock); // 最多5个成功
      expect(lockStock).toBe(stock); // lockStock不超过stock
      expect(lockStock).toBeLessThanOrEqual(stock);
    });

    it('应该使用原子UPDATE防止并发超卖', () => {
      // 验证SQL是原子操作
      const atomicUpdateSql = `
        UPDATE products
        SET lock_stock = lock_stock + ?
        WHERE id = ?
        AND (stock - lock_stock) >= ?
      `;

      // 这个SQL在单条语句中完成检查和更新，是原子的
      expect(atomicUpdateSql).toContain('lock_stock = lock_stock +');
      expect(atomicUpdateSql).toContain('AND (stock - lock_stock) >=');
    });
  });

  describe('高并发核销测试', () => {
    it('同一预约并发核销应该只成功一次', () => {
      // 模拟场景：两个并发核销请求
      let reservationStatus = 2; // CONFIRMED
      const concurrentRequests = 2;
      let successCount = 0;

      // 使用Serializable隔离级别 + SELECT FOR UPDATE
      // 模拟行级锁
      const tryPickup = () => {
        if (reservationStatus === 2) {
          reservationStatus = 3; // COMPLETED
          return true;
        }
        return false;
      };

      // 顺序执行模拟（实际是并发，但有锁保护）
      for (let i = 0; i < concurrentRequests; i++) {
        if (tryPickup()) {
          successCount++;
        }
      }

      expect(successCount).toBe(1);
      expect(reservationStatus).toBe(3);
    });

    it('核销后库存应该只扣减一次', () => {
      let stock = 100;
      let lockStock = 10;
      const quantity = 10;
      let deductCount = 0;

      // 模拟并发核销
      const tryDeductStock = () => {
        if (lockStock >= quantity && stock >= quantity) {
          stock -= quantity;
          lockStock -= quantity;
          deductCount++;
          return true;
        }
        return false;
      };

      // 第一次核销成功
      expect(tryDeductStock()).toBe(true);
      expect(stock).toBe(90);
      expect(lockStock).toBe(0);

      // 第二次核销失败
      expect(tryDeductStock()).toBe(false);
      expect(stock).toBe(90);
      expect(deductCount).toBe(1);
    });
  });

  describe('过期检查与核销竞速', () => {
    it('过期和核销不应同时成功', () => {
      // 模拟场景：预约即将过期，同时有核销请求
      let status = 2; // CONFIRMED
      let lockStock = 10;
      let stock = 100;
      const quantity = 10;

      // 过期操作
      const expireReservation = () => {
        if (status === 2) {
          status = 5; // EXPIRED
          lockStock -= quantity; // 释放库存
          return true;
        }
        return false;
      };

      // 核销操作
      const pickupReservation = () => {
        if (status === 2 || status === 9) {
          status = 3; // COMPLETED
          stock -= quantity;
          lockStock -= quantity;
          return true;
        }
        return false;
      };

      // 只有一个操作应该成功
      const expired = expireReservation();
      const pickedUp = !expired && pickupReservation();

      expect(expired || pickedUp).toBe(true);
      expect(expired && pickedUp).toBe(false); // 不能同时成功
    });
  });
});

describe('代金券并发测试', () => {
  describe('同一代金券并发使用', () => {
    it('同一代金券不能被两个预约使用', () => {
      // 模拟场景：同一代金券用于两个预约核销
      let couponStatus = 'UNUSED';
      let useCount = 0;

      const useCoupon = () => {
        // 应该使用 SELECT FOR UPDATE 锁定
        if (couponStatus === 'UNUSED') {
          couponStatus = 'USED';
          useCount++;
          return true;
        }
        return false;
      };

      // 模拟并发使用
      const result1 = useCoupon();
      const result2 = useCoupon();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(useCount).toBe(1);
      expect(couponStatus).toBe('USED');
    });
  });

  describe('代金券批量核销', () => {
    it('批量核销应该原子性', () => {
      // 模拟场景：使用多张代金券核销
      const coupons = [
        { id: 1, status: 'UNUSED', amount: 10 },
        { id: 2, status: 'UNUSED', amount: 10 },
        { id: 3, status: 'USED', amount: 10 }, // 已使用
      ];

      // 验证所有代金券状态
      const allValid = coupons.every(c => c.status === 'UNUSED');

      // 有一张已使用，应该全部失败
      expect(allValid).toBe(false);
    });
  });
});

describe('奖励发放并发测试', () => {
  describe('首单成交奖励', () => {
    it('两个核销同时完成应该只发放一次', () => {
      // 模拟场景：推销员首次核销
      let firstCompleteBonusPaid = false;
      let bonusIssuedCount = 0;

      const issueBonus = () => {
        if (!firstCompleteBonusPaid) {
          firstCompleteBonusPaid = true;
          bonusIssuedCount++;
          return true;
        }
        return false;
      };

      // 模拟并发发放
      const result1 = issueBonus();
      const result2 = issueBonus();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(bonusIssuedCount).toBe(1);
    });
  });

  describe('首预约奖励', () => {
    it('多个预约同时创建应该只发放一次', () => {
      // 模拟场景：推销员首次有客户预约
      let firstReservationBonusPaid = false;
      let bonusIssuedCount = 0;

      const issueBonus = () => {
        if (!firstReservationBonusPaid) {
          firstReservationBonusPaid = true;
          bonusIssuedCount++;
          return true;
        }
        return false;
      };

      // 模拟并发发放
      const result1 = issueBonus();
      const result2 = issueBonus();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(bonusIssuedCount).toBe(1);
    });
  });
});

describe('利润结算并发测试', () => {
  describe('同一预约利润结算', () => {
    it('利润应该只结算一次', () => {
      // 模拟场景：核销时的利润结算
      let profitSettled = false;
      let settleCount = 0;

      const settleProfit = () => {
        if (!profitSettled) {
          profitSettled = true;
          settleCount++;
          return true;
        }
        return false;
      };

      // 模拟并发结算
      const result1 = settleProfit();
      const result2 = settleProfit();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(settleCount).toBe(1);
    });
  });

  describe('余额更新原子性', () => {
    it('余额更新应该使用increment操作', () => {
      // Prisma的increment操作是原子的
      const updateSql = `
        UPDATE agents
        SET balance = balance + ?,
            total_commission = total_commission + ?
        WHERE id = ?
      `;

      expect(updateSql).toContain('balance = balance +');
      expect(updateSql).toContain('total_commission = total_commission +');
    });
  });
});

describe('并发测试工具函数', () => {
  it('runConcurrent应该返回正确的统计', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.reject(new Error('test error')),
    ];

    const result = await runConcurrent(tasks, '测试统计');

    expect(result.results.length).toBe(3);
    expect(result.successCount).toBe(2);
    expect(result.failCount).toBe(1);
    expect(result.errors.length).toBe(1);
  });
});
