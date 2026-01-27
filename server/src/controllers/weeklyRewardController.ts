/**
 * 周期奖励控制器
 * 【2026-01-20】
 * 【2026-01-22】新增新人任务状态API
 */

import { Request, Response } from 'express';
import * as weeklyRewardService from '../services/campaign2026/weeklyRewardService';
import { manualProcessWeeklyRewards } from '../tasks/weeklyRewardTask';
import prisma from '../utils/prisma';

// ==================== 推销员端 API ====================

/**
 * 获取本周进度
 * GET /api/weekly/progress
 */
export async function getWeeklyProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      res.status(401).json({ code: 401, message: '未登录' });
      return;
    }

    const progress = await weeklyRewardService.getAgentWeeklyProgress(agentId);

    res.json({
      code: 0,
      data: progress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

// ==================== 管理后台 API ====================

/**
 * 获取周奖励统计
 * GET /api/admin/weekly/stats
 */
export async function getWeeklyStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { weekStart } = req.query;

    let weekStartDate: Date | undefined;
    if (weekStart) {
      weekStartDate = new Date(weekStart as string);
      if (isNaN(weekStartDate.getTime())) {
        res.status(400).json({ code: 400, message: '无效的日期格式' });
        return;
      }
    }

    const stats = await weeklyRewardService.getWeeklyRewardStats(weekStartDate);

    res.json({
      code: 0,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 获取推销员周统计列表
 * GET /api/admin/weekly/agents
 */
export async function getAgentWeeklyListHandler(req: Request, res: Response): Promise<void> {
  try {
    const { weekStart, page, pageSize } = req.query;

    let weekStartDate: Date | undefined;
    if (weekStart) {
      weekStartDate = new Date(weekStart as string);
      if (isNaN(weekStartDate.getTime())) {
        res.status(400).json({ code: 400, message: '无效的日期格式' });
        return;
      }
    }

    const result = await weeklyRewardService.getAgentWeeklyStatsList({
      weekStart: weekStartDate,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json({
      code: 0,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 获取推销员周详情
 * GET /api/admin/weekly/agents/:agentId
 */
export async function getAgentWeeklyDetailHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = Number(req.params.agentId);
    if (!agentId) {
      res.status(400).json({ code: 400, message: '无效的推销员ID' });
      return;
    }

    const progress = await weeklyRewardService.getAgentWeeklyProgress(agentId);

    res.json({
      code: 0,
      data: progress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 手动触发周奖励发放
 * POST /api/admin/weekly/process
 */
export async function processWeeklyRewardsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { weekStart } = req.body;

    const result = await manualProcessWeeklyRewards(weekStart);

    res.json({
      code: 0,
      message: `处理完成，成功 ${result.processedAgents} 个，失败 ${result.errors.length} 个`,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '处理失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 获取新人任务状态
 * GET /api/weekly/newbie-tasks
 * 【2026-01-22 新增】用于前端显示新人任务完成情况
 */
export async function getNewbieTasksHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      res.status(401).json({ code: 401, message: '未登录' });
      return;
    }

    // 获取推销员信息
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        createdAt: true,
        type: true,
      },
    });

    if (!agent) {
      res.status(404).json({ code: 404, message: '推销员不存在' });
      return;
    }

    // 获取活动追踪记录
    const activity = await prisma.agentActivity.findUnique({
      where: { agentId },
    });

    // 判断是否是新用户（7天内注册）
    const isNewUser = new Date().getTime() - new Date(agent.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

    // 获取代金券统计
    const couponStats = await prisma.coupon.aggregate({
      where: {
        agentId,
        status: 'UNUSED',
      },
      _count: true,
      _sum: { amount: true },
    });

    // 构建新人任务状态
    const tasks = {
      // 注册奖励（已完成）
      register: {
        completed: true,
        amount: 5,
        paidAt: agent.createdAt,
      },
      // 首发圈奖励
      firstShare: {
        completed: activity?.firstShareBonusPaid || false,
        amount: 5,
        paidAt: activity?.firstShareAt || null,
      },
      // 首预约奖励
      firstReservation: {
        completed: activity?.firstReservationBonusPaid || false,
        amount: 10,
        paidAt: activity?.firstReservationAt || null,
      },
      // 首单成交奖励
      firstComplete: {
        completed: activity?.firstCompleteBonusPaid || false,
        amount: 20,
        paidAt: activity?.firstCompleteAt || null,
      },
    };

    // 计算完成进度
    const completedCount = Object.values(tasks).filter(t => t.completed).length;
    const totalCount = 4;
    const totalAmount = 5 + 5 + 10 + 20; // 40元

    // 计算已获得金额
    const earnedAmount = Object.values(tasks)
      .filter(t => t.completed)
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      code: 0,
      data: {
        isNewUser,
        tasks,
        progress: {
          completed: completedCount,
          total: totalCount,
          percent: Math.round((completedCount / totalCount) * 100),
        },
        amount: {
          earned: earnedAmount,
          total: totalAmount,
          remaining: totalAmount - earnedAmount,
        },
        couponStats: {
          unused: couponStats._count || 0,
          totalAmount: Number(couponStats._sum.amount || 0),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

export default {
  getWeeklyProgressHandler,
  getWeeklyStatsHandler,
  getAgentWeeklyListHandler,
  getAgentWeeklyDetailHandler,
  processWeeklyRewardsHandler,
  getNewbieTasksHandler,
};
