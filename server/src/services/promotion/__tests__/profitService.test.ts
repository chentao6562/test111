/**
 * 利润计算服务单元测试
 * 测试目标：验证利润分配算法的正确性
 */

import { calculateItemProfit } from '../profitService';
import { profitTestCases, boundaryTestCases, giftCostTestCases } from '../../../__tests__/fixtures/testData';

describe('calculateItemProfit - 利润计算核心函数', () => {
  describe('正常场景测试', () => {
    profitTestCases.forEach((tc) => {
      it(`应该正确计算: ${tc.name}`, () => {
        const result = calculateItemProfit(
          tc.input.orderSource,
          tc.input.costPrice,
          tc.input.supplyPrice,
          tc.input.level1Price,
          tc.input.retailPrice,
          tc.input.quantity
        );

        expect(result.masterProfit).toBeCloseTo(tc.expected.masterProfit, 2);
        expect(result.level1Profit).toBeCloseTo(tc.expected.level1Profit, 2);
        expect(result.level2Profit).toBeCloseTo(tc.expected.level2Profit, 2);
      });
    });
  });

  describe('边界场景测试', () => {
    it('数量为0时所有利润为0', () => {
      const result = calculateItemProfit(1, 50, 60, null, 100, 0);
      expect(result.masterProfit).toBe(0);
      expect(result.level1Profit).toBe(0);
      expect(result.level2Profit).toBe(0);
    });

    it('负利润场景（成本大于零售价）', () => {
      // 这种情况理论上不应该发生，但代码应该处理
      const result = calculateItemProfit(0, 120, 110, null, 100, 1);
      // 当前实现会产生负数
      expect(result.masterProfit).toBeLessThan(0);
    });

    it('所有价格相同时利润为0', () => {
      const result = calculateItemProfit(0, 100, 100, null, 100, 1);
      expect(result.masterProfit).toBe(0);
      expect(result.level1Profit).toBe(0);
      expect(result.level2Profit).toBe(0);
    });
  });

  describe('orderSource=0 总代理直销', () => {
    it('总代理获得全部利润', () => {
      const result = calculateItemProfit(0, 50, 60, null, 100, 1);
      expect(result.masterProfit).toBe(50); // 100 - 50
      expect(result.level1Profit).toBe(0);
      expect(result.level2Profit).toBe(0);
    });

    it('supplyPrice和level1Price不影响结果', () => {
      const result1 = calculateItemProfit(0, 50, 60, null, 100, 1);
      const result2 = calculateItemProfit(0, 50, 80, 90, 100, 1);
      expect(result1.masterProfit).toBe(result2.masterProfit);
    });
  });

  describe('orderSource=1 一级推销员销售', () => {
    it('总代理赚供货差价，一级赚零售差价', () => {
      const result = calculateItemProfit(1, 50, 60, null, 100, 1);
      expect(result.masterProfit).toBe(10); // 60 - 50
      expect(result.level1Profit).toBe(40); // 100 - 60
      expect(result.level2Profit).toBe(0);
    });

    it('利润之和等于总利润', () => {
      const result = calculateItemProfit(1, 50, 60, null, 100, 1);
      const totalProfit = result.masterProfit + result.level1Profit + result.level2Profit;
      expect(totalProfit).toBe(50); // 100 - 50
    });

    it('level1Price不影响一级销售结果', () => {
      const result1 = calculateItemProfit(1, 50, 60, null, 100, 1);
      const result2 = calculateItemProfit(1, 50, 60, 70, 100, 1);
      expect(result1.level1Profit).toBe(result2.level1Profit);
    });
  });

  describe('orderSource=2 二级推销员销售', () => {
    it('有subPrice时三级分润', () => {
      const result = calculateItemProfit(2, 50, 60, 70, 90, 1);
      expect(result.masterProfit).toBe(10); // 60 - 50
      expect(result.level1Profit).toBe(10); // 70 - 60
      expect(result.level2Profit).toBe(20); // 90 - 70
    });

    it('无subPrice时回退到supplyPrice', () => {
      const result = calculateItemProfit(2, 50, 60, null, 90, 1);
      expect(result.masterProfit).toBe(10); // 60 - 50
      expect(result.level1Profit).toBe(0); // actualLevel1Price=60, 60-60=0
      expect(result.level2Profit).toBe(30); // 90 - 60
    });

    it('利润之和等于总利润', () => {
      const result = calculateItemProfit(2, 50, 60, 70, 90, 1);
      const totalProfit = result.masterProfit + result.level1Profit + result.level2Profit;
      expect(totalProfit).toBe(40); // 90 - 50
    });
  });

  describe('精度测试', () => {
    it('小数精度保留两位', () => {
      const result = calculateItemProfit(1, 33.333, 44.444, null, 55.555, 1);
      // 11.111 应该被floor到 11.11
      expect(result.masterProfit).toBe(Math.floor(11.111 * 100) / 100);
      expect(result.level1Profit).toBe(Math.floor(11.111 * 100) / 100);
    });

    it('多数量累计不丢失精度', () => {
      const result = calculateItemProfit(1, 50, 60, null, 100, 1000);
      expect(result.masterProfit).toBe(10000); // 10 * 1000
      expect(result.level1Profit).toBe(40000); // 40 * 1000
    });

    it('大金额计算正确', () => {
      const result = calculateItemProfit(0, 10000, 12000, null, 20000, 100);
      expect(result.masterProfit).toBe(1000000); // (20000-10000) * 100
    });
  });

  describe('异常输入处理', () => {
    it('价格为0时不报错', () => {
      expect(() => calculateItemProfit(0, 0, 0, null, 0, 1)).not.toThrow();
    });

    it('负价格不报错（由业务层验证）', () => {
      expect(() => calculateItemProfit(0, -10, 0, null, 100, 1)).not.toThrow();
    });
  });
});

describe('赠品成本扣除逻辑', () => {
  giftCostTestCases.forEach((tc) => {
    it(`${tc.name}`, () => {
      const finalProfit = Math.max(0, tc.profit - tc.giftCost);
      expect(finalProfit).toBe(tc.expectedFinalProfit);
    });
  });

  it('赠品成本截断应该记录日志（建议）', () => {
    const profit = 15;
    const giftCost = 25;
    const truncated = profit - giftCost < 0;
    expect(truncated).toBe(true);
    // 此处只验证逻辑，实际日志记录需要在业务代码中实现
  });
});

describe('利润公式验证', () => {
  it('总利润 = 零售价 - 成本价', () => {
    const costPrice = 50;
    const retailPrice = 100;
    const expectedTotalProfit = retailPrice - costPrice;

    // orderSource=0
    const r0 = calculateItemProfit(0, costPrice, 60, null, retailPrice, 1);
    expect(r0.masterProfit + r0.level1Profit + r0.level2Profit).toBe(expectedTotalProfit);

    // orderSource=1
    const r1 = calculateItemProfit(1, costPrice, 60, null, retailPrice, 1);
    expect(r1.masterProfit + r1.level1Profit + r1.level2Profit).toBe(expectedTotalProfit);

    // orderSource=2
    const r2 = calculateItemProfit(2, costPrice, 60, 70, retailPrice, 1);
    expect(r2.masterProfit + r2.level1Profit + r2.level2Profit).toBe(expectedTotalProfit);
  });

  it('多件商品总利润正确', () => {
    const quantity = 5;
    const result = calculateItemProfit(1, 50, 60, null, 100, quantity);
    const totalProfit = result.masterProfit + result.level1Profit + result.level2Profit;
    expect(totalProfit).toBe((100 - 50) * quantity);
  });
});

describe('秒杀商品利润处理（重要）', () => {
  it('snapshotCostPrice为null时应该使用0或特殊处理', () => {
    // 秒杀商品的 snapshotCostPrice = null
    // 当前实现会将 null 转为 0，导致利润全给总代理
    const costPrice = 0; // Number(null) = 0
    const result = calculateItemProfit(1, costPrice, 0, null, 99, 1);

    // 这是当前的实际行为（可能不是期望行为）
    // masterProfit = supplyPrice - costPrice = 0 - 0 = 0
    // level1Profit = retailPrice - supplyPrice = 99 - 0 = 99
    expect(result.masterProfit).toBe(0);
    expect(result.level1Profit).toBe(99);

    // TODO: 秒杀商品应该有专门的利润计算逻辑
    // 建议：秒杀商品不参与推销员分润，或者使用特殊的成本价
  });

  it('秒杀商品应该标记为特殊商品（建议改进）', () => {
    // 当前系统中秒杀商品通过 snapshotCostPrice=null 来标识
    // 这不够明确，建议添加 isFlashSale 字段
    const isFlashSale = (costPrice: number | null) => costPrice === null;
    expect(isFlashSale(null)).toBe(true);
    expect(isFlashSale(50)).toBe(false);
  });
});
