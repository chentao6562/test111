import prisma from '../utils/prisma';
import { hashPassword } from '../utils/password';
import { sanitizeName } from '../utils/sanitize';
import { Agent } from '@prisma/client';

/**
 * 生成6位邀请码
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成唯一的邀请码
 */
async function generateUniqueInviteCode(): Promise<string> {
  let code: string;
  let exists: boolean;

  do {
    code = generateInviteCode();
    const existing = await prisma.agent.findUnique({
      where: { inviteCode: code },
    });
    exists = !!existing;
  } while (exists);

  return code;
}

/**
 * 根据手机号查找代理商
 */
export async function findByPhone(phone: string): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { phone },
  });
}

/**
 * 根据ID查找代理商
 */
export async function findById(id: number): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { id },
  });
}

/**
 * 根据邀请码查找代理商
 */
export async function findByInviteCode(
  inviteCode: string
): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { inviteCode },
  });
}

/**
 * 【2026-01-22 代码优化】根据上级推销员类型推断下级类型
 * 提取公共逻辑，避免create()和update()中重复实现
 * @param parent 上级推销员信息
 * @returns 推断的推销员类型
 */
export function inferAgentTypeFromParent(parent: {
  isMaster?: boolean;
  type: string;
}): string {
  if (parent.isMaster) {
    // 总代理发展的是一级推销员
    return 'LEVEL1';
  } else if (parent.type === 'LEVEL1') {
    // 一级推销员发展的是二级推销员
    return 'LEVEL2';
  } else if (parent.type === 'LEVEL2') {
    // 二级推销员不能发展下级，注册为普通用户
    return 'WHOLESALE';
  }
  // 默认普通用户
  return 'WHOLESALE';
}

/**
 * 创建新代理商
 */
export async function create(data: {
  phone: string;
  password?: string;
  name?: string;
  parentId?: number;
  type?: string;
}): Promise<Agent> {
  const inviteCode = await generateUniqueInviteCode();

  // 如果有密码，进行加密
  let hashedPassword: string | undefined;
  if (data.password) {
    hashedPassword = await hashPassword(data.password);
  }

  // 确定代理商类型
  // 【2026-01-17】移除LEVEL3，系统只保留两级推销员，二级不能发展下级
  // 【2026-01-19修复】总代理(isMaster=true)发展的是一级推销员，不是二级
  // 【2026-01-22修复】添加上级状态检查和层级深度限制
  let agentType = data.type || 'WHOLESALE';
  if (data.parentId) {
    // 如果有上级，根据上级类型确定
    const parent = await findById(data.parentId);
    if (parent) {
      // 【2026-01-22 BUG修复】检查上级状态，禁用的推销员不能作为上级
      if (parent.status !== 'ACTIVE') {
        throw new Error('上级推销员已被禁用，无法建立推广关系');
      }

      // 【2026-01-22 BUG修复】检查层级深度，防止层级过深
      let depth = 0;
      let currentParent: Agent | null = parent;
      while (currentParent && currentParent.parentId && depth < 10) {
        currentParent = await findById(currentParent.parentId);
        depth++;
      }
      if (depth >= 3) {
        throw new Error('层级深度超限，无法建立推广关系');
      }

      // 【2026-01-22 代码优化】使用共享函数推断类型
      agentType = inferAgentTypeFromParent(parent);
    }
  }

  // 清理名称，防止XSS
  // 根据类型生成默认名称
  const typeNameMap: Record<string, string> = {
    'LEVEL1': '一级推销员',
    'LEVEL2': '二级推销员',
    'WHOLESALE': '普通用户'
  };
  const defaultName = `${typeNameMap[agentType] || '用户'}${data.phone.slice(-4)}`;
  const cleanName = data.name ? sanitizeName(data.name) : defaultName;

  return prisma.agent.create({
    data: {
      phone: data.phone,
      password: hashedPassword,
      name: cleanName,
      type: agentType,
      status: 'ACTIVE',
      parentId: data.parentId,
      inviteCode,
      commissionMethod: 'PRICE_DIFF', // 【2026-01-27】统一使用差价模式
    },
  });
}

/**
 * 更新代理商密码
 */
export async function updatePassword(
  id: number,
  password: string
): Promise<Agent> {
  const hashedPassword = await hashPassword(password);
  return prisma.agent.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

/**
 * 获取代理商信息（排除密码）
 */
export async function getAgentInfo(id: number) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      name: true,
      avatar: true,
      type: true,
      status: true,
      inviteCode: true,
      balance: true,
      totalCommission: true,
      commissionMethod: true,
      createdAt: true,
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  return agent;
}

/**
 * 获取代理商列表（分页/搜索/筛选）
 */
export async function findAll(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: string;
  status?: string;
  parentId?: number;
}) {
  const {
    page = 1,
    pageSize = 10,
    keyword,
    type,
    status,
    parentId,
  } = params;

  // 构建查询条件
  const where: any = {};

  // 关键词搜索（名称或手机号）
  if (keyword && keyword.trim()) {
    where.OR = [
      { name: { contains: keyword.trim() } },
      { phone: { contains: keyword.trim() } },
    ];
  }

  // 代理商类型筛选
  if (type && type.trim()) {
    where.type = type.trim();
  }

  // 状态筛选
  if (status && status.trim()) {
    where.status = status.trim();
  }

  // 上级代理商筛选
  if (parentId !== undefined && parentId !== null) {
    where.parentId = parentId;
  }

  // 查询总数
  const total = await prisma.agent.count({ where });

  // 查询列表
  const list = await prisma.agent.findMany({
    where,
    select: {
      id: true,
      phone: true,
      name: true,
      avatar: true,
      type: true,
      status: true,
      inviteCode: true,
      balance: true,
      totalCommission: true,
      commissionMethod: true,
      createdAt: true,
      updatedAt: true,
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      _count: {
        select: {
          children: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 【2026-01-20修复】统计每个推销员的本月预约订单数
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const agentIds = list.map(a => a.id);

  // 批量查询本月预约订单数（已完成的）
  const monthlyOrderCounts = await prisma.reservation.groupBy({
    by: ['salespersonId'],
    where: {
      salespersonId: { in: agentIds },
      status: 3, // 已完成
      completedAt: { gte: monthStart },
    },
    _count: { id: true },
  });

  // 转换为Map便于查询
  const orderCountMap = new Map<number, number>();
  for (const item of monthlyOrderCounts) {
    if (item.salespersonId) {
      orderCountMap.set(item.salespersonId, item._count.id);
    }
  }

  // 将订单数合并到列表中
  const listWithOrderCount = list.map(agent => ({
    ...agent,
    _count: {
      ...agent._count,
      orders: orderCountMap.get(agent.id) || 0,
    },
  }));

  return {
    list: listWithOrderCount,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取代理商详情（包含统计数据）
 * 【2026-01-20修复】改用Reservation表统计订单数据
 */
export async function getAgentDetail(id: number) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      name: true,
      avatar: true,
      type: true,
      status: true,
      inviteCode: true,
      balance: true,
      totalCommission: true,
      commissionMethod: true,
      createdAt: true,
      updatedAt: true,
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
        },
      },
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  if (!agent) {
    return null;
  }

  // 【2026-01-20修复】使用Reservation表统计订单数据
  // 获取已完成预约统计
  const orderStats = await prisma.reservation.aggregate({
    where: { salespersonId: id, status: 3 }, // 状态3=已完成
    _sum: { totalAmount: true },
    _count: true,
  });

  // 获取本月已完成预约统计
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrderStats = await prisma.reservation.aggregate({
    where: {
      salespersonId: id,
      status: 3,
      completedAt: { gte: monthStart },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  return {
    ...agent,
    _count: {
      ...agent._count,
      orders: orderStats._count,
    },
    orderStats: {
      totalAmount: orderStats._sum.totalAmount || 0,
      totalCount: orderStats._count,
      monthAmount: monthOrderStats._sum.totalAmount || 0,
      monthCount: monthOrderStats._count,
    },
  };
}

/**
 * 更新代理商信息
 * 【优化计划 Task 1.2】更新parentId时自动重新推断type
 */
export async function update(
  id: number,
  data: {
    name?: string;
    avatar?: string;
    type?: string;
    status?: string;
    parentId?: number | null;
    commissionMethod?: string;
  }
): Promise<Agent> {
  // 先获取当前代理商信息
  const currentAgent = await findById(id);
  if (!currentAgent) {
    throw new Error('代理商不存在');
  }

  const updateData: any = {};

  if (data.name !== undefined) {
    updateData.name = sanitizeName(data.name);
  }
  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar;
  }

  // 【Task 1.2】处理parentId变更，自动推断type
  if (data.parentId !== undefined && data.parentId !== currentAgent.parentId) {
    if (data.parentId === null) {
      // 【2026-01-22 BUG修复】移除上级，降级为批发商（无分润体系），同时清空isMaster标记
      updateData.parentId = null;
      updateData.type = 'WHOLESALE';
      updateData.commissionMethod = 'PRICE_DIFF'; // 【2026-01-27】统一使用差价模式
      // 如果不是总代理，确保isMaster为false（防止数据异常）
      if (!currentAgent.isMaster) {
        updateData.isMaster = false;
      }
      console.log(`代理商${id}移除上级，降级为WHOLESALE`);
    } else {
      // 设置新上级，验证并推断type
      const newParent = await findById(data.parentId);
      if (!newParent) {
        throw new Error('指定的上级代理商不存在');
      }
      if (newParent.status !== 'ACTIVE') {
        throw new Error('上级代理商已被禁用，无法设置');
      }
      // 【2026-01-17】验证新上级是否可以发展下级，只有一级可以发展二级
      if (newParent.type === 'LEVEL2') {
        throw new Error('二级推销员不能发展下级');
      }
      if (newParent.type === 'WHOLESALE') {
        throw new Error('普通用户不能发展下级');
      }

      // 【2026-01-22 代码优化】根据新上级类型推断当前代理商类型，使用共享函数
      const inferredType = inferAgentTypeFromParent(newParent);

      updateData.parentId = data.parentId;
      updateData.type = inferredType;

      // 【2026-01-27】统一使用差价模式，不再重置分润方式
      updateData.commissionMethod = 'PRICE_DIFF';

      console.log(`代理商${id}更换上级为${data.parentId}，类型从${currentAgent.type}变更为${inferredType}`);
    }
  } else if (data.parentId !== undefined) {
    // parentId相同，无需变更
    updateData.parentId = data.parentId;
  }

  // 如果显式指定了type且没有parentId变更，则使用指定的type
  if (data.type !== undefined && updateData.type === undefined) {
    updateData.type = data.type;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  // 【2026-01-27】分润方式统一使用PRICE_DIFF，移除RATE比例模式
  // 忽略传入的commissionMethod参数，始终使用PRICE_DIFF
  if (updateData.commissionMethod === undefined) {
    updateData.commissionMethod = 'PRICE_DIFF';
  }

  return prisma.agent.update({
    where: { id },
    data: updateData,
  });
}

/**
 * 更新代理商状态（启用/禁用）
 * 【2026-01-22 P1修复】禁用一级推销员时级联禁用其所有下级
 */
export async function updateStatus(
  id: number,
  status: string
): Promise<Agent> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    select: { type: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 【2026-01-22 P1修复】如果禁用一级推销员，同时禁用其所有二级下级
  if (status === 'INACTIVE' && agent.type === 'LEVEL1') {
    await prisma.$transaction(async (tx) => {
      // 禁用一级推销员
      await tx.agent.update({
        where: { id },
        data: { status },
      });

      // 级联禁用其所有二级下级
      const result = await tx.agent.updateMany({
        where: {
          parentId: id,
          type: 'LEVEL2',
        },
        data: { status: 'INACTIVE' },
      });

      if (result.count > 0) {
        console.log(`[AgentService] 禁用一级推销员${id}，级联禁用${result.count}个二级推销员`);
      }
    });

    // 重新获取更新后的推销员
    return prisma.agent.findUniqueOrThrow({ where: { id } });
  }

  return prisma.agent.update({
    where: { id },
    data: { status },
  });
}

/**
 * 获取代理商下级团队
 */
export async function getTeam(
  id: number,
  params: {
    page?: number;
    pageSize?: number;
    type?: string;
  }
) {
  const { page = 1, pageSize = 10, type } = params;

  const where: any = { parentId: id };
  if (type && type.trim()) {
    where.type = type.trim();
  }

  const total = await prisma.agent.count({ where });

  const list = await prisma.agent.findMany({
    where,
    select: {
      id: true,
      phone: true,
      name: true,
      avatar: true,
      type: true,
      status: true,
      inviteCode: true,
      balance: true,
      totalCommission: true,
      createdAt: true,
      _count: {
        select: {
          children: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 删除代理商（软删除，改为禁用）
 */
export async function remove(id: number): Promise<Agent> {
  // 检查是否有下级代理商
  const childrenCount = await prisma.agent.count({
    where: { parentId: id },
  });

  if (childrenCount > 0) {
    throw new Error('该代理商有下级成员，无法删除');
  }

  // 检查是否有未完成订单
  const pendingOrders = await prisma.order.count({
    where: {
      agentId: id,
      status: {
        notIn: ['completed', 'cancelled'],
      },
    },
  });

  if (pendingOrders > 0) {
    throw new Error('该代理商有未完成订单，无法删除');
  }

  // 软删除：改为禁用状态
  return prisma.agent.update({
    where: { id },
    data: { status: 'DISABLED' },
  });
}

/**
 * 统计代理商数据
 */
export async function getStatistics() {
  const [total, active, pending, disabled] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: 'ACTIVE' } }),
    prisma.agent.count({ where: { status: 'PENDING' } }),
    prisma.agent.count({ where: { status: 'DISABLED' } }),
  ]);

  const byType = await prisma.agent.groupBy({
    by: ['type'],
    _count: true,
  });

  return {
    total,
    active,
    pending,
    disabled,
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

export default {
  generateInviteCode,
  findByPhone,
  findById,
  findByInviteCode,
  create,
  updatePassword,
  getAgentInfo,
  findAll,
  getAgentDetail,
  update,
  updateStatus,
  getTeam,
  remove,
  getStatistics,
};
