/**
 * 团队服务
 * 处理代理商团队统计和成员管理
 */
import prisma from '../../utils/prisma';

/**
 * 获取等级标签
 * 【2026-01-17】移除LEVEL3，系统只保留两级推销员
 */
export function getLevelLabel(type: string): string {
  const labels: Record<string, string> = {
    LEVEL1: 'LV.2', // 一级推销员 = 金牌
    LEVEL2: 'LV.1', // 二级推销员 = 银牌
    WHOLESALE: 'LV.0', // 普通用户
  };
  return labels[type] || 'LV.0';
}

/**
 * 获取团队统计数据
 * 【2026-01-19修复】返回前端期望的所有字段
 */
export async function getTeamStats(agentId: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error('代理商不存在');
  }

  // 获取直属下级数量
  const directCount = await prisma.agent.count({
    where: { parentId: agentId },
  });

  // 获取间接下级数量（下级的下级）
  const directMembers = await prisma.agent.findMany({
    where: { parentId: agentId },
    select: { id: true },
  });
  const directMemberIds = directMembers.map(m => m.id);

  let indirectCount = 0;
  if (directMemberIds.length > 0) {
    indirectCount = await prisma.agent.count({
      where: { parentId: { in: directMemberIds } },
    });
  }

  // 【2026-01-22 BUG修复】本月时间范围，添加monthEnd确保范围完整
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  // 本月新增成员数（限定在本月范围内）
  const monthlyNewCount = await prisma.agent.count({
    where: {
      parentId: agentId,
      createdAt: { gte: monthStart, lt: monthEnd },
    },
  });

  // 本月团队总业绩（下级预约金额，限定在本月范围内）
  let totalTeamPerformance = 0;
  if (directMemberIds.length > 0) {
    // 【2026-01-17修复】使用reservation替代order，适配预约模式
    // 【2026-01-22修复】添加completedAt上限，确保只统计本月数据
    const teamReservations = await prisma.reservation.aggregate({
      where: {
        salespersonId: { in: directMemberIds },
        completedAt: { gte: monthStart, lt: monthEnd },
        status: 3, // 已完成的预约
      },
      _sum: { totalAmount: true },
    });
    totalTeamPerformance = Number(teamReservations._sum.totalAmount || 0);
  }

  // 个人本月业绩（限定在本月范围内）
  // 【2026-01-17修复】使用reservation替代order，适配预约模式
  // 【2026-01-22修复】添加completedAt上限，确保只统计本月数据
  const personalReservations = await prisma.reservation.aggregate({
    where: {
      salespersonId: agentId,
      completedAt: { gte: monthStart, lt: monthEnd },
      status: 3, // 已完成的预约
    },
    _sum: { totalAmount: true },
  });
  const personalContribution = Number(personalReservations._sum.totalAmount || 0);

  return {
    totalTeamPerformance,
    personalContribution,
    teamMemberCount: directCount, // 兼容旧字段
    // 【2026-01-19新增】前端期望的字段
    directCount,
    indirectCount,
    monthlyNewCount,
  };
}

/**
 * 获取团队成员列表
 * 【2026-01-19修复】支持按关系类型筛选（direct/indirect）
 */
export async function getTeamMembers(params: {
  agentId: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  level?: string; // all, LEVEL1, LEVEL2（兼容旧参数）
  relation?: string; // all, direct, indirect（新参数）
}) {
  const { agentId, page = 1, pageSize = 20, keyword, level, relation } = params;

  let where: any = {};

  // 【2026-01-19修复】按关系类型筛选
  if (relation === 'indirect') {
    // 间接成员：下级的下级
    const directMembers = await prisma.agent.findMany({
      where: { parentId: agentId },
      select: { id: true },
    });
    const directMemberIds = directMembers.map(m => m.id);
    if (directMemberIds.length > 0) {
      where.parentId = { in: directMemberIds };
    } else {
      // 没有直属下级，间接下级肯定也没有
      where.id = -1; // 返回空结果
    }
  } else {
    // direct 或 all：直属成员
    where.parentId = agentId;
  }

  // 关键词搜索
  if (keyword && keyword.trim()) {
    where.OR = [
      { name: { contains: keyword.trim() } },
      { phone: { contains: keyword.trim() } },
    ];
  }

  // 等级筛选（兼容旧参数，如LEVEL1/LEVEL2）
  if (level && level !== 'all' && level !== 'DIRECT' && level !== 'INDIRECT') {
    where.type = level;
  }

  const total = await prisma.agent.count({ where });

  const members = await prisma.agent.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 查询每个成员的本月业绩
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const membersWithPerformance = await Promise.all(
    members.map(async (member) => {
      // 【2026-01-17修复】使用reservation替代order，适配预约模式
      const performance = await prisma.reservation.aggregate({
        where: {
          salespersonId: member.id,
          createdAt: { gte: monthStart },
          status: 3, // 已完成的预约
        },
        _sum: { totalAmount: true },
      });

      return {
        id: member.id,
        name: member.name,
        phone: member.phone,
        level: getLevelLabel(member.type),
        levelType: member.type,
        status: member.status,
        joinDate: member.createdAt,
        monthlyPerformance: Number(performance._sum.totalAmount || 0),
      };
    })
  );

  return {
    list: membersWithPerformance,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
