/**
 * 利润结算执行器单元测试
 */
import { executeSettlement, settleAllProfits, ProfitDistribution } from '../settlementExecutor';

// Mock Prisma事务客户端
const mockTx = {
  agent: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  fundFlow: {
    create: jest.fn(),
  },
};

describe('settlementExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeSettlement', () => {
    it('应该正确执行利润入账', async () => {
      // 准备测试数据
      mockTx.agent.findUnique.mockResolvedValue({ balance: 100 });
      mockTx.agent.update.mockResolvedValue({});
      mockTx.fundFlow.create.mockResolvedValue({});

      // 执行
      await executeSettlement(1, 50, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      // 验证
      expect(mockTx.agent.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { balance: true },
      });

      expect(mockTx.agent.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          balance: { increment: 50 },
          totalCommission: { increment: 50 },
        },
      });

      expect(mockTx.fundFlow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentId: 1,
          type: 'PROFIT',
          amount: 50,
          beforeBalance: 100,
          afterBalance: 150,
        }),
      });
    });

    it('金额为0时应该跳过入账', async () => {
      await executeSettlement(1, 0, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      expect(mockTx.agent.findUnique).not.toHaveBeenCalled();
      expect(mockTx.agent.update).not.toHaveBeenCalled();
    });

    it('金额为负数时应该跳过入账', async () => {
      await executeSettlement(1, -50, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      expect(mockTx.agent.findUnique).not.toHaveBeenCalled();
    });

    it('金额超过100万应该抛出错误', async () => {
      mockTx.agent.findUnique.mockResolvedValue({ balance: 100 });

      await expect(
        executeSettlement(1, 1000001, 'RESERVATION', 100, 'R20260122001', mockTx as any)
      ).rejects.toThrow('结算金额超出限制');
    });

    it('金额为NaN时应该跳过入账', async () => {
      await executeSettlement(1, NaN, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      expect(mockTx.agent.update).not.toHaveBeenCalled();
    });

    it('代理商不存在时应该跳过入账', async () => {
      mockTx.agent.findUnique.mockResolvedValue(null);

      await executeSettlement(1, 50, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      expect(mockTx.agent.update).not.toHaveBeenCalled();
      expect(mockTx.fundFlow.create).not.toHaveBeenCalled();
    });

    it('应该正确处理订单类型的结算', async () => {
      mockTx.agent.findUnique.mockResolvedValue({ balance: 200 });
      mockTx.agent.update.mockResolvedValue({});
      mockTx.fundFlow.create.mockResolvedValue({});

      await executeSettlement(2, 100, 'ORDER', 200, 'O20260122001', mockTx as any);

      expect(mockTx.fundFlow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          relatedType: 'ORDER',
          remark: expect.stringContaining('订单号'),
        }),
      });
    });
  });

  describe('settleAllProfits', () => {
    it('应该批量结算所有代理商利润', async () => {
      mockTx.agent.findUnique.mockResolvedValue({ balance: 0 });
      mockTx.agent.update.mockResolvedValue({});
      mockTx.fundFlow.create.mockResolvedValue({});

      const distribution: ProfitDistribution = {
        masterProfit: 100,
        level1Profit: 50,
        level2Profit: 20,
        masterAgentId: 1,
        level1AgentId: 2,
        level2AgentId: 3,
      };

      await settleAllProfits(distribution, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      // 验证三个代理商都被结算
      expect(mockTx.agent.findUnique).toHaveBeenCalledTimes(3);
      expect(mockTx.agent.update).toHaveBeenCalledTimes(3);
      expect(mockTx.fundFlow.create).toHaveBeenCalledTimes(3);
    });

    it('应该跳过利润为0的代理商', async () => {
      mockTx.agent.findUnique.mockResolvedValue({ balance: 0 });
      mockTx.agent.update.mockResolvedValue({});
      mockTx.fundFlow.create.mockResolvedValue({});

      const distribution: ProfitDistribution = {
        masterProfit: 100,
        level1Profit: 0,  // 一级利润为0
        level2Profit: 20,
        masterAgentId: 1,
        level1AgentId: 2,
        level2AgentId: 3,
      };

      await settleAllProfits(distribution, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      // 只结算总代和二级
      expect(mockTx.agent.update).toHaveBeenCalledTimes(2);
    });

    it('应该跳过agentId为null的代理商', async () => {
      mockTx.agent.findUnique.mockResolvedValue({ balance: 0 });
      mockTx.agent.update.mockResolvedValue({});
      mockTx.fundFlow.create.mockResolvedValue({});

      const distribution: ProfitDistribution = {
        masterProfit: 100,
        level1Profit: 50,
        level2Profit: 20,
        masterAgentId: 1,
        level1AgentId: null,  // 无一级
        level2AgentId: null,  // 无二级
      };

      await settleAllProfits(distribution, 'RESERVATION', 100, 'R20260122001', mockTx as any);

      // 只结算总代
      expect(mockTx.agent.update).toHaveBeenCalledTimes(1);
    });
  });
});
